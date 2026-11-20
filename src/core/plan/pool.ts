/**
 * Question pools. `Pool => 10` on a round draws ten of its questions.
 *
 * Seeded, so the same quiz and the same seed draw the same ten. The report
 * says which ones, because a teacher needs to know what was asked.
 *
 * `BalanceDifficulty` spreads the draw across the difficulty tags instead of
 * taking whatever the shuffle gives. The draw is balanced; the order inside
 * the round stays the author's.
 */

import { MAX_DIFFICULTY, type QuestionModel } from "../model/question";
import { derivedRng, shuffleWith } from "./shuffle";

export interface PoolDraw {
  readonly questions: readonly QuestionModel[];
  /** IDs that made it in. Empty when no pool trimmed anything. */
  readonly drawn: readonly string[];
  readonly available: number;
}

/** Missing difficulty counts as the middle, so an untagged round still draws. */
function difficultyOf(question: QuestionModel): number {
  return question.difficulty ?? Math.ceil(MAX_DIFFICULTY / 2);
}

/** One pick per difficulty band, in turn, until the pool is full. */
function balanced(
  questions: readonly QuestionModel[],
  size: number,
  seed: string,
  key: string,
): QuestionModel[] {
  const bands: QuestionModel[][] = [];
  for (let level = 1; level <= MAX_DIFFICULTY; level += 1) {
    bands.push(
      shuffleWith(
        questions.filter((question) => difficultyOf(question) === level),
        derivedRng(seed, `pool:${key}:${level}`),
      ),
    );
  }
  const chosen: QuestionModel[] = [];
  let cursor = 0;
  while (chosen.length < size) {
    const band = bands[cursor % bands.length] ?? [];
    const next = band.shift();
    if (next !== undefined) {
      chosen.push(next);
    }
    // Every band empty means there is nothing left to draw.
    if (bands.every((list) => list.length === 0)) {
      break;
    }
    cursor += 1;
  }
  return chosen;
}

/**
 * Draw the pool. Keeps the author's order among the questions that made it,
 * so a balanced draw does not reorder the round.
 */
export function drawPool(
  questions: readonly QuestionModel[],
  size: number | null,
  seed: string,
  key: string,
  balanceDifficulty = false,
): PoolDraw {
  const wanted = size === null ? 0 : Math.floor(size);
  if (wanted <= 0 || wanted >= questions.length) {
    return {
      questions: [...questions],
      drawn: [],
      available: questions.length,
    };
  }
  const picked = balanceDifficulty
    ? balanced(questions, wanted, seed, key)
    : shuffleWith(questions, derivedRng(seed, `pool:${key}`)).slice(0, wanted);
  const ids = new Set(picked.map((question) => question.id));
  return {
    questions: questions.filter((question) => ids.has(question.id)),
    drawn: questions
      .filter((question) => ids.has(question.id))
      .map((question) => question.id),
    available: questions.length,
  };
}
