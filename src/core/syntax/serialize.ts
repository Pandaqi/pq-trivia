/**
 * Canonical formatter.
 *
 * `parse(format(x))` gives the same model as `parse(x)`. That promise is what
 * lets the wizard, the CLI and the tests share one path.
 */

import type { AstAttribute, AstDocument, AstQuestion } from "./ast";
import {
  attributeOrder,
  findAttribute,
  HEADER_KEYS,
  isListAttribute,
} from "./attributeRegistry";
import { resolveSymbols, type Symbols } from "./symbols";
import { parse } from "./parser";

export interface FormatOptions {
  readonly symbols?: Partial<Symbols>;
  /** Write the header block. Default true. */
  readonly header?: boolean;
}

interface GroupedAttribute {
  key: string;
  rawKey: string;
  values: string[];
}

function groupAttributes(
  attributes: readonly AstAttribute[],
): GroupedAttribute[] {
  const order: string[] = [];
  const groups = new Map<string, GroupedAttribute>();
  for (const attribute of attributes) {
    const existing = groups.get(attribute.key);
    if (existing) {
      existing.values.push(...attribute.values);
      continue;
    }
    order.push(attribute.key);
    groups.set(attribute.key, {
      key: attribute.key,
      rawKey: attribute.rawKey,
      values: [...attribute.values],
    });
  }
  const grouped = order
    .map((key) => groups.get(key))
    .filter((group): group is GroupedAttribute => group !== undefined);
  return grouped.sort((a, b) => attributeOrder(a.key) - attributeOrder(b.key));
}

/** Escape the pairing symbol inside a value, leaving existing escapes alone. */
function escapeSeparator(value: string, separator: string): string {
  let out = "";
  let index = 0;
  while (index < value.length) {
    const char = value.charAt(index);
    if (char === "\\") {
      out += value.slice(index, index + 2);
      index += 2;
      continue;
    }
    if (value.startsWith(separator, index)) {
      out += `\\${separator}`;
      index += separator.length;
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

function emitGroup(group: GroupedAttribute, symbols: Symbols): string[] {
  const spec = findAttribute(group.key);
  const listLike = spec !== undefined && isListAttribute(spec.key);
  const values = group.values.filter((value) => value.length > 0);
  if (values.length === 0) {
    return [];
  }

  if (listLike) {
    const joined = values
      .map((value) => escapeSeparator(value, symbols.inlineList))
      .join(` ${symbols.inlineList} `);
    return [`${group.rawKey} ${symbols.pairing} ${joined}`];
  }

  return values.map(
    (value) =>
      `${group.rawKey} ${symbols.pairing} ${escapeSeparator(value, symbols.pairing)}`,
  );
}

function isSection(question: AstQuestion): boolean {
  const type = question.attributes.find(
    (attribute) => attribute.key === "Type",
  );
  return (
    type?.values.some((value) => value.trim().toLowerCase() === "section") ??
    false
  );
}

function emitQuestion(question: AstQuestion, symbols: Symbols): string[] {
  const groups = groupAttributes(question.attributes);
  const lines: string[] = [];

  const questionGroup = groups.find((group) => group.key === "Question");
  const rest = groups.filter((group) => group.key !== "Question");
  const typeGroup = groups.find((group) => group.key === "Type");
  const screenType = typeGroup?.values[0]?.trim().toLowerCase();

  // Start and End blocks write Type first, so a re-parse keeps them one block.
  if (
    typeGroup !== undefined &&
    (screenType === "start" || screenType === "end")
  ) {
    lines.push(...emitGroup(typeGroup, symbols));
    if (questionGroup !== undefined) {
      lines.push(...emitGroup(questionGroup, symbols));
    }
    for (const group of rest) {
      if (group.key === "Type") {
        continue;
      }
      lines.push(...emitGroup(group, symbols));
    }
    return lines;
  }

  if (
    isSection(question) &&
    questionGroup !== undefined &&
    questionGroup.values.length === 1
  ) {
    const name = questionGroup.values[0] ?? "";
    lines.push(`${symbols.section} ${escapeSeparator(name, symbols.section)}`);
    for (const group of rest) {
      if (group.key === "Type") {
        continue;
      }
      lines.push(...emitGroup(group, symbols));
    }
    return lines;
  }

  if (questionGroup !== undefined) {
    lines.push(...emitGroup(questionGroup, symbols));
  }
  for (const group of rest) {
    lines.push(...emitGroup(group, symbols));
  }
  return lines;
}

function headerOrder(key: string): number {
  const index = HEADER_KEYS.findIndex(
    (candidate) => candidate.toLowerCase() === key.toLowerCase(),
  );
  return index >= 0 ? index : HEADER_KEYS.length + attributeOrder(key);
}

export function format(doc: AstDocument, options: FormatOptions = {}): string {
  const symbols = resolveSymbols(options.symbols);
  const sections: string[] = [];

  if (options.header !== false) {
    const headerGroups = groupAttributes(doc.header).sort(
      (a, b) => headerOrder(a.key) - headerOrder(b.key),
    );
    const title = headerGroups.find((group) => group.key === "Title");
    const headerLines: string[] = [];
    const titleText = title?.values[0]?.trim() ?? "";
    if (titleText.length > 0) {
      headerLines.push(`${symbols.title} ${titleText}`);
    }
    for (const group of headerGroups) {
      if (group.key === "Title") {
        continue;
      }
      headerLines.push(...emitGroup(group, symbols));
    }
    if (headerLines.length > 0) {
      sections.push(headerLines.join("\n"));
    }
  }

  for (const question of doc.questions) {
    const lines = emitQuestion(question, symbols);
    if (lines.length > 0) {
      sections.push(lines.join("\n"));
    }
  }

  return `${sections.join("\n\n")}\n`;
}

/** Parse a string and write it back in canonical form. */
export function formatText(text: string, options: FormatOptions = {}): string {
  const result = parse(
    text,
    options.symbols ? { symbols: options.symbols } : {},
  );
  return format(result.document, options);
}
