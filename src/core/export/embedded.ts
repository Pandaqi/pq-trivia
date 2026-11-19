/**
 * Embedded JSON v3. A save format, not an authoring format.
 *
 * Answers travel with content IDs, so a shuffler cannot break a correct answer.
 * Export → import gives the same quiz back.
 */

import { answerRefs } from "../model/answers";
import { buildQuiz, type QuizMeta, type QuizModel } from "../model/quiz";
import {
  QuestionType,
  type BuildContext,
  type QuestionModel,
} from "../model/question";
import { createQuestion } from "../model/questionBuilder";
import type { RoundModel } from "../model/round";
import {
  DiagnosticCodes,
  syntaxWarning,
  type Diagnostic,
} from "../syntax/diagnostics";
import { DEFAULT_SYMBOLS } from "../syntax/symbols";
import { parseQuestionValue, ValueMask } from "../values/qval";
import type { MediaDescriptor } from "../values/media";
import type { AstQuestion } from "../syntax/ast";

export const EMBEDDED_SCHEMA_URL = "https://pq-trivia.dev/schema/v3/quiz.json";
export const EMBEDDED_VERSION = 3;

export interface EmbeddedAnswer {
  readonly id: string;
  readonly text: string;
}

export interface EmbeddedQuestion {
  readonly id: string;
  readonly type: QuestionType;
  readonly text: readonly string[];
  readonly answers: readonly EmbeddedAnswer[];
  readonly correct: readonly string[];
  readonly score: number;
  readonly round: string | null;
  readonly language: string | null;
  readonly categories: readonly string[];
  readonly authors: readonly string[];
  readonly explanation: string | null;
  readonly media: readonly MediaDescriptor[];
  readonly hints: readonly string[];
  readonly timerMs: number | null;
  readonly layout: string | null;
  readonly extra?: Readonly<Record<string, readonly string[]>>;
}

export interface EmbeddedRound {
  readonly id: string;
  readonly name: string;
  readonly secret: string | null;
  readonly questions: readonly string[];
}

export interface EmbeddedQuizV3 {
  readonly $schema: string;
  readonly schemaVersion: number;
  readonly meta: {
    readonly title: string;
    readonly languages: readonly string[];
    readonly seed: string | null;
  };
  readonly config: Readonly<Record<string, unknown>>;
  readonly rounds: readonly EmbeddedRound[];
  readonly questions: Readonly<Record<string, EmbeddedQuestion>>;
}

export interface EmbeddedOptions {
  /** Drop empty fields. Both shapes parse. */
  readonly compact?: boolean;
}

export interface ImportResult {
  readonly quiz: QuizModel;
  readonly diagnostics: readonly Diagnostic[];
}

export function toEmbedded(
  quiz: QuizModel,
  options: EmbeddedOptions = {},
): EmbeddedQuizV3 {
  const compact = options.compact ?? false;
  const questions: Record<string, EmbeddedQuestion> = {};

  for (const question of quiz.questions) {
    const refs = answerRefs(question);
    const idByText = new Map(refs.map((ref) => [ref.value.text, ref.id]));
    const answers = refs.map((ref) => ({ id: ref.id, text: ref.value.text }));
    const correct = question.correct
      .map((value) => idByText.get(value.text))
      .filter((id): id is string => id !== undefined);

    questions[question.id] = {
      id: question.id,
      type: question.type,
      text: question.text.map((value) => value.text),
      answers,
      correct,
      score: question.score,
      round: question.round,
      language: question.language,
      categories: question.categories,
      authors: question.authors,
      explanation: question.explanation,
      media: question.media,
      hints: question.hints.map((value) => value.text),
      timerMs: question.timerMs,
      layout: question.layout,
      ...(compact ? {} : { extra: question.extra }),
    };
  }

  const rounds: EmbeddedRound[] = quiz.rounds.map((round) => ({
    id: round.id,
    name: round.name,
    secret: round.secret,
    questions: round.questions.map((question) => question.id),
  }));

  return {
    $schema: EMBEDDED_SCHEMA_URL,
    schemaVersion: EMBEDDED_VERSION,
    meta: {
      title: quiz.meta.title,
      languages: quiz.meta.languages,
      seed: quiz.meta.seed,
    },
    config: quiz.meta.seed === null ? {} : { seed: quiz.meta.seed },
    rounds,
    questions,
  };
}

const EMPTY_LOCATION = { file: "<embedded>", line: 1, column: 1 };

const EMPTY_CONTEXT: BuildContext = {
  defaultLanguage: null,
  defaultScore: 1,
  round: null,
  symbols: DEFAULT_SYMBOLS,
};

/** A question with every default filled in, for importers to override. */
function blankQuestion(): QuestionModel {
  const node: AstQuestion = { attributes: [], location: EMPTY_LOCATION };
  return createQuestion(node, EMPTY_CONTEXT, []);
}

function toValues(
  texts: readonly string[],
): ReturnType<typeof parseQuestionValue>[] {
  return texts.map((text) => parseQuestionValue(text, DEFAULT_SYMBOLS));
}

