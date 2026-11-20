/**
 * Points after the answer: presets and streaks.
 *
 * The question decides what an answer is worth. This module decides what a
 * *run* of answers is worth, and how a wrong one is punished. No new maths:
 * the same grade, read through one more rule.
 */

import { round2 } from "./parts";
import type { GradePart } from "./types";

export enum ScoringPreset {
  Standard = "standard",
  /** A wrong answer costs a slice of the question. */
  Negative = "negative",
  /** All of it or none of it, whatever the question says. */
  AllOrNothing = "all-or-nothing",
  /** The share of parts that are right, whatever the question says. */
  Partial = "partial",
}

/** Three in a row starts the bonus. */
export const STREAK_MIN = 3;
/** Six in a row is as good as it gets. */
export const STREAK_FULL = STREAK_MIN * 2;
/** Nobody earns more than double. */
export const STREAK_CAP = 2;
/** Half again at three, double at six. */
export const STREAK_MID = 1.5;
/** A wrong answer costs a quarter of the question by default. */
export const DEFAULT_NEGATIVE_MARK = 0.25;

export interface PointRules {
  readonly preset: ScoringPreset;
  readonly negativeMarking: number;
  readonly streaks: boolean;
}

export const DEFAULT_POINT_RULES: PointRules = {
  preset: ScoringPreset.Standard,
  negativeMarking: DEFAULT_NEGATIVE_MARK,
  streaks: false,
};

/** 1x below three, 1.5x from three, 2x from six. Never above the cap. */
export function streakMultiplier(run: number): number {
  if (run < STREAK_MIN) {
    return 1;
  }
  if (run < STREAK_FULL) {
    return STREAK_MID;
  }
  return STREAK_CAP;
}

export interface PointInput {
  readonly points: number;
  readonly maxPoints: number;
  readonly correct: boolean;
  readonly answered: boolean;
  readonly parts: readonly GradePart[];
}

export interface PointResult {
  readonly points: number;
  readonly maxPoints: number;
  /** Correct answers in a row, this one included. Zero after a wrong answer. */
  readonly run: number;
  /** The streak bonus applied to this question. 1 when there is none. */
  readonly multiplier: number;
}

function presetOf(
  result: PointInput,
  rules: PointRules,
): { points: number; maxPoints: number } {
  switch (rules.preset) {
    case ScoringPreset.Negative: {
      if (!result.answered) {
        return { points: 0, maxPoints: result.maxPoints };
      }
      return result.correct
        ? { points: result.maxPoints, maxPoints: result.maxPoints }
        : {
            points: -round2(result.maxPoints * rules.negativeMarking),
            maxPoints: result.maxPoints,
          };
    }
    case ScoringPreset.AllOrNothing:
      return {
        points: result.correct ? result.maxPoints : 0,
        maxPoints: result.maxPoints,
      };
    case ScoringPreset.Partial: {
      const share =
        result.parts.length === 0
          ? 0
          : result.parts.filter((part) => part.correct).length /
            result.parts.length;
      return {
        points: round2(result.maxPoints * share),
        maxPoints: result.maxPoints,
      };
    }
    case ScoringPreset.Standard:
    default:
      return { points: result.points, maxPoints: result.maxPoints };
  }
}

/**
 * One question's points after the preset and the streak.
 *
 * A streak is a bonus, not worth more on paper: `maxPoints` stays where the
 * plan put it. A penalty is never multiplied either. A bad answer is not a
 * streak.
 */
export function applyPointRules(
  result: PointInput,
  rules: PointRules,
  runBefore: number,
): PointResult {
  const base = presetOf(result, rules);
  const run = result.correct ? runBefore + 1 : 0;
  const multiplier = rules.streaks ? streakMultiplier(run) : 1;
  const positive = base.points > 0;
  return {
    points: positive ? round2(base.points * multiplier) : base.points,
    maxPoints: base.maxPoints,
    run,
    multiplier: positive ? multiplier : 1,
  };
}
