/**
 * Builds the quiz model from Trivia Syntax text.
 *
 * One pass: header → meta, blocks → questions and rounds. Order stays as the
 * author wrote it. Nothing shuffles unless someone asks.
 */

import {
  DiagnosticCodes,
  syntaxWarning,
  type Diagnostic,
} from "../syntax/diagnostics";
import { parse, type Strictness } from "../syntax/parser";
import { resolveSymbols, type Symbols } from "../syntax/symbols";
import { inlineToPlainText, parseInline } from "../format/inline";
import { stableId } from "./ids";
import {
  attributeValues,
  firstAttributeValue,
  isPlayable,
  QuestionType,
  type QuestionModel,
} from "./question";
import { createQuestion } from "./questionBuilder";
import { createRound, type RoundModel } from "./round";
import { validateQuiz } from "./validate";
import type { AstAttribute, AstDocument } from "../syntax/ast";
import {
  CONFIG_HEADER_NAMES,
  parseHeaderConfig,
} from "../syntax/configAttributes";

export interface QuizMeta {
  readonly title: string;
  readonly syntax: number;
  readonly language: string | null;
  readonly languages: readonly string[];
  readonly theme: string | null;
  readonly description: string | null;
  readonly date: string | null;
  readonly seed: string | null;
  readonly authors: readonly string[];
  readonly version: string | null;
  readonly license: string | null;
  readonly homepage: string | null;
  readonly image: string | null;
  readonly extra: Readonly<Record<string, readonly string[]>>;
  /** Global settings written as header attributes. `createQuiz` merges these. */
  readonly config: Readonly<Record<string, unknown>>;
}

export interface QuizModel {
  readonly meta: QuizMeta;
  readonly rounds: readonly RoundModel[];
  readonly questions: readonly QuestionModel[];
  readonly start: QuestionModel | null;
  readonly end: QuestionModel | null;
  readonly diagnostics: readonly Diagnostic[];
}

export interface BuildOptions {
  readonly file?: string;
  readonly symbols?: Partial<Symbols>;
  readonly strictness?: Strictness;
  readonly defaultScore?: number;
  readonly defaultLanguage?: string | null;
  readonly forbidInlineLists?: boolean;
}

const HEADER_KNOWN: ReadonlySet<string> = new Set([
  "Quiz",
  "Syntax",
  "Language",
  "Languages",
  "Title",
  "Theme",
  "Description",
  "Date",
  "Seed",
  "Author",
  "Version",
  "License",
  "Homepage",
  "Image",
  ...CONFIG_HEADER_NAMES,
]);

function headerValue(
  header: readonly AstAttribute[],
  key: string,
): string | undefined {
  return attributeValues(header, key).find((value) => value.length > 0);
}

function plainText(text: string): string {
  return inlineToPlainText(parseInline(text).nodes).trim();
}

function buildMeta(header: readonly AstAttribute[]): QuizMeta {
  const extra: Record<string, string[]> = {};
  for (const attribute of header) {
    if (HEADER_KNOWN.has(attribute.key)) {
      continue;
    }
    const bucket = extra[attribute.key] ?? [];
    bucket.push(...attribute.values);
    extra[attribute.key] = bucket;
  }

  const languagesRaw = headerValue(header, "Languages");
  const languages =
    languagesRaw === undefined
      ? []
      : languagesRaw
          .split("|")
          .map((part) => part.trim())
          .filter((part) => part.length > 0);

  const syntaxRaw = headerValue(header, "Syntax");
  const syntax = syntaxRaw !== undefined ? Number(syntaxRaw) : 3;

  const title =
    headerValue(header, "Title") ?? headerValue(header, "Quiz") ?? "";
  const authorRaw = attributeValues(header, "Author");

  return {
    title,
    syntax: Number.isFinite(syntax) ? syntax : 3,
    language: headerValue(header, "Language") ?? null,
    languages,
    theme: headerValue(header, "Theme") ?? null,
    description: headerValue(header, "Description") ?? null,
    date: headerValue(header, "Date") ?? null,
    seed: headerValue(header, "Seed") ?? null,
    authors: authorRaw,
    version: headerValue(header, "Version") ?? null,
    license: headerValue(header, "License") ?? null,
    homepage: headerValue(header, "Homepage") ?? null,
    image: headerValue(header, "Image") ?? null,
    extra,
    config: parseHeaderConfig(header),
  };
}

export interface ParsedQuiz {
  readonly document: AstDocument;
  readonly diagnostics: readonly Diagnostic[];
  readonly symbols: Symbols;
}

/**
 * Text to AST. Its own function because a Worker can do this half off the main
 * thread, and the result is plain data that survives `postMessage`.
 */
export function parseQuiz(
  text: string,
  options: BuildOptions = {},
): ParsedQuiz {
  const symbols = resolveSymbols(options.symbols ?? {});
  const parsed = parse(text, {
    ...(options.file !== undefined ? { file: options.file } : {}),
    symbols,
    ...(options.strictness !== undefined
      ? { strictness: options.strictness }
      : {}),
    ...(options.forbidInlineLists === true ? { forbidInlineLists: true } : {}),
  });
  return {
    document: parsed.document,
    diagnostics: parsed.diagnostics,
    symbols,
  };
}

