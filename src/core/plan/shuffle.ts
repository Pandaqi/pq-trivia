/** Shuffle helpers. Each concern gets its own stream, derived from the seed. */

import { Rng } from "./rng";

export function shuffleWith<T>(items: readonly T[], rng: Rng): T[] {
  return rng.shuffle(items);
}

/**
 * A shuffle that never hands back the order it was given.
 *
 * For sort and match the authored order *is* the answer. One seed in six used
 * to give it back untouched, which made the question read as already solved.
 */
export function shuffleAway<T>(items: readonly T[], rng: Rng): T[] {
  const out = rng.shuffle(items);
  if (items.length < 2) {
    return out;
  }
  const same = out.every((item, index) => item === items[index]);
  if (!same) {
    return out;
  }
  const first = out[0] as T;
  const second = out[1] as T;
  out[0] = second;
  out[1] = first;
  return out;
}

export function derivedRng(seed: string, salt: string): Rng {
  return new Rng(`${seed}:${salt}`);
}
