/**
 * A question value: text plus masks.
 *
 * `?` question-only, `!` answer-only, `$` keep as is. Weird, but useful.
 */

import { unescapeValue } from "./coerce";

export enum ValueMask {
  All = "all",
  Question = "question",
  Answer = "answer",
}

export interface QuestionValue {
  readonly text: string;
  readonly mask: ValueMask;
  readonly keepAsIs: boolean;
}

export interface MaskSymbols {
  readonly questionMask: string;
  readonly answerMask: string;
  readonly keepAsIs: string;
}

export function parseQuestionValue(
  raw: string,
  symbols: MaskSymbols,
): QuestionValue {
  let text = raw.trim();
  let mask = ValueMask.All;
  let keepAsIs = false;

  const first = text.charAt(0);
  if (first.length > 0 && first === symbols.questionMask) {
    text = text.slice(1).trim();
    mask = ValueMask.Question;
  } else if (first.length > 0 && first === symbols.answerMask) {
    text = text.slice(1).trim();
    mask = ValueMask.Answer;
  } else if (first.length > 0 && first === symbols.keepAsIs) {
    text = text.slice(1).trim();
    keepAsIs = true;
  }

  return { text: unescapeValue(text), mask, keepAsIs };
}

/** Short name for the common case: raw attribute value in, masked value out. */
export function pickValue(raw: string, symbols: MaskSymbols): QuestionValue {
  return parseQuestionValue(raw, symbols);
}

export function formatQuestionValue(
  value: QuestionValue,
  symbols: MaskSymbols,
): string {
  const prefix =
    value.mask === ValueMask.Question
      ? symbols.questionMask
      : value.mask === ValueMask.Answer
        ? symbols.answerMask
        : value.keepAsIs
          ? symbols.keepAsIs
          : "";
  return `${prefix}${value.text}`;
}
