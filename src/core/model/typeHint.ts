/**
 * The numbers behind "this is a multiple choice question". The renderer turns
 * them into words, so core stays free of interface strings.
 */

import { pointsPerPart, QuestionType, type QuestionModel } from "./question";

export interface QuestionTypeHint {
  readonly kind: QuestionType;
  readonly answerCount: number;
  readonly correctCount: number;
  /** Points a single correct answer earns. */
  readonly pointsPerAnswer: number;
  readonly range: number | null;
  /** Matrix rows, or zero for every other type. */
  readonly rows: number;
  /** Estimate: the unit next to the number. */
  readonly unit: string | null;
}

/** Types with no fixed answer shape have nothing useful to say here. */
const NO_TYPE_HINT: ReadonlySet<QuestionType> = new Set([
  QuestionType.Section,
  QuestionType.Start,
  QuestionType.End,
  QuestionType.Custom,
]);

/** Counts only, never identities: both the screen and the paper word this. */
export function typeHintOf(question: QuestionModel): QuestionTypeHint | null {
  if (NO_TYPE_HINT.has(question.type)) {
    return null;
  }
  const parts = Math.max(question.correct.length, 1);
  const pointsPerAnswer = pointsPerPart(question);
  return {
    kind: question.type,
    answerCount: question.answers.length,
    correctCount: parts,
    pointsPerAnswer,
    range: question.range,
    rows: question.rows.length,
    unit: question.unit,
  };
}
