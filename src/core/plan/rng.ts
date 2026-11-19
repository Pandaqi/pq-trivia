/**
 * Seedable randomness. Same seed, same quiz, every browser.
 *
 * mulberry32: 32 bits of state, good enough for shuffling questions, and it
 * fits in a tweet. No dependency.
 */

export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export class Rng {
  #state: number;

  constructor(seed: string | number = 0) {
    const state = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
    this.#state = state === 0 ? 0x9e3779b9 : state;
  }

  /** A float in [0, 1). */
  next(): number {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0;
    let value = this.#state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  int(maxExclusive: number): number {
    if (maxExclusive <= 1) {
      return 0;
    }
    return Math.floor(this.next() * maxExclusive);
  }

  /** Fisher-Yates. Returns a new array. */
  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = this.int(index + 1);
      const a = copy[index];
      const b = copy[swap];
      if (a === undefined || b === undefined) {
        continue;
      }
      copy[index] = b;
      copy[swap] = a;
    }
    return copy;
  }
}
