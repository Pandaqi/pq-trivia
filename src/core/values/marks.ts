/** Marks in text. One glyph set, everywhere an answer is judged. */

export enum AnswerMark {
  Correct = "✓",
  Wrong = "✗",
  Skipped = "–",
}

export function markOf(correct: boolean): string {
  return correct ? AnswerMark.Correct : AnswerMark.Wrong;
}

/** The dictionary key for the same judgement, for the screen reader. */
export function markKey(correct: boolean): string {
  return correct ? "correct" : "notCorrect";
}

/** `_one` for exactly one, `_other` for everything else. Keys, not sentences. */
export function pluralKey(
  count: number,
  singular: string,
  plural: string,
): string {
  return count === 1 ? singular : plural;
}
