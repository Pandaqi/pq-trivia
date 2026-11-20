/**
 * Heading migration. V2-style files use one hash less than V3:
 *
 *   # Round        ->  ## Round
 *   ## Question    ->  ### Question
 *   ### Answers    ->  #### Answers
 *
 * The parser cannot guess which scheme a file meant: `#` is either a round or
 * the quiz title. This module reads the surrounding lines and decides, so the
 * CLI can convert old content instead of quietly turning its first round into
 * a title.
 */

/** Which heading dialect a file speaks. `ambiguous` means: do not guess. */
export enum HeadingStyle {
  Legacy = "legacy",
  Current = "current",
  Ambiguous = "ambiguous",
}

const HEADING = /^(#{1,4})\s+(.+?)\s*$/;
const KEY_LINE = /^[A-Za-z][\w-]*\s*=>/;
const NEXT_HEADING = /^(#{1,4})\s+/;
const TITLE_HEADER = /^(?:Title|Quiz)\s*=>/im;
const QUIZ_KEY =
  /^(?:Question|Answers?|Correct|Type|Range|Choice|Media|Hints?|Explanation|Points|Score|Timer|Category|Author)\s*=>/im;
const QUIZ_BLOCK =
  /^#{1,4}\s+(?:Answers?|Correct|Media|Hints?|Explanation|Comments?|Sources?)\s*$/im;
const INCLUDE_LINE = /^#include\b/im;
const FENCE = /^\s*(?:```|~~~)/;

/** Keys that were block headings in V2 and are still block headings in V3. */
const BLOCK_KEYS: ReadonlySet<string> = new Set([
  "answers",
  "answer",
  "correct",
  "media",
  "hints",
  "hint",
  "sources",
  "source",
  "comments",
  "comment",
  "alsoaccept",
  "reject",
  "print",
  "credits",
  "class",
  "background",
  "colorscheme",
  "font",
  "label",
  "stylesheet",
  "alt",
]);

interface DialectScore {
  readonly legacy: number;
  readonly current: number;
}

/** What one heading says about the file's dialect. */
function scoreHeading(
  heading: HeadingLine,
  next: string,
  nextIsKey: boolean,
  nextLevel: number,
  titleValue: string | undefined,
  hasTitleHeader: boolean,
): DialectScore {
  if (heading.level === 1) {
    // A `#` line that repeats the title header is a V3 title. Any other `#`
    // line next to a title header is a V2 round.
    if (
      titleValue !== undefined &&
      heading.text.trim().toLowerCase() === titleValue
    ) {
      return { legacy: 0, current: 3 };
    }
    return hasTitleHeader
      ? { legacy: 3, current: 0 }
      : { legacy: 0, current: 0 };
  }
  if (heading.level === 2) {
    if (/^Question\s*=>/i.test(next)) {
      return { legacy: 0, current: 2 };
    }
    if (nextLevel === 3 || nextLevel === 4) {
      return { legacy: 0, current: 1 };
    }
    return nextIsKey ? { legacy: 2, current: 0 } : { legacy: 0, current: 0 };
  }
  // Level 3. Old files use it for blocks; new files use it for questions.
  if (isBlockKey(heading.text)) {
    return { legacy: 3, current: 0 };
  }
  if (nextIsKey || nextLevel === 4) {
    return { legacy: 0, current: 2 };
  }
  return { legacy: 1, current: 0 };
}

interface HeadingLine {
  readonly level: number;
  readonly text: string;
  /** The next line that is not blank and not a comment. */
  readonly next: string | null;
}

function isBlockKey(text: string): boolean {
  const first = text.toLowerCase().split(/\s+/, 1)[0] ?? "";
  return BLOCK_KEYS.has(first);
}

function headingsOf(text: string): HeadingLine[] {
  const lines = text.split(/\r?\n/);
  const headings: HeadingLine[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = HEADING.exec((lines[index] ?? "").trim());
    if (match === null) {
      continue;
    }
    let next: string | null = null;
    for (let after = index + 1; after < lines.length; after += 1) {
      const candidate = (lines[after] ?? "").trim();
      if (candidate.length === 0 || candidate.startsWith("//")) {
        continue;
      }
      next = candidate;
      break;
    }
    headings.push({
      level: match[1]?.length ?? 0,
      text: (match[2] ?? "").trim(),
      next,
    });
  }
  return headings;
}

/**
 * Decide which ladder a file uses. Level 4 is proof of the new scheme. A
 * level-3 block key, or a level-2 heading followed by question keys, is proof
 * of the old one. A file with only a single `#` heading is genuinely ambiguous:
 * it is either a V2 round or a V3 title.
 */
/** Lines outside fenced code, where examples and prose live. */
function withoutFences(text: string): string {
  let fenced = false;
  const lines: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (FENCE.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (!fenced) {
      lines.push(line);
    }
  }
  return lines.join("\n");
}

/**
 * A cheap smell test for the CLI. A README with headings is not a quiz, and
 * `migrate` must not shift its headings. Keys and blocks inside code fences
 * are examples, not content.
 */
export function looksLikeQuiz(text: string): boolean {
  const body = withoutFences(text);
  return (
    QUIZ_KEY.test(body) || QUIZ_BLOCK.test(body) || INCLUDE_LINE.test(body)
  );
}

export function detectHeadingStyle(text: string): HeadingStyle {
  const headings = headingsOf(text);
  if (headings.length === 0 || headings.some((heading) => heading.level >= 4)) {
    return HeadingStyle.Current;
  }

  const hasTitleHeader = TITLE_HEADER.test(text);
  const titleValue = /^(?:Title|Quiz)\s*=>\s*(.+)$/im
    .exec(text)?.[1]
    ?.trim()
    .toLowerCase();
  let legacy = 0;
  let current = 0;

  for (const heading of headings) {
    const next = heading.next ?? "";
    const nextLevel = NEXT_HEADING.exec(next)?.[1]?.length ?? 0;
    const score = scoreHeading(
      heading,
      next,
      KEY_LINE.test(next),
      nextLevel,
      titleValue,
      hasTitleHeader,
    );
    legacy += score.legacy;
    current += score.current;
  }

  if (legacy === 0 && current === 0) {
    return HeadingStyle.Ambiguous;
  }
  return legacy > current ? HeadingStyle.Legacy : HeadingStyle.Current;
}

/**
 * Shift every 1-3 hash heading down one level. Level 4 is left alone. Current
 * files come back untouched unless `force` says the headings are old.
 */
export function migrateHeadings(
  text: string,
  options: { readonly force?: boolean } = {},
): string {
  if (
    options.force !== true &&
    detectHeadingStyle(text) !== HeadingStyle.Legacy
  ) {
    return text;
  }
  const bom = text.startsWith("\uFEFF") ? "\uFEFF" : "";
  const body = bom.length > 0 ? text.slice(1) : text;
  return `${bom}${body.replace(/^(#{1,3})(\s+)/gm, "#$1$2")}`;
}
