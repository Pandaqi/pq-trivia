/**
 * Multi-part questions, and the answer groups they share with cloze.
 *
 * `Parts => open: Band: 2 | number: Year` is one part per `|`. The kind says
 * how it is graded, the label is what the player sees, and the optional number
 * is that part's share of the points. Without a number the score is split
 * evenly, which is what most authors want.
 */

export enum PartKind {
  Open = "open",
  Number = "number",
}

export interface QuestionPart {
  readonly kind: PartKind;
  readonly label: string;
  /** Null means "an even share of the question's score". */
  readonly points: number | null;
}

export const PART_KINDS: readonly PartKind[] = [PartKind.Open, PartKind.Number];

/** `open: Band: 2`. The label may contain colons; the number may not. */
export function parsePart(text: string): QuestionPart | null {
  const pieces = text.split(":").map((piece) => piece.trim());
  const head = pieces[0] ?? "";
  const kind = PART_KINDS.includes(head as PartKind)
    ? (head as PartKind)
    : PartKind.Open;
  const rest = PART_KINDS.includes(head as PartKind) ? pieces.slice(1) : pieces;
  const tail = rest[rest.length - 1];
  const points = rest.length > 1 && tail !== undefined ? Number(tail) : NaN;
  const withPoints = Number.isFinite(points);
  const label = (withPoints ? rest.slice(0, -1) : rest).join(":").trim();
  if (label.length === 0) {
    return null;
  }
  return {
    kind,
    label,
    points: withPoints ? Math.max(0, points) : null,
  };
}

export function parseParts(values: readonly string[]): QuestionPart[] {
  const parts: QuestionPart[] = [];
  for (const value of values) {
    for (const piece of value.split("|")) {
      const part = parsePart(piece.trim());
      if (part !== null) {
        parts.push(part);
      }
    }
  }
  return parts;
}

/**
 * `Answers => 1969|1969 AD || Apollo 11` groups answers per blank or part.
 * The parser leaves an empty entry where `||` sits, and that is the separator.
 */
export function groupedAnswers(texts: readonly string[]): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];
  let grouped = false;
  for (const text of texts) {
    if (text.trim().length === 0) {
      grouped = true;
      if (current.length > 0) {
        groups.push(current);
        current = [];
      }
      continue;
    }
    current.push(text);
  }
  if (current.length > 0) {
    groups.push(current);
  }
  return grouped ? groups : texts.map((text) => [text]);
}

/** One accepted-answer group per part, with a sane fallback. */
export function groupsForParts(
  parts: readonly QuestionPart[],
  answers: readonly string[],
): string[][] {
  if (parts.length === 0) {
    return [];
  }
  const groups = groupedAnswers(answers);
  if (groups.length === parts.length) {
    return groups;
  }
  if (groups.length === 1 && parts.length === 1) {
    return groups;
  }
  return parts.map((_, index) => {
    const own = answers[index];
    return own === undefined ? [] : [own];
  });
}

/** Explicit part points, or an even share of the question's score. */
export function partPoints(
  parts: readonly QuestionPart[],
  score: number,
): number[] {
  const declared = parts.every((part) => part.points !== null);
  if (declared && parts.length > 0) {
    return parts.map((part) => part.points ?? 0);
  }
  const share = Math.round((score / Math.max(parts.length, 1)) * 100) / 100;
  return parts.map(() => share);
}
