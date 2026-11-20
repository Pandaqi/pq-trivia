/**
 * What the slide list shows. One entry per block, plus the header.
 *
 * Slides are derived from the text on every change. Nothing is stored, so a
 * hand edit and a form edit produce the same list.
 */

import { inlineToPlainText, parseInline } from "../core/format/inline";
import type { Diagnostic } from "../core/syntax/diagnostics";
import type { AstAttribute } from "../core/syntax/ast";
import { firstValue } from "./text";
import type { EditorDoc } from "./text";

export enum SlideKind {
  Header = "header",
  Start = "start",
  Round = "round",
  Question = "question",
  End = "end",
}

export interface SlideInfo {
  /** -1 for the header, otherwise the block index. */
  readonly index: number;
  readonly kind: SlideKind;
  readonly label: string;
  readonly type: string;
  readonly round: string | null;
  readonly problems: readonly Diagnostic[];
}

export const HEADER_INDEX = -1;

const LABEL_LIMIT = 64;
const ELLIPSIS = "…";

const KIND_BY_TYPE: Readonly<Record<string, SlideKind>> = {
  start: SlideKind.Start,
  end: SlideKind.End,
  section: SlideKind.Round,
};

function plain(text: string): string {
  const value = inlineToPlainText(parseInline(text).nodes).trim();
  return value.length > LABEL_LIMIT
    ? `${value.slice(0, LABEL_LIMIT - 1)}${ELLIPSIS}`
    : value;
}

function titleOf(doc: EditorDoc): string {
  const header = doc.document.header;
  return plain(firstValue(header, "Title") ?? firstValue(header, "Quiz") ?? "");
}

function problemsIn(doc: EditorDoc, index: number): Diagnostic[] {
  if (index < 0) {
    const end = doc.header?.end ?? 0;
    return doc.diagnostics.filter(
      (diagnostic) =>
        diagnostic.location === undefined ||
        (diagnostic.location.line >= 1 && diagnostic.location.line <= end),
    );
  }
  const span = doc.blocks[index];
  if (span === undefined) {
    return [];
  }
  return doc.diagnostics.filter(
    (diagnostic) =>
      diagnostic.location !== undefined &&
      diagnostic.location.line >= span.start &&
      diagnostic.location.line <= span.end,
  );
}

function questionText(attributes: readonly AstAttribute[]): string {
  return plain(firstValue(attributes, "Question") ?? "");
}

export function listSlides(doc: EditorDoc): SlideInfo[] {
  const slides: SlideInfo[] = [
    {
      index: HEADER_INDEX,
      kind: SlideKind.Header,
      label: titleOf(doc) || "Quiz settings",
      type: "header",
      round: null,
      problems: problemsIn(doc, HEADER_INDEX),
    },
  ];
  let round: string | null = null;

  doc.document.questions.forEach((question, index) => {
    const type = (
      firstValue(question.attributes, "Type") ?? "open"
    ).toLowerCase();
    const kind = KIND_BY_TYPE[type] ?? SlideKind.Question;
    const text = questionText(question.attributes) || "(no text)";
    if (kind === SlideKind.Round) {
      round = text;
    }
    slides.push({
      index,
      kind,
      label: text,
      type,
      round: kind === SlideKind.Round ? null : round,
      problems: problemsIn(doc, index),
    });
  });

  return slides;
}

export function slideAt(
  slides: readonly SlideInfo[],
  index: number,
): SlideInfo | undefined {
  return slides.find((slide) => slide.index === index);
}

/** How many problems sit on this slide, for the badge. */
export function problemCount(slide: SlideInfo): number {
  return slide.problems.filter(
    (diagnostic) =>
      diagnostic.severity === "error" || diagnostic.severity === "warning",
  ).length;
}
