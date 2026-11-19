/**
 * The inline parser.
 *
 * Walks the string once. Nested content is parsed by the same code, so the
 * output is a tree, not a pile of string replacements.
 */

import {
  DiagnosticCodes,
  syntaxWarning,
  type Diagnostic,
} from "../syntax/diagnostics";
import { InlineKind, type EmphasisKind, type InlineNode } from "./inlineAst";

import { SAFE_CLASS, isSafeHref, sanitizeStyle } from "./safe";

const EMPHASIS_MARKERS: ReadonlyArray<readonly [string, EmphasisKind]> = [
  ["**", InlineKind.Strong],
  ["__", InlineKind.Underline],
  ["~~", InlineKind.Strike],
];

const BRACKET_TAGS: ReadonlyMap<string, EmphasisKind> = new Map([
  ["mark", InlineKind.Mark],
  ["kbd", InlineKind.Kbd],
  ["fn", InlineKind.Fn],
  ["spoiler", InlineKind.Spoiler],
  ["sup", InlineKind.Sup],
  ["sub", InlineKind.Sub],
]);

const STYLE_TAGS: ReadonlySet<string> = new Set([
  "class",
  "style",
  "color",
  "size",
]);

function unquote(raw: string): string {
  const value = raw.trim();
  const first = value.charAt(0);
  if (
    (first === '"' || first === "'") &&
    value.endsWith(first) &&
    value.length >= 2
  ) {
    return value.slice(1, -1).replaceAll(`\\${first}`, first);
  }
  return value;
}

class InlineParser {
  readonly #text: string;
  readonly #diagnostics: Diagnostic[] = [];
  #index = 0;

  constructor(text: string) {
    this.#text = text;
  }

  get diagnostics(): readonly Diagnostic[] {
    return this.#diagnostics;
  }

  parse(): InlineNode[] {
    return this.#parseUntil(null);
  }

