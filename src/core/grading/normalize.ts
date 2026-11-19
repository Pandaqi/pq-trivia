/**
 * Text normalization for grading.
 *
 * One place that decides when "Café" and "cafe" are the same answer. The
 * browser and the CLI both call this. No locale tricks, no hidden state.
 */

import { GradingMode } from "../model/question";

const ARTICLES = new Set([
  "the",
  "a",
  "an",
  "de",
  "het",
  "een",
  "der",
  "die",
  "das",
]);

/** NFKD, drop combining marks, rebuild. `café` becomes `cafe`. */
export function stripDiacritics(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}+/gu, "");
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Punctuation at the edges only. "1989." matches "1989". */
export function stripEdgePunctuation(text: string): string {
  return text
    .replace(/^[\s.,;:!?'"()[\]{}]+/, "")
    .replace(/[\s.,;:!?'"()[\]{}]+$/, "");
}

export function stripAllPunctuation(text: string): string {
  return text
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Drop leading articles. Used only by fuzzy grading. */
export function stripArticles(text: string): string {
  const words = text.split(" ");
  const first = words[0]?.toLowerCase() ?? "";
  return ARTICLES.has(first) ? words.slice(1).join(" ") : text;
}

/**
 * `exact` keeps the author's letters, only folding whitespace.
 * `normalized` folds case and diacritics. `fuzzy` also drops articles and
 * punctuation, because a player typing quickly deserves a little slack.
 */
export function normalizeText(text: string, mode: GradingMode): string {
  const clean = collapseWhitespace(text.normalize("NFC"));
  if (mode === GradingMode.Exact) {
    return clean;
  }
  const folded = collapseWhitespace(stripDiacritics(clean).toLowerCase());
  if (mode === GradingMode.Normalized) {
    return stripEdgePunctuation(folded);
  }
  return stripArticles(stripAllPunctuation(folded));
}

/** `1,5`, `1.5` and `1 500` all parse. A stray unit at the end is ignored. */
export function parseNumber(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/[^\d,.\-+eE]/g, "")
    .replace(/,(?=\d{3}\b)/g, "")
    .replace(",", ".");
  if (cleaned.length === 0) {
    return null;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function editDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  if (short.length === 0) {
    return long.length;
  }
  let previous = Array.from({ length: short.length + 1 }, (_, index) => index);
  for (let row = 1; row <= long.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= short.length; column += 1) {
      const swap =
        (previous[column - 1] ?? 0) +
        (long.charAt(row - 1) === short.charAt(column - 1) ? 0 : 1);
      const insert = (current[column - 1] ?? 0) + 1;
      const remove = (previous[column] ?? 0) + 1;
      current[column] = Math.min(insert, remove, swap);
    }
    previous = current;
  }
  return previous[short.length] ?? 0;
}

/**
 * One typo is fine in a short word, two in a long one. Below three characters
 * nothing is allowed: "a" should not match "i".
 */
export function fuzzyLimit(expected: string, override: number | null): number {
  if (override !== null) {
    return Math.max(0, override);
  }
  if (expected.length < 3) {
    return 0;
  }
  return expected.length <= 7 ? 1 : 2;
}

export interface MatchOptions {
  readonly mode: GradingMode;
  readonly fuzzyDistance: number | null;
  readonly reject: readonly string[];
}

export interface TextMatch {
  readonly correct: boolean;
  readonly normalizedGiven: string;
  readonly normalizedCorrect: string;
}

/** Compare one given string against one or more accepted answers. */
export function matchText(
  given: string,
  accepted: readonly string[],
  options: MatchOptions,
): TextMatch {
  const mode = options.mode;
  const normalizedGiven = normalizeText(given, mode);
  const rejected = new Set(
    options.reject.map((value) => normalizeText(value, mode)),
  );
  if (normalizedGiven.length === 0) {
    return {
      correct: false,
      normalizedGiven,
      normalizedCorrect: normalizeText(accepted[0] ?? "", mode),
    };
  }
  let correct = false;
  for (const candidate of accepted) {
    const normalized = normalizeText(candidate, mode);
    if (normalized === normalizedGiven) {
      correct = true;
      break;
    }
    if (
      mode === GradingMode.Fuzzy &&
      !rejected.has(normalizedGiven) &&
      normalized.length > 0 &&
      editDistance(normalized, normalizedGiven) <=
        fuzzyLimit(normalized, options.fuzzyDistance)
    ) {
      correct = true;
      break;
    }
  }
  if (rejected.has(normalizedGiven)) {
    correct = false;
  }
  return {
    correct,
    normalizedGiven,
    normalizedCorrect: normalizeText(accepted.join(" / "), mode),
  };
}
