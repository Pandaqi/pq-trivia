/** Shuffle helpers. Each concern gets its own stream, derived from the seed. */

import { Rng } from "./rng";

export function shuffleWith<T>(items: readonly T[], rng: Rng): T[] {
  return rng.shuffle(items);
}

export function derivedRng(seed: string, salt: string): Rng {
  return new Rng(`${seed}:${salt}`);
}
