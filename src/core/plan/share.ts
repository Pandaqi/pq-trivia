/**
 * A shared link carries the seed and the order. Never an answer.
 *
 * Pure on purpose: core has no `location` and no `URLSearchParams`. The browser
 * hands in `location.search`, gets a query string back, and builds the URL.
 */

export const SHARE_SEED = "seed";
export const SHARE_SHUFFLE = "shuffle";
export const SHARE_ROUNDS = "rounds";

export interface ShareOrder {
  readonly seed: string;
  readonly shuffleQuestions: boolean;
  readonly shuffleRounds: boolean;
}

const TRUE_VALUES: ReadonlySet<string> = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES: ReadonlySet<string> = new Set(["0", "false", "no", "off"]);

function booleanOf(raw: string): boolean | undefined {
  const value = raw.trim().toLowerCase();
  if (TRUE_VALUES.has(value)) {
    return true;
  }
  if (FALSE_VALUES.has(value)) {
    return false;
  }
  return undefined;
}

/** `seed=music-night&shuffle=1`, with no empty parts. */
export function shareQuery(order: Partial<ShareOrder>): string {
  const parts: string[] = [];
  const seed = order.seed?.trim() ?? "";
  if (seed.length > 0) {
    parts.push(`${SHARE_SEED}=${encodeURIComponent(seed)}`);
  }
  if (order.shuffleQuestions === true) {
    parts.push(`${SHARE_SHUFFLE}=1`);
  }
  if (order.shuffleRounds === true) {
    parts.push(`${SHARE_ROUNDS}=1`);
  }
  return parts.join("&");
}

function decode(raw: string): string {
  try {
    return decodeURIComponent(raw.replaceAll("+", " "));
  } catch {
    return raw;
  }
}

/** Only what the search actually says. An unknown or broken value is skipped. */
export function orderFromQuery(search: string): Partial<ShareOrder> {
  const body = search.startsWith("?") ? search.slice(1) : search;
  const order: {
    seed?: string;
    shuffleQuestions?: boolean;
    shuffleRounds?: boolean;
  } = {};
  for (const pair of body.split("&")) {
    if (pair.length === 0) {
      continue;
    }
    const equals = pair.indexOf("=");
    const key = (equals < 0 ? pair : pair.slice(0, equals)).trim();
    const value = equals < 0 ? "" : decode(pair.slice(equals + 1));
    if (key === SHARE_SEED && value.trim().length > 0) {
      order.seed = value.trim();
      continue;
    }
    if (key === SHARE_SHUFFLE) {
      const parsed = booleanOf(value);
      if (parsed !== undefined) {
        order.shuffleQuestions = parsed;
      }
      continue;
    }
    if (key === SHARE_ROUNDS) {
      const parsed = booleanOf(value);
      if (parsed !== undefined) {
        order.shuffleRounds = parsed;
      }
    }
  }
  return order;
}
