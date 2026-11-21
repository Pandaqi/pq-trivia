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

/**
 * The dictionary key for a count: `_one` for one, `_few` for the few form
 * (2–4, and 22–24, 32–34…), `_other` for the rest. A language that draws no
 * line between few and many repeats the same word in both. Keys, not
 * sentences.
 */
export function pluralKey(count: number, base: string): string {
  const size = Math.abs(count);
  if (size === 1) {
    return `${base}_one`;
  }
  const last = size % 10;
  const lastTwo = size % 100;
  const few = last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14);
  return few ? `${base}_few` : `${base}_other`;
}
