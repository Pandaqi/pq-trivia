/** Print shapes. Plain data, so a host can log or display them. */

export type PrintVariant =
  "auto" | "quiz" | "questions" | "answers" | "form" | "grade" | "media";

export interface PrintProblem {
  /** Overflow would clip. Readability fits, but the type got small. */
  readonly kind: "overflow" | "readability";
  /** 1-based page number in the sheet. */
  readonly page: number;
  readonly questionId: string | null;
  readonly neededPx: number;
  readonly availablePx: number;
  readonly message: string;
}

export interface PrintOptions {
  readonly variant?: PrintVariant;
  /** Slides per sheet page. 2 is one above the other, 4 is a 2×2 grid. */
  readonly perPage?: 1 | 2 | 4;
  /** Question on the front, answer and explanation on the back. */
  readonly flashCards?: boolean;
  /** "compact" tightens the answer form to save paper. */
  readonly formStyle?: "roomy" | "compact";
  /** Form: start every round on a fresh page. */
  readonly roundPageBreak?: boolean;
  /** Called for every page that still does not fit after shrinking. */
  readonly onProblem?: (problem: PrintProblem) => void;
}
