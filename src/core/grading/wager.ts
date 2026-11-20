/**
 * The wager rule, in one place.
 *
 * Solo results and live rooms both call this, so a bet cannot mean two
 * different things.
 *
 * A stake may not be bigger than the question, nor than the score it comes
 * from. A right answer wins it, anything else loses it. Skipping a question is
 * not betting. Nobody drops below zero: a loss stops when there is nothing left
 * to take.
 */

import { round2 } from "./parts";

export interface WagerInput {
  /** The stake the player offered. */
  readonly offered: number | null | undefined;
  /** `Wager => true` on the question. Without it the number is not a bet. */
  readonly allowed: boolean;
  /** A skipped question is not a bet. */
  readonly answered: boolean;
  /** Base points the answer earned, before any stake. */
  readonly points: number;
  /** The most the question pays before any stake. */
  readonly maxPoints: number;
  /** The score this question starts from. */
  readonly bank: number;
  readonly correct: boolean;
}

export interface WagerResult {
  /** What was really at stake. Zero when nothing was. */
  readonly stake: number;
  /** The question's points after the bet, never below what the bank can lose. */
  readonly points: number;
  /** What this attempt could have earned on the question. */
  readonly maxPoints: number;
}

/** A stake may not be bigger than the question, nor than what you hold. */
export function stakingLimit(maxPoints: number, bank: number): number {
  return Math.max(
    0,
    Math.min(Math.floor(maxPoints), Math.floor(Math.max(bank, 0))),
  );
}

/** Nothing at stake is no swing. A lost stake comes straight off the score. */
function swingOf(stake: number, correct: boolean): number {
  if (stake === 0) {
    return 0;
  }
  return correct ? stake : -stake;
}

export function settleWager(input: WagerInput): WagerResult {
  const stake =
    input.allowed && input.answered
      ? Math.min(
          Math.max(input.offered ?? 0, 0),
          stakingLimit(input.maxPoints, input.bank),
        )
      : 0;
  const swing = swingOf(stake, input.correct);
  const earned = round2(
    Math.max(input.points + swing, -Math.max(input.bank, 0)),
  );
  return {
    stake,
    // `-0` is still a zero score. Nobody wants to see minus nothing.
    points: earned === 0 ? 0 : earned,
    maxPoints: round2(input.maxPoints + stake),
  };
}
