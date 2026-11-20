/**
 * Near duplicates: the same question twice, worded differently.
 *
 * A warning, never an error. Two questions about the same thing can both be
 * good; the author knows, and this check only taps them on the shoulder.
 *
 * `check:content` runs it. Cheap enough for a 500-question bank: one token set
 * per question, then a pair comparison that stops at the first likely hit.
 */

import { inlineToPlainText, parseInline } from "../format/inline";
import type { QuestionModel } from "../model/question";
import {
  DiagnosticCodes,
  syntaxWarning,
  type Diagnostic,
} from "../syntax/diagnostics";

/** Both questions are this similar, or they are not a pair. */
export const DUPLICATE_THRESHOLD = 0.8;
/** Short answers ("1969") repeat themselves without being duplicates. */
export const DUPLICATE_MIN_WORDS = 4;

const PUNCTUATION = /[^\p{L}\p{N}\s]+/gu;
const SPACES = /\s+/g;

function wordsOf(text: string): Set<string> {
  const plain = inlineToPlainText(parseInline(text).nodes)
    .toLowerCase()
    .replace(PUNCTUATION, " ")
    .replace(SPACES, " ")
    .trim();
  return new Set(plain.split(" ").filter((word) => word.length > 0));
}

/** Dice over shared words. 1 is identical, 0 shares nothing. */
export function similarity(
  a: ReadonlySet<string>,
  b: ReadonlySet<string>,
): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const word of a) {
    if (b.has(word)) {
      shared += 1;
    }
  }
  return (2 * shared) / (a.size + b.size);
}

interface Entry {
  readonly id: string;
  readonly words: Set<string>;
  readonly location: QuestionModel["location"];
  readonly title: string;
}

export interface DuplicateOptions {
  readonly threshold?: number;
  readonly minWords?: number;
}

/** One warning per pair the author should look at. */
export function nearDuplicates(
  questions: readonly QuestionModel[],
  options: DuplicateOptions = {},
): Diagnostic[] {
  const threshold = options.threshold ?? DUPLICATE_THRESHOLD;
  const minWords = options.minWords ?? DUPLICATE_MIN_WORDS;
  const entries: Entry[] = questions
    .map((question) => ({
      id: question.id,
      words: wordsOf(question.text.map((value) => value.text).join(" ")),
      location: question.location,
      title: question.text[0]?.text ?? question.id,
    }))
    .filter((entry) => entry.words.size >= minWords);

  const diagnostics: Diagnostic[] = [];
  for (let a = 0; a < entries.length; a += 1) {
    for (let b = a + 1; b < entries.length; b += 1) {
      const left = entries[a];
      const right = entries[b];
      if (left === undefined || right === undefined) {
        continue;
      }
      const score = similarity(left.words, right.words);
      if (score < threshold) {
        continue;
      }
      diagnostics.push(
        syntaxWarning(
          DiagnosticCodes.NearDuplicate,
          `"${left.title}" and "${right.title}" look like the same question (${Math.round(score * 100)}% alike).`,
          {
            location: right.location,
            suggestion: `If they are, keep one. If not, change the wording a little. Pair: ${left.id} / ${right.id}.`,
          },
        ),
      );
    }
  }
  return diagnostics;
}
