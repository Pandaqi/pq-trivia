/**
 * Who won, and where everyone sits.
 *
 * One leader, or five. A tie at the top is a win for everyone on it.
 */

import type { LeaderRow } from "./types";

/**
 * Competition ranks for a board that is already in rank order.
 *
 * A tie shares the number, and the next one skips: 1, 1, 3. Like a standing.
 */
export function ranksOf(
  rows: readonly LeaderRow[],
): ReadonlyMap<string, number> {
  const ranks = new Map<string, number>();
  let rank = 0;
  let previous: number | null = null;
  rows.forEach((row, index) => {
    if (previous === null || row.score !== previous) {
      rank = index + 1;
      previous = row.score;
    }
    ranks.set(row.id, rank);
  });
  return ranks;
}

/** Ids of everyone on the top score. Empty when nobody scored. */
export function winnersOf(rows: readonly LeaderRow[]): ReadonlySet<string> {
  const top = rows.reduce((best, row) => Math.max(best, row.score), 0);
  if (top <= 0) {
    return new Set();
  }
  return new Set(rows.filter((row) => row.score === top).map((row) => row.id));
}