  #peek(offset = 0): string {
    return this.#text.charAt(this.#index + offset);
  }

  #startsWith(value: string): boolean {
    return this.#text.startsWith(value, this.#index);
  }

  #pushText(nodes: InlineNode[], text: string): void {
    if (text.length === 0) {
      return;
    }
    const last = nodes[nodes.length - 1];
    if (last && last.kind === InlineKind.Text) {
      nodes[nodes.length - 1] = {
        kind: InlineKind.Text,
        text: last.text + text,
      };
      return;
    }
    nodes.push({ kind: InlineKind.Text, text });
  }

  #parseUntil(stop: string | null): InlineNode[] {
    const nodes: InlineNode[] = [];
    while (this.#index < this.#text.length) {
      if (stop !== null && this.#startsWith(stop)) {
        this.#index += stop.length;
        return nodes;
      }
      const handled = this.#parseOne(nodes, stop);
      if (handled) {
        continue;
      }
      this.#pushText(nodes, this.#peek());
      this.#index += 1;
    }

    if (stop !== null) {
      this.#diagnostics.push(
        syntaxWarning(
          DiagnosticCodes.InvalidInline,
          `Formatting marker ${stop} was never closed.`,
          { suggestion: `Close it, or write \\${stop} for literal text.` },
        ),
      );
    }
    return nodes;
  }

  /** One character or construct. Returns false when it is plain text. */
  #parseOne(nodes: InlineNode[], stop: string | null): boolean {
    const char = this.#peek();

    if (char === "\\" && this.#index + 1 < this.#text.length) {
      this.#pushText(nodes, this.#peek(1));
      this.#index += 2;
      return true;
    }

    const emphasis = this.#tryEmphasis(stop);
    if (emphasis !== null) {
      nodes.push(emphasis);
      return true;
    }

    if (char === "`" && this.#tryFence(nodes)) {
      return true;
    }

    if (char === "`" && this.#tryCode(nodes)) {
      return true;
    }

    if (
      (char === "^" || char === "_") &&
      this.#peek(1) === "[" &&
      this.#trySuperSub(nodes)
    ) {
      return true;
    }

    if (char === "!" && this.#peek(1) === "[") {
      const image = this.#tryImage();
      if (image !== null) {
        nodes.push(image);
        return true;
      }
    }

    if (char === "[") {
      const bracket = this.#tryBracket();
      if (bracket !== null) {
        nodes.push(bracket);
        return true;
      }
    }

    if (char === "\n") {
      nodes.push({ kind: InlineKind.Break });
      this.#index += 1;
      return true;
    }

    return false;
  }

  /** ```js, a newline, the code, a newline, ```. Language is optional. */
  #tryFence(nodes: InlineNode[]): boolean {
    if (!this.#startsWith("```")) {
      return false;
    }
    let cursor = this.#index + 3;
    let language = "";
    while (cursor < this.#text.length) {
      const char = this.#text.charAt(cursor);
      if (char === "\n") {
        break;
      }
      if (char === "`") {
        return false;
      }
      language += char;
      cursor += 1;
    }
    if (this.#text.charAt(cursor) === "\n") {
      cursor += 1;
    }
    const close = this.#text.indexOf("```", cursor);
    if (close < 0) {
      this.#diagnostics.push(
        syntaxWarning(
          DiagnosticCodes.InvalidInline,
          "A code fence was never closed.",
          { suggestion: "Close it with ```." },
        ),
      );
      return false;
    }
    const code = this.#text.slice(cursor, close).replace(/\n$/, "");
    nodes.push({
      kind: InlineKind.CodeBlock,
      code,
      language: language.trim().toLowerCase(),
    });
    this.#index = close + 3;
    return true;
  }

  #tryCode(nodes: InlineNode[]): boolean {
    const close = this.#find("`", 1);
    if (close < 0) {
      return false;
    }
    nodes.push({
      kind: InlineKind.Code,
      text: this.#text.slice(this.#index + 1, close),
    });
    this.#index = close + 1;
    return true;
  }

  #trySuperSub(nodes: InlineNode[]): boolean {
    const close = this.#find("]", 2);
    if (close < 0) {
      return false;
    }
    const inner = this.#text.slice(this.#index + 2, close);
    nodes.push({
      kind: this.#peek() === "^" ? InlineKind.Sup : InlineKind.Sub,
      children: parseOnce(inner).nodes,
    });
    this.#index = close + 1;
    return true;
  }

  #tryEmphasis(stop: string | null): InlineNode | null {
    for (const [marker, kind] of EMPHASIS_MARKERS) {
      if (!this.#startsWith(marker) || stop === marker) {
        continue;
      }
      const close = this.#find(marker, marker.length);
      if (close < 0) {
        continue;
      }
      const inner = this.#text.slice(this.#index + marker.length, close);
      this.#index = close + marker.length;
      return { kind, children: parseOnce(inner).nodes };
    }

    const isSingleUnderscore =
      stop !== "_" &&
      this.#peek() === "_" &&
      this.#peek(1) !== "[" &&
      this.#peek(1) !== "_";
    if (isSingleUnderscore) {
      const close = this.#find("_", 1);
      if (close < 0) {
        return null;
      }
      const inner = this.#text.slice(this.#index + 1, close);
      this.#index = close + 1;
      return { kind: InlineKind.Em, children: parseOnce(inner).nodes };
    }

    // V2 wrote strike-through with one tilde. Keep both spellings.
    const isSingleTilde =
      stop !== "~" && this.#peek() === "~" && this.#peek(1) !== "~";
    if (!isSingleTilde) {
      return null;
    }
    const close = this.#find("~", 2);
    if (close < 0) {
      return null;
    }
    const inner = this.#text.slice(this.#index + 1, close);
    this.#index = close + 1;
    return { kind: InlineKind.Strike, children: parseOnce(inner).nodes };
  }

  #findClosingParen(openIndex: number): number {
    let depth = 1;
    for (let cursor = openIndex + 1; cursor < this.#text.length; cursor += 1) {
      const char = this.#text.charAt(cursor);
      if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          return cursor;
        }
      }
    }
    return -1;
  }

  #find(marker: string, fromOffset: number): number {
    let cursor = this.#index + fromOffset;
    while (cursor < this.#text.length) {
      const char = this.#text.charAt(cursor);
      if (char === "\\") {
        cursor += 2;
        continue;
      }
      if (this.#text.startsWith(marker, cursor)) {
        return cursor;
      }
      cursor += 1;
    }
    return -1;
  }

  /** `![alt](path)`. Local paths are fine; dangerous protocols are not. */
  #tryImage(): InlineNode | null {
    const start = this.#index;
    const close = this.#text.indexOf("]", start + 2);
    if (close < 0 || this.#text.charAt(close + 1) !== "(") {
      return null;
    }
    const sourceEnd = this.#findClosingParen(close + 1);
    if (sourceEnd < 0) {
      return null;
    }
    const src = this.#text.slice(close + 2, sourceEnd).trim();
    if (src.length === 0) {
      return null;
    }
    this.#index = sourceEnd + 1;
    if (!isSafeHref(src)) {
      this.#diagnostics.push(
        syntaxWarning(
          DiagnosticCodes.UnsafeLink,
          `Image source "${src}" is not allowed.`,
          { suggestion: "Use a local file, http, https or a #fragment." },
        ),
      );
      return null;
    }
    return {
      kind: InlineKind.Image,
      src,
      alt: this.#text.slice(start + 2, close),
    };
  }

  #tryBracket(): InlineNode | null {
    const start = this.#index;
    const close = this.#text.indexOf("]", start + 1);
    if (close < 0) {
      return null;
    }
    const head = this.#text.slice(start + 1, close);

    if (head === "blank") {
      this.#index = close + 1;
      return { kind: InlineKind.Blank };
    }

    const link = this.#tryLink(head, close);
    if (link !== null) {
      return link;
    }

    return this.#tryPairedTag(head, close);
  }

  #tryLink(head: string, close: number): InlineNode | null {
    if (this.#text.charAt(close + 1) !== "(") {
      return null;
    }
    const hrefEnd = this.#findClosingParen(close + 1);
    if (hrefEnd < 0) {
      return null;
    }
    const href = this.#text.slice(close + 2, hrefEnd).trim();
    this.#index = hrefEnd + 1;
    if (!isSafeHref(href)) {
      this.#diagnostics.push(
        syntaxWarning(
          DiagnosticCodes.UnsafeLink,
          `Link target "${href}" is not allowed.`,
          {
            suggestion: "Use http, https, mailto, tel or #anchor.",
          },
        ),
      );
      return { kind: InlineKind.Text, text: head };
    }
    return { kind: InlineKind.Link, href, children: parseOnce(head).nodes };
  }

  #tryPairedTag(head: string, close: number): InlineNode | null {
    const equals = head.indexOf("=");
    const rawTag = (equals < 0 ? head : head.slice(0, equals))
      .trim()
      .toLowerCase();
    const rawValue = equals < 0 ? "" : unquote(head.slice(equals + 1));
    const pairedKind = BRACKET_TAGS.get(rawTag);
    const isStyleTag = STYLE_TAGS.has(rawTag);
    if (pairedKind === undefined && !isStyleTag && rawTag !== "abbr") {
      return null;
    }

    const end = this.#text.indexOf(`[/${rawTag}]`, close + 1);
    if (end < 0) {
      return null;
    }
    const inner = this.#text.slice(close + 1, end);
    this.#index = end + rawTag.length + 3;

    if (rawTag === "abbr") {
      return {
        kind: InlineKind.Abbr,
        title: rawValue,
        children: parseOnce(inner).nodes,
      };
    }
    if (pairedKind !== undefined) {
      return { kind: pairedKind, children: parseOnce(inner).nodes };
    }

    const attributes = this.#buildAttributes(rawTag, rawValue);
    if (attributes === null) {
      return { kind: InlineKind.Text, text: inner };
    }
    return {
      kind: InlineKind.Span,
      attributes,
      children: parseOnce(inner).nodes,
    };
  }

  #buildAttributes(tag: string, value: string): Record<string, string> | null {
    if (tag === "class") {
      if (!SAFE_CLASS.test(value)) {
        this.#diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.InvalidInline,
            `Class name "${value}" is not allowed.`,
            {
              suggestion:
                "Use letters, numbers and dashes, starting with a letter.",
            },
          ),
        );
        return null;
      }
      return { class: value };
    }

    if (tag === "style") {
      const { style, dropped } = sanitizeStyle(value);
      for (const item of dropped) {
        this.#diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.InvalidStyle,
            `Inline style "${item}" was dropped.`,
            {
              suggestion:
                "Allowed: color, background-color, font-size, font-weight, font-style, text-decoration, text-align.",
            },
          ),
        );
      }
      return style.length > 0 ? { style } : null;
    }

    return {
      style: tag === "color" ? `color: ${value}` : `font-size: ${value}`,
    };
  }
}

/** One parse. No cache. Nested calls go through this too. */
export function parseOnce(text: string): {
  nodes: readonly InlineNode[];
  diagnostics: readonly Diagnostic[];
} {
  const parser = new InlineParser(text);
  const nodes = parser.parse();
  return { nodes, diagnostics: parser.diagnostics };
}
