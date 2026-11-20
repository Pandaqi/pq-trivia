/**
 * Variants: one template, different values per play.
 *
 * `Variants` gives one slot per line. `{1}` and `{2}` in the text take the
 * value picked for that slot. Same seed, same values, on screen and on paper.
 *
 * IDs are computed before this runs, so a variant never changes a question's
 * identity. Attempts, translations and flow keep working.
 */

import type { QuestionModel } from "../model/question";
import type { QuestionValue } from "../values/qval";
import { derivedRng, shuffleWith } from "./shuffle";

const PLACEHOLDER = /\{(\d+)\}/g;

/** The value each slot takes this play. Empty when the question has none. */
export function pickVariants(
  question: QuestionModel,
  seed: string,
): readonly string[] {
  return question.variants.map((slot, index) => {
    // One stream per slot. Sharing a stream made every slot of a question
    // pick the same position, so slot two was a copy of slot one's luck.
    const shuffled = shuffleWith(
      slot,
      derivedRng(seed, `variant:${question.id}:${index}`),
    );
    return shuffled[0] ?? "";
  });
}

function fill(text: string, values: readonly string[]): string {
  return text.replace(PLACEHOLDER, (whole, index: string) => {
    const value = values[Number(index) - 1];
    return value ?? whole;
  });
}

function fillValue(
  value: QuestionValue,
  values: readonly string[],
): QuestionValue {
  // `$text` asked to stay as written. A placeholder is a request, not a typo.
  return value.keepAsIs ? value : { ...value, text: fill(value.text, values) };
}

/** A copy of the question with this play's values in place. */
export function applyVariant(
  question: QuestionModel,
  values: readonly string[],
): QuestionModel {
  if (values.length === 0) {
    return question;
  }
  const fillAll = (list: readonly QuestionValue[]): QuestionValue[] =>
    list.map((value) => fillValue(value, values));
  return {
    ...question,
    text: fillAll(question.text),
    answers: fillAll(question.answers),
    correct: fillAll(question.correct),
    comments: fillAll(question.comments),
    hints: fillAll(question.hints),
    notes: fillAll(question.notes),
    alsoAccept: question.alsoAccept.map((text) => fill(text, values)),
    reject: question.reject.map((text) => fill(text, values)),
    explanation:
      question.explanation === null ? null : fill(question.explanation, values),
  };
}

/** Both steps, for the planner. */
export function withVariants(
  question: QuestionModel,
  seed: string,
): QuestionModel {
  if (question.variants.length === 0) {
    return question;
  }
  return applyVariant(question, pickVariants(question, seed));
}