/** First file's header wins. Questions from every file join the same quiz. */
function mergeDocuments(documents: readonly AstDocument[]): AstDocument {
  const first = documents[0];
  return {
    header: first?.header ?? [],
    questions: documents.flatMap((entry) => entry.questions),
  };
}

export function buildQuizFromParsed(
  inputs: readonly ParsedQuiz[],
  options: BuildOptions = {},
): QuizModel {
  const symbols = resolveSymbols(options.symbols ?? inputs[0]?.symbols ?? {});
  const parsed = {
    document: mergeDocuments(inputs.map((input) => input.document)),
  };
  const diagnostics: Diagnostic[] = inputs.flatMap((input) => [
    ...input.diagnostics,
  ]);
  const meta = buildMeta(parsed.document.header);
  const defaultLanguage = options.defaultLanguage ?? meta.language;
  const defaultScore = options.defaultScore ?? 1;

  const rounds: Array<{
    id: string;
    name: string;
    secret: string | null;
    questions: QuestionModel[];
    source: QuestionModel | null;
    implicit: boolean;
  }> = [];
  const roundByName = new Map<string, number>();
  const questions: QuestionModel[] = [];
  let start: QuestionModel | null = null;
  let end: QuestionModel | null = null;
  let currentRound: number | null = null;

  const ensureDefaultRound = (): number => {
    if (currentRound !== null) {
      return currentRound;
    }
    const index =
      rounds.push({
        id: stableId("r", ["General"]),
        name: "General",
        secret: null,
        questions: [],
        source: null,
        implicit: true,
      }) - 1;
    roundByName.set("general", index);
    currentRound = index;
    return index;
  };

  for (const node of parsed.document.questions) {
    const roundAttribute = firstAttributeValue(node.attributes, "Section");
    const built = createQuestion(
      node,
      {
        defaultLanguage,
        defaultScore,
        round:
          currentRound !== null ? (rounds[currentRound]?.id ?? null) : null,
        symbols,
      },
      diagnostics,
    );

    if (built.type === QuestionType.Section) {
      const name =
        plainText(built.text.map((value) => value.text).join(" ")) || built.id;
      const id =
        firstAttributeValue(node.attributes, "ID") ?? stableId("r", [name]);
      const existing = roundByName.get(name.toLowerCase());
      if (existing !== undefined) {
        currentRound = existing;
        const round = rounds[existing];
        if (round) {
          if (round.secret === null && built.secret !== null) {
            round.secret = built.secret;
          }
          round.source = built;
        }
        continue;
      }
      const index =
        rounds.push({
          id,
          name,
          secret: built.secret,
          questions: [],
          source: built,
          implicit: false,
        }) - 1;
      roundByName.set(name.toLowerCase(), index);
      roundByName.set(id.toLowerCase(), index);
      currentRound = index;
      continue;
    }

    if (built.type === QuestionType.Start) {
      if (start !== null) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.DuplicateQuestion,
            "A second Start block replaced the first.",
            {
              location: node.location,
            },
          ),
        );
      }
      start = built;
      continue;
    }

    if (built.type === QuestionType.End) {
      if (end !== null) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.DuplicateQuestion,
            "A second End block replaced the first.",
            {
              location: node.location,
            },
          ),
        );
      }
      end = built;
      continue;
    }

    let roundIndex = currentRound;
    if (roundAttribute !== undefined) {
      const target = roundByName.get(roundAttribute.toLowerCase());
      if (target === undefined) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.UnknownRound,
            `No round is called "${roundAttribute}".`,
            {
              location: node.location,
              suggestion:
                "Start a round with `## Round name`, or fix the Section value.",
            },
          ),
        );
      } else {
        roundIndex = target;
      }
    } else {
      roundIndex = ensureDefaultRound();
    }

    const roundId =
      roundIndex !== null ? (rounds[roundIndex]?.id ?? null) : null;
    const question: QuestionModel = { ...built, round: roundId };
    if (isPlayable(question)) {
      questions.push(question);
      if (roundIndex !== null) {
        rounds[roundIndex]?.questions.push(question);
      }
    }
  }

  const roundModels: RoundModel[] = rounds.map((round) =>
    createRound(
      round.id,
      round.name,
      round.secret,
      round.questions,
      round.source,
      round.implicit,
    ),
  );

  const quiz: QuizModel = {
    meta,
    rounds: roundModels,
    questions,
    start,
    end,
    diagnostics,
  };

  const validation = validateQuiz(quiz);
  return { ...quiz, diagnostics: [...diagnostics, ...validation] };
}

/** One file in, one model out. The path everyone already uses. */
export function buildQuiz(text: string, options: BuildOptions = {}): QuizModel {
  return buildQuizFromParsed([parseQuiz(text, options)], options);
}
