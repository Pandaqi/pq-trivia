/**
 * Plan: the order things appear in.
 *
 * Author order by default. Shuffle is opt-in. Same content plus seed plus
 * options gives the same plan everywhere.
 */

import type { QuizModel } from "../model/quiz";
import { questionMaxScore, type QuestionModel } from "../model/question";
import { createQuestion } from "../model/questionBuilder";
import { DEFAULT_SYMBOLS } from "../syntax/symbols";
import type { AstAttribute, AstQuestion } from "../syntax/ast";
import { applyPlacement } from "./order";
import { derivedRng, shuffleWith } from "./shuffle";
import type { Diagnostic } from "../syntax/diagnostics";

export interface PlannedRound {
  readonly id: string;
  readonly name: string;
  readonly secret: string | null;
  /** Index of this round's first question in `plan.questions`. */
  readonly index: number;
  readonly count: number;
}

export interface QuizPlan {
  readonly seed: string;
  readonly questions: readonly QuestionModel[];
  readonly rounds: readonly PlannedRound[];
  readonly maxScore: number;
  readonly total: number;
  readonly diagnostics: readonly Diagnostic[];
}

export interface PlanOptions {
  readonly seed?: string;
  readonly shuffleQuestions?: boolean;
  readonly shuffleRounds?: boolean;
  readonly includeHidden?: boolean;
  /** Applies to questions without their own `Timer`. Milliseconds. */
  readonly defaultTimerMs?: number;
  /** V2's `disableTextFormatting`: every value is shown as written. */
  readonly disableTextFormatting?: boolean;
  /** V2's `addSecretThemeQuestions`: one question per secret round. */
  readonly addSecretThemeQuestions?: boolean;
  /** Text for the generated secret question, already translated. */
  readonly secretQuestionText?: string;
  /** V2's `groupBy`: keep one property value together. */
  readonly groupBy?: string;
}

function questionValues(question: QuestionModel, key: string): string[] {
  const name = key.trim().toLowerCase();
  if (name === "category" || name === "categories") {
    return [...question.categories];
  }
  if (name === "author" || name === "authors") {
    return [...question.authors];
  }
  if (name === "language") {
    return question.language === null ? [] : [question.language];
  }
  if (name === "type") {
    return [question.type];
  }
  if (name === "round" || name === "section") {
    return question.round === null ? [] : [question.round];
  }
  if (name === "id") {
    return [question.id];
  }
  if (name === "variant") {
    return question.variant === null ? [] : [question.variant];
  }
  if (name === "score") {
    return [String(question.score)];
  }
  return [...(question.extra[name] ?? [])];
}

function applyDefaults(
  question: QuestionModel,
  options: PlanOptions,
): QuestionModel {
  const fallbackTimer =
    options.defaultTimerMs !== undefined && options.defaultTimerMs > 0
      ? options.defaultTimerMs
      : null;
  const formatText =
    options.disableTextFormatting === true ? false : question.formatText;
  return {
    ...question,
    timerMs: question.timerMs ?? fallbackTimer,
    formatText,
  };
}

/** The round-question V2 added after a round with a `Secret`. */
function secretQuestion(
  round: { readonly id: string },
  secret: string,
  text: string,
): QuestionModel {
  const location = { file: "<secret-question>", line: 1, column: 1 };
  const attribute = (key: string, value: string): AstAttribute => ({
    key,
    rawKey: key,
    values: [value],
    location,
  });
  const node: AstQuestion = {
    attributes: [
      attribute("Question", text),
      attribute("Answers", secret),
      attribute("Correct", secret),
      attribute("Type", "Open"),
      attribute("Score", "1"),
    ],
    location,
  };
  return createQuestion(
    node,
    {
      defaultLanguage: null,
      defaultScore: 1,
      round: round.id,
      symbols: DEFAULT_SYMBOLS,
    },
    [],
  );
}

export const DEFAULT_SEED = "pq";

export function planQuiz(quiz: QuizModel, options: PlanOptions = {}): QuizPlan {
  const seed = options.seed ?? quiz.meta.seed ?? DEFAULT_SEED;
  const shuffleQuestions = options.shuffleQuestions ?? false;
  const shuffleRounds = options.shuffleRounds ?? false;
  const includeHidden = options.includeHidden ?? false;

  const diagnostics: Diagnostic[] = [];
  const rounds = quiz.rounds.filter((round) => round.questions.length > 0);
  const orderedRounds = shuffleRounds
    ? shuffleWith(rounds, derivedRng(seed, "rounds"))
    : rounds;

  const questions: QuestionModel[] = [];
  const plannedRounds: PlannedRound[] = [];

  for (const round of orderedRounds) {
    const visible = includeHidden
      ? round.questions
      : round.questions.filter((question) => !question.hiddenAtPlay);
    let shuffled = shuffleQuestions
      ? shuffleWith(visible, derivedRng(seed, `round:${round.id}`))
      : [...visible];
    if (options.groupBy !== undefined && options.groupBy.trim().length > 0) {
      const groups = [
        ...new Set(
          shuffled.map(
            (question) => questionValues(question, options.groupBy ?? "")[0] ?? "",
          ),
        ),
      ];
      const order = shuffleWith(groups, derivedRng(seed, `group:${round.id}`));
      shuffled = shuffled.sort(
        (a, b) =>
          order.indexOf(questionValues(a, options.groupBy ?? "")[0] ?? "") -
          order.indexOf(questionValues(b, options.groupBy ?? "")[0] ?? ""),
      );
    }
    const items = applyPlacement(shuffled, diagnostics).map((question) =>
      applyDefaults(question, options),
    );
    if (options.addSecretThemeQuestions === true && round.secret !== null) {
      items.push(
        secretQuestion(round, round.secret, options.secretQuestionText ?? ""),
      );
    }
    plannedRounds.push({
      id: round.id,
      name: round.name,
      secret: round.secret,
      index: questions.length,
      count: items.length,
    });
    questions.push(...items);
  }

  const maxScore = questions.reduce(
    (total, question) => total + questionMaxScore(question),
    0,
  );

  return {
    seed,
    questions,
    rounds: plannedRounds,
    maxScore,
    total: questions.length,
    diagnostics,
  };
}
