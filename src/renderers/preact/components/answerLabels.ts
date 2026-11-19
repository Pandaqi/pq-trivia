/** A, B, C by default. Numbers, roman or nothing when the host asks. */

import { AnswerLabels } from "../../../core/quiz/types";

const ROMAN: readonly (readonly [number, string])[] = [
  [1000, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"],
];

function roman(number: number): string {
  let left = number;
  let text = "";
  for (const [value, numeral] of ROMAN) {
    while (left >= value) {
      text += numeral;
      left -= value;
    }
  }
  return text;
}

export function answerLabel(
  index: number,
  style: AnswerLabels | string | undefined,
): string {
  switch (style) {
    case AnswerLabels.Numbers:
      return String(index + 1);
    case AnswerLabels.Roman:
      return roman(index + 1);
    case AnswerLabels.None:
      return "";
    case AnswerLabels.Lowercase:
      return String.fromCharCode(97 + (index % 26));
    default:
      return String.fromCharCode(65 + (index % 26));
  }
}
