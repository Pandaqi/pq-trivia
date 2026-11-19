/**
 * Answer IDs. Content hash, never an index.
 *
 * V2 compared choices by click order, so a shuffle broke the grading. Responses
 * point at these IDs instead. Positions can move. IDs cannot.
 */

import type { QuestionValue } from "../values/qval";
import { stableId } from "./ids";
import type { QuestionModel } from "./question";

export interface AnswerRef {
  readonly id: string;
  readonly value: QuestionValue;
  readonly index: number;
}

export function answerRefs(question: QuestionModel): AnswerRef[] {
  const seen = new Map<string, number>();
  return question.answers.map((value, index) => {
    const base = stableId("a", [question.id, value.text]);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return { id: count === 0 ? base : `${base}-${count + 1}`, value, index };
  });
}

export function findAnswer(
  question: QuestionModel,
  id: string,
): AnswerRef | undefined {
  return answerRefs(question).find((ref) => ref.id === id);
}
