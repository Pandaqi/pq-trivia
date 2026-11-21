/**
 * Diagnostic copy is keyed by the English template, so a problem always finds
 * its translation. One helper, every language.
 */

import type { TranslationTable } from "./types";

export type DiagnosticPair = readonly [english: string, copy: string];

/** One line per template: the English sentence and its translation. */
export function diagnosticPairs(
  pairs: readonly DiagnosticPair[],
): TranslationTable {
  return Object.fromEntries(
    pairs.map(([english, copy]) => [`diag:${english}`, copy]),
  );
}

/** English uses its own sentence as the key and the value. */
export function sameDiagnosticCopy(texts: readonly string[]): TranslationTable {
  return Object.fromEntries(texts.map((text) => [`diag:${text}`, text]));
}
