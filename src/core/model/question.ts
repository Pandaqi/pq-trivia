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
import type { HotspotTarget, SliderRange } from "../values/point";
import { coerceEnum } from "../values/coerce";
import type { MediaDescriptor } from "../values/media";
import type { QuestionValue } from "../values/qval";
import { partPoints, type QuestionPart } from "./parts";

export enum QuestionType {
  Open = "open",
  Choice = "choice",
  List = "list",
  Range = "range",
  Rank = "rank",
  Estimate = "estimate",
  Sort = "sort",
  Match = "match",
  Cloze = "cloze",
  Matrix = "matrix",
  Parts = "parts",
  Classification = "classification",
  Diagram = "diagram",
  Hotspot = "hotspot",
  OddOneOut = "odd-one-out",
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
  /** A registered plugin id when `type` is `Custom`. Null otherwise. */
  readonly plugin: string | null;
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
  /** Host-only notes. Never in the view model, never printed. */
  readonly notes: readonly QuestionValue[];
  readonly sources: readonly string[];
  readonly explanation: string | null;
  readonly description: string | null;
  readonly secret: string | null;
  readonly score: number;
  readonly scoring: ScoringMethod;
  readonly grading: GradingMode;
  readonly fuzzyDistance: number | null;
  readonly range: number | null;
  /** Estimate: how far off the answer may be. Falls back to `Range`. */
  readonly tolerance: number | null;
  /** Estimate: km, kg, years. Shown next to the number, never graded. */
  readonly unit: string | null;
  /** A slider, when the author names its bounds: `Slider => 0..100`. */
  readonly slider: SliderRange | null;
  /** Choice: the player must pick the one false option, not the true ones. */
  readonly negate: boolean;
  /** One line per answer, shown after the reveal. */
  readonly feedback: readonly string[];
  /** Autocomplete suggestions. Only what `Suggest` says; aliases stay hidden. */
  readonly suggestions: readonly string[];
  /** Matrix: one statement per row. */
  readonly rows: readonly string[];
  /** Matrix: the shared scale. Defaults to true and false. */
  readonly scale: readonly string[];
  /** Matrix: tick more than one box per row. */
  readonly multiple: boolean;
  /** Parts: one input per part, with its own kind and share of the score. */
  readonly parts: readonly QuestionPart[];
  /** Classification: the named buckets. */
  readonly buckets: readonly string[];
  /** Hotspot and diagram: named points on the image. */
  readonly targets: readonly HotspotTarget[];
  /** How close a click must land, in percent of the image. */
  readonly hitRadius: number;
  /** Media: how many times a clip may be played. Null means no limit. */
  readonly playLimit: number | null;
  /** Rounds only: how many of the round's questions to draw. Null means all. */
  readonly pool: number | null;
  /** 1 to 5. Null when the author said nothing. Used to balance a pool. */
  readonly difficulty: number | null;
  /**
   * One slot per `Variants` line. `{1}` takes the first slot's picked value.
   * Empty when the question is the same every play.
   */
  readonly variants: readonly (readonly string[])[];
  /** Rounds only: one timer for the whole round. */
  readonly roundTimerMs: number | null;
  /** Wager: bet points before the reveal. */
  readonly wager: boolean;
  /** Buzzer: first correct answer in the live room wins. */
  readonly buzzer: boolean;
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
  /** Type names registered by a plugin. Unknown ones still warn. */
  readonly pluginTypes?: readonly string[];
}

/** The scale a matrix uses when the author did not name one. */
export const DEFAULT_SCALE: readonly string[] = ["True", "False"];

/** How far a click may land when no `HitRadius` is given. */
export const DEFAULT_HIT_RADIUS = 8;

/** Difficulties people write in words, mapped to the 1 to 5 scale. */
export const DIFFICULTY_WORDS: Readonly<Record<string, number>> = {
  trivial: 1,
  easy: 2,
  medium: 3,
  normal: 3,
  hard: 4,
  expert: 5,
};

/** The top of the difficulty scale. */
export const MAX_DIFFICULTY = 5;

/** `Confidence`, `confidence`, `odd one out` and `odd-one-out` agree. */
export function pluginIdOf(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
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

/** `OddOneOut`, `odd-one-out` and `odd one out` are the same question. */
const TYPE_ALIASES: Readonly<Record<string, QuestionType>> = {
  oddoneout: QuestionType.OddOneOut,
  multipart: QuestionType.Parts,
  multiparts: QuestionType.Parts,
  number: QuestionType.Range,
};

export function toQuestionType(raw: string): QuestionType | null {
  const exact = coerceEnum(raw, QUESTION_TYPES);
  if (exact !== undefined) {
    return exact as QuestionType;
  }
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return TYPE_ALIASES[key] ?? null;
}

export function detectType(attributes: readonly AstAttribute[]): QuestionType {
  const raw = firstAttributeValue(attributes, "Type");
  if (raw !== undefined) {
    const type = toQuestionType(raw);
    if (type !== null) {
      return type;
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

/** Types whose answers are pairs or placements, not labels on their own. */
export function isMappingType(type: QuestionType): boolean {
  return (
    type === QuestionType.Diagram ||
    type === QuestionType.Classification ||
    type === QuestionType.Match
  );
}

/** What one correct part adds to the question. Per-correct pays the full score. */
export function pointsPerPart(question: QuestionModel): number {
  if (question.scoring === ScoringMethod.PerCorrect) {
    return question.score;
  }
  // Rank scores the neighbours, not the items: four dinosaurs, three pairs.
  let count = Math.max(question.correct.length, 1);
  if (question.type === QuestionType.Rank) {
    count = Math.max(question.correct.length - 1, 1);
  } else if (
    question.type === QuestionType.Parts &&
    question.parts.length > 0
  ) {
    count = question.parts.length;
  }
  return Math.round((question.score / count) * 10) / 10;
}

export function questionMaxScore(question: QuestionModel): number {
  if (question.type === QuestionType.Section) {
    return 0;
  }
  if (question.type === QuestionType.Parts && question.parts.length > 0) {
    return partPoints(question.parts, question.score).reduce(
      (total, points) => total + points,
      0,
    );
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

/** Types where the keyboard path is a list of answers, not a free field. */
export function isStructuredType(type: QuestionType): boolean {
  return (
    type === QuestionType.Sort ||
    type === QuestionType.Rank ||
    type === QuestionType.Match ||
    type === QuestionType.Classification ||
    type === QuestionType.Diagram
  );
}
