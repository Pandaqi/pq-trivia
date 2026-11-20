/**
 * The wizard's one buffer.
 *
 * Text is the source of truth. Every edit parses, changes attributes or a
 * block's own text, then writes bytes back into the same buffer. There is no
 * second model to keep in sync, which is why the wizard is cheap.
 *
 * Blocks are found by line span. A block runs from its first attribute to the
 * line before the next block starts, so a `#### Answers` block keeps its values.
 */

import type {
  AstAttribute,
  AstDocument,
  AstQuestion,
} from "../core/syntax/ast";
import { findAttribute, findHeaderKey } from "../core/syntax/attributeRegistry";
import type { Diagnostic, SourceLocation } from "../core/syntax/diagnostics";
import { parse } from "../core/syntax/parser";
import { format } from "../core/syntax/serialize";

export interface BlockSpan {
  /** First line, counting from one. */
  readonly start: number;
  /** Last line, inclusive. */
  readonly end: number;
}

export interface EditorDoc {
  readonly document: AstDocument;
  readonly diagnostics: readonly Diagnostic[];
  /** The header lines. Null when the file has no header. */
  readonly header: BlockSpan | null;
  /** One span per block, in file order. */
  readonly blocks: readonly BlockSpan[];
}

const HERE: SourceLocation = { file: "<wizard>", line: 1, column: 1 };
const BLANK = "";

export function editorLocation(): SourceLocation {
  return HERE;
}

export function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

function firstLine(question: AstQuestion): number {
  let line = Number.POSITIVE_INFINITY;
  for (const attribute of question.attributes) {
    line = Math.min(line, attribute.location.line);
  }
  return Number.isFinite(line) ? line : 1;
}

export function readText(text: string): EditorDoc {
  const parsed = parse(text);
  const count = splitLines(text).length;
  const starts = parsed.document.questions.map(firstLine);
  const blocks = starts.map((start, index) => ({
    start,
    end: (starts[index + 1] ?? count + 1) - 1,
  }));
  const first = starts[0];
  const headerEnd = first === undefined ? count : first - 1;
  const headerText = sliceLines(text, { start: 1, end: headerEnd });
  const hasHeader =
    parsed.document.header.length > 0 && headerText.trim().length > 0;
  return {
    document: parsed.document,
    diagnostics: parsed.diagnostics,
    header: hasHeader ? { start: 1, end: headerEnd } : null,
    blocks,
  };
}

export function sliceLines(text: string, span: BlockSpan): string {
  return splitLines(text)
    .slice(span.start - 1, span.end)
    .join("\n");
}

/** The header as written, or an empty string. */
export function headerText(text: string, doc: EditorDoc): string {
  return doc.header === null ? BLANK : sliceLines(text, doc.header).trim();
}

/** One block as written, comments and odd spacing included. */
export function blockTextAt(
  text: string,
  doc: EditorDoc,
  index: number,
): string {
  const span = doc.blocks[index];
  return span === undefined ? BLANK : sliceLines(text, span).trim();
}

export function blockTexts(text: string, doc: EditorDoc): string[] {
  return doc.blocks.map((span) => sliceLines(text, span).trim());
}

/**
 * One place where blank lines and trailing spaces get sorted out. Nothing else
 * in the wizard touches whitespace.
 */
export function tidy(text: string): string {
  const lines: string[] = [];
  for (const raw of splitLines(text)) {
    const line = raw.replace(/[ \t]+$/, BLANK);
    const previous = lines[lines.length - 1];
    if (line.length === 0 && (previous === undefined || previous === BLANK)) {
      continue;
    }
    lines.push(line);
  }
  while (lines[lines.length - 1] === BLANK) {
    lines.pop();
  }
  return `${lines.join("\n")}\n`;
}

export function valuesOf(
  attributes: readonly AstAttribute[],
  key: string,
): string[] {
  return attributes
    .filter((attribute) => attribute.key === key)
    .flatMap((attribute) => [...attribute.values]);
}

