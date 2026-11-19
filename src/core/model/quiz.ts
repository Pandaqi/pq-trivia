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
import type { AstAttribute } from "../syntax/ast";

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
  };
}

export function buildQuiz(text: string, options: BuildOptions = {}): QuizModel {
  const symbols = resolveSymbols(options.symbols ?? {});
  const parsed = parse(text, {
    ...(options.file !== undefined ? { file: options.file } : {}),
    symbols,
    ...(options.strictness !== undefined
      ? { strictness: options.strictness }
      : {}),
  });

  const diagnostics: Diagnostic[] = [...parsed.diagnostics];
  const meta = buildMeta(parsed.document.header);
  const defaultLanguage = options.defaultLanguage ?? meta.language;
  const defaultScore = options.defaultScore ?? 1;

  const rounds: Array<{
    id: string;
    name: string;
    secret: string | null;
    questions: QuestionModel[];
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
        if (round && round.secret === null && built.secret !== null) {
          round.secret = built.secret;
        }
        continue;
      }
      const index =
        rounds.push({ id, name, secret: built.secret, questions: [] }) - 1;
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
                "Start a round with `# Round name`, or fix the Section value.",
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
    createRound(round.id, round.name, round.secret, round.questions),
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
