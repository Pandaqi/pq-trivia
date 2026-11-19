/**
 * Inline formatting, parsed once into a tree.
 *
 * Public door for renderers and print. The parser lives next door, the node
 * types next door to that. Formatting off means plain text nodes. Never HTML.
 */

import type { Diagnostic } from "../syntax/diagnostics";
import { parseOnce } from "./inlineParser";
import { InlineKind, type InlineNode } from "./inlineAst";

export * from "./inlineAst";
export { isSafeHref, sanitizeStyle } from "./safe";

export interface InlineParseResult {
  readonly nodes: readonly InlineNode[];
  readonly diagnostics: readonly Diagnostic[];
}

const CACHE = new Map<string, InlineParseResult>();
const CACHE_LIMIT = 500;

/** Parse once per value. The same text goes to the question, reveal and print. */
export function parseInline(text: string): InlineParseResult {
  const cached = CACHE.get(text);
  if (cached !== undefined) {
    return cached;
  }
  const result = parseOnce(text);
  if (CACHE.size >= CACHE_LIMIT) {
    CACHE.clear();
  }
  CACHE.set(text, result);
  return result;
}

export function inlineToPlainText(nodes: readonly InlineNode[]): string {
  let out = "";
  for (const node of nodes) {
    switch (node.kind) {
      case InlineKind.Text:
      case InlineKind.Code:
        out += node.text;
        break;
      case InlineKind.CodeBlock:
        out += node.code;
        break;
      case InlineKind.Blank:
        out += "____";
        break;
      case InlineKind.Image:
        out += node.alt.length > 0 ? node.alt : node.src;
        break;
      case InlineKind.Break:
        out += "\n";
        break;
      default:
        out += inlineToPlainText(node.children);
        break;
    }
  }
  return out;
}

export function countBlanks(nodes: readonly InlineNode[]): number {
  let total = 0;
  for (const node of nodes) {
    if (node.kind === InlineKind.Blank) {
      total += 1;
    } else if ("children" in node) {
      total += countBlanks(node.children);
    }
  }
  return total;
}
