/**
 * The question model.
 *
 * Plain data. No DOM, no typer classes, no side effects. Renderers read it,
 * graders read it, the CLI reads it. Building one lives in `questionBuilder`.
 */

import type { AstAttribute } from "../syntax/ast";
import { QUESTION_TYPES } from "../syntax/attributes";
import type { SourceLocation } from "../syntax/diagnostics";
import type { Symbols } from "../syntax/symbols";
import { coerceEnum } from "../values/coerce";
import type { MediaDescriptor } from "../values/media";
import type { QuestionValue } from "../values/qval";

export enum QuestionType {
  Open = "open",
  Choice = "choice",
  List = "list",
  Range = "range",
  Sort = "sort",
  Match = "match",
  Cloze = "cloze",
  Section = "section",
  Start = "start",
  End = "end",
  Custom = "custom",
}

export enum ScoringMethod {
  AllOrNothing = "all-or-nothing",
  Partial = "partial",
  PerCorrect = "per-correct",
}

export enum GradingMode {
  Exact = "exact",
  Normalized = "normalized",
  Fuzzy = "fuzzy",
}

export enum OrderMode {
  Keep = "keep",
  Shuffle = "shuffle",
}

export enum Direction {
  Auto = "auto",
  Ltr = "ltr",
  Rtl = "rtl",
}

export enum ContinueMode {
  Always = "always",
  OnCorrect = "onCorrect",
  OnWrong = "onWrong",
}

export interface QuestionModel {
  readonly id: string;
  readonly type: QuestionType;
  readonly round: string | null;
  readonly text: readonly QuestionValue[];
  readonly answers: readonly QuestionValue[];
  readonly correct: readonly QuestionValue[];
  readonly alsoAccept: readonly string[];
  readonly reject: readonly string[];
  readonly media: readonly MediaDescriptor[];
  /** Fallback alt text for this question's media. */
  readonly alt: string | null;
  /** Text to print when a `Script` widget cannot. */
  readonly printFallback: string | null;
  readonly categories: readonly string[];
  readonly authors: readonly string[];
  readonly comments: readonly QuestionValue[];
  readonly hints: readonly QuestionValue[];
  readonly sources: readonly string[];
  readonly explanation: string | null;
  readonly description: string | null;
  readonly secret: string | null;
  readonly score: number;
  readonly scoring: ScoringMethod;
  readonly grading: GradingMode;
  readonly fuzzyDistance: number | null;
  readonly range: number | null;
  readonly timerMs: number | null;
  readonly answersOrder: OrderMode;
  readonly mediaOrder: OrderMode;
  readonly placeAt: number | null;
  readonly placeBefore: readonly string[];
  readonly placeAfter: readonly string[];
  readonly layout: string | null;
  readonly background: string | null;
  readonly colorScheme: string | null;
  readonly transition: string | null;
  readonly reveal: string | null;
  /** Parts shown one at a time, in this order. Empty means all at once. */
  readonly steps: readonly string[];
  /** Animation between steps. Falls back to the quiz default, then to fade. */
  readonly stepTransition: string | null;
  readonly direction: Direction;
  readonly classes: readonly string[];
  readonly printFlags: readonly string[];
  readonly buttons: readonly string[];
  readonly credits: readonly string[];
  readonly height: string | null;
  readonly script: string | null;
  readonly when: string | null;
  readonly unlock: string | null;
  readonly continueMode: ContinueMode;
  readonly variant: string | null;
  readonly language: string | null;
  readonly translation: string | null;
  readonly hiddenAtPlay: boolean;
  readonly hiddenAtExport: boolean;
  readonly formatText: boolean;
  readonly syncAll: boolean;
  readonly extra: Readonly<Record<string, readonly string[]>>;
  readonly location: SourceLocation;
}

export interface BuildContext {
  readonly defaultLanguage: string | null;
  readonly defaultScore: number;
  readonly round: string | null;
  readonly symbols: Symbols;
}

export function attributeValues(
  attributes: readonly AstAttribute[],
  key: string,
): string[] {
  const out: string[] = [];
  for (const attribute of attributes) {
    if (attribute.key === key) {
      out.push(...attribute.values);
    }
  }
  return out;
}

export function firstAttributeValue(
  attributes: readonly AstAttribute[],
  key: string,
): string | undefined {
  return attributeValues(attributes, key)[0];
}

export function detectType(attributes: readonly AstAttribute[]): QuestionType {
  const raw = firstAttributeValue(attributes, "Type");
  if (raw !== undefined) {
    const type = coerceEnum(raw, QUESTION_TYPES);
    if (type !== undefined) {
      return type as QuestionType;
    }
  }
  if (firstAttributeValue(attributes, "Range") !== undefined) {
    return QuestionType.Range;
  }
  // V2 inference, kept so old files behave the same: several answers means choice.
  if (attributeValues(attributes, "Answers").length > 1) {
    return QuestionType.Choice;
  }
  return QuestionType.Open;
}

export function questionMaxScore(question: QuestionModel): number {
  if (question.type === QuestionType.Section) {
    return 0;
  }
  const parts = Math.max(question.correct.length, 1);
  return question.scoring === ScoringMethod.PerCorrect
    ? question.score * parts
    : question.score;
}

export function isPlayable(question: QuestionModel): boolean {
  return (
    question.type !== QuestionType.Section &&
    question.type !== QuestionType.Start &&
    question.type !== QuestionType.End
  );
}

/** Types where the player must give a free-text answer. */
export function isOpenType(type: QuestionType): boolean {
  return (
    type === QuestionType.Open ||
    type === QuestionType.Range ||
    type === QuestionType.List ||
    type === QuestionType.Cloze
  );
}