export function firstValue(
  attributes: readonly AstAttribute[],
  key: string,
): string | undefined {
  return valuesOf(attributes, key)[0];
}

function attributeLocation(
  attributes: readonly AstAttribute[],
  key: string,
): SourceLocation {
  return (
    attributes.find((attribute) => attribute.key === key)?.location ?? HERE
  );
}

function replaceAttribute(
  attributes: readonly AstAttribute[],
  key: string,
  values: readonly string[],
): AstAttribute[] {
  const kept = attributes.filter((attribute) => attribute.key !== key);
  if (values.length === 0) {
    return kept;
  }
  return [
    ...kept,
    {
      key,
      rawKey: key,
      values: [...values],
      location: attributeLocation(attributes, key),
    },
  ];
}

/** Set or clear a question attribute. Canonical keys only. */
export function setValues(
  attributes: readonly AstAttribute[],
  key: string,
  values: readonly string[],
): AstAttribute[] {
  const canonical = findAttribute(key)?.key ?? key;
  return replaceAttribute(attributes, canonical, values);
}

/** Header keys live in their own namespace: `Theme` is the theme, not a secret. */
export function setHeaderValues(
  header: readonly AstAttribute[],
  key: string,
  values: readonly string[],
): AstAttribute[] {
  const canonical = findHeaderKey(key) ?? key;
  return replaceAttribute(header, canonical, values);
}

export function blockAttributes(
  doc: EditorDoc,
  index: number,
): readonly AstAttribute[] {
  return doc.document.questions[index]?.attributes ?? [];
}

/** A single block in canonical form, ready to splice back in. */
export function formatBlock(
  attributes: readonly AstAttribute[],
  location: SourceLocation = HERE,
): string {
  const question: AstQuestion = { attributes, location };
  const text = format({ header: [], questions: [question] }, { header: false });
  return text.replace(/\n+$/, BLANK);
}

export function formatHeader(header: readonly AstAttribute[]): string {
  const text = format({ header, questions: [] });
  return text.replace(/\n+$/, BLANK);
}

function writtenLines(body: string): string[] {
  const trimmed = body.replace(/^\n+/, BLANK).replace(/\n+$/, BLANK);
  return trimmed.length === 0 ? [] : splitLines(trimmed);
}

/** Swap one block's lines for new text. An empty body removes the block. */
export function withBlockText(
  text: string,
  index: number,
  body: string,
): string {
  const doc = readText(text);
  const span = doc.blocks[index];
  if (span === undefined) {
    return text;
  }
  const lines = splitLines(text);
  const written = writtenLines(body);
  // One blank line between blocks. The span usually swallows the old one, so a
  // replaced block has to put it back.
  if (written.length > 0 && index < doc.blocks.length - 1) {
    written.push(BLANK);
  }
  lines.splice(span.start - 1, span.end - span.start + 1, ...written);
  return tidy(lines.join("\n"));
}

export function withHeaderText(text: string, body: string): string {
  const doc = readText(text);
  const lines = splitLines(text);
  const written = writtenLines(body);
  if (doc.header === null) {
    if (written.length === 0) {
      return tidy(text);
    }
    lines.splice(0, 0, ...written, BLANK);
    return tidy(lines.join("\n"));
  }
  lines.splice(
    doc.header.start - 1,
    doc.header.end - doc.header.start + 1,
    ...written,
  );
  const after = doc.header.start - 1 + written.length;
  if (written.length > 0 && after < lines.length) {
    lines.splice(after, 0, BLANK);
  }
  return tidy(lines.join("\n"));
}

/** Rebuild the file from block texts, in the order given. */
export function withBlocks(text: string, bodies: readonly string[]): string {
  const doc = readText(text);
  const head = headerText(text, doc);
  const parts = [head, ...bodies.map((body) => body.trim())].filter(
    (part) => part.length > 0,
  );
  return tidy(parts.join("\n\n"));
}