function questionFromEmbedded(
  data: EmbeddedQuestion,
  diagnostics: Diagnostic[],
): QuestionModel {
  const base = blankQuestion();
  const answers = data.answers.map((answer) => ({
    id: answer.id,
    value: { text: answer.text, mask: ValueMask.All, keepAsIs: false },
  }));
  const idByText = new Map(
    answers.map((answer) => [answer.value.text, answer.id]),
  );

  const correctValues = data.correct.map((entry) => {
    const byId = answers.find((answer) => answer.id === entry);
    if (byId) {
      return byId.value;
    }
    const byText = idByText.get(entry);
    if (byText !== undefined) {
      return (
        answers.find((answer) => answer.id === byText)?.value ?? {
          text: entry,
          mask: ValueMask.All,
          keepAsIs: false,
        }
      );
    }
    diagnostics.push(
      syntaxWarning(
        DiagnosticCodes.CorrectNotInAnswers,
        `Embedded answer "${entry}" is not in the answer list.`,
        {
          location: EMPTY_LOCATION,
        },
      ),
    );
    return { text: entry, mask: ValueMask.All, keepAsIs: false };
  });

  return {
    ...base,
    id: data.id,
    type: data.type,
    round: data.round,
    text: toValues(data.text),
    answers: answers.map((answer) => answer.value),
    correct: correctValues,
    score: data.score,
    language: data.language,
    categories: data.categories,
    authors: data.authors,
    explanation: data.explanation,
    media: data.media ?? [],
    hints: toValues(data.hints),
    timerMs: data.timerMs,
    layout: data.layout,
    extra: data.extra ?? {},
    location: EMPTY_LOCATION,
  };
}

/** An encrypted quiz file. Everything but the envelope is opaque. */
export interface EncryptedQuizPayload {
  readonly format: "pq-encrypted";
  readonly version: 1;
  readonly salt: string;
  readonly iv: string;
  readonly data: string;
}

export function isEncryptedQuiz(value: unknown): value is EncryptedQuizPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record["format"] === "pq-encrypted" &&
    record["version"] === 1 &&
    typeof record["salt"] === "string" &&
    typeof record["iv"] === "string" &&
    typeof record["data"] === "string"
  );
}

/**
 * Injected crypto. Core never touches `crypto.subtle` itself, so a test, a CLI
 * or a browser all get to choose how the answers are locked.
 */
export interface AnswerKey {
  encrypt(
    value: unknown,
    passphrase: string,
  ): Promise<Omit<EncryptedQuizPayload, "format" | "version">>;
  unlock(payload: EncryptedQuizPayload, passphrase: string): Promise<unknown>;
}

export function fromEmbedded(input: unknown): ImportResult {
  const diagnostics: Diagnostic[] = [];
  const data = input as Partial<EmbeddedQuizV3> | null;

  if (
    data === null ||
    typeof data !== "object" ||
    data.questions === undefined ||
    data.questions === null
  ) {
    diagnostics.push(
      syntaxWarning(
        DiagnosticCodes.MissingQuestion,
        "Embedded JSON has no questions.",
        {
          location: EMPTY_LOCATION,
          suggestion: "Check the file was exported by PQ-Trivia v3.",
        },
      ),
    );
    const empty: QuizModel = {
      meta: emptyMeta(),
      rounds: [],
      questions: [],
      start: null,
      end: null,
      diagnostics,
    };
    return { quiz: empty, diagnostics };
  }

  const questions: QuestionModel[] = [];
  const byId = new Map<string, QuestionModel>();

  for (const [id, raw] of Object.entries(
    data.questions as Record<string, EmbeddedQuestion>,
  )) {
    const question = questionFromEmbedded({ ...raw, id }, diagnostics);
    questions.push(question);
    byId.set(question.id, question);
  }

  const rounds: RoundModel[] = (data.rounds ?? []).map((round) => ({
    id: round.id,
    name: round.name,
    secret: round.secret,
    questions: round.questions
      .map((id) => byId.get(id))
      .filter((question): question is QuestionModel => question !== undefined),
  }));

  const meta: QuizMeta = {
    ...emptyMeta(),
    title: data.meta?.title ?? "",
    languages: data.meta?.languages ?? [],
    seed: data.meta?.seed ?? null,
  };

  return {
    quiz: { meta, rounds, questions, start: null, end: null, diagnostics },
    diagnostics,
  };
}

function emptyMeta(): QuizMeta {
  return {
    title: "",
    syntax: 3,
    language: null,
    languages: [],
    theme: null,
    description: null,
    date: null,
    seed: null,
    authors: [],
    version: null,
    license: null,
    homepage: null,
    image: null,
    extra: {},
  };
}

/** JSON string, pretty or compact. Both read back the same. */
export function toEmbeddedJson(
  quiz: QuizModel,
  options: EmbeddedOptions & { pretty?: boolean } = {},
): string {
  const data = toEmbedded(quiz, options);
  return options.pretty === false
    ? JSON.stringify(data)
    : JSON.stringify(data, null, 2);
}

/** Used by tests and the CLI: text in, embedded JSON out, safe defaults. */
export function quizToEmbedded(text: string): EmbeddedQuizV3 {
  return toEmbedded(buildQuiz(text));
}
