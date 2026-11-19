/**
 * Text in, AST out. Tolerant by default: skip the bad line, keep the quiz.
 *
 * The parser never builds a model. It only knows attributes and blocks.
 */

import type { AstAttribute, AstDocument, AstQuestion } from "./ast";
import {
  attributeOrder,
  findAttribute,
  findHeaderKey,
  isListAttribute,
  nearestAttributeName,
} from "./attributeRegistry";
import {
  DiagnosticCodes,
  hasErrors,
  syntaxError,
  syntaxWarning,
  type Diagnostic,
  type SourceLocation,
} from "./diagnostics";
import { lex } from "./lexer";
import { resolveSymbols, type Symbols } from "./symbols";
import { splitPair, splitUnescaped } from "../values/coerce";

const SCREEN_TYPES: ReadonlySet<string> = new Set(["start", "end", "section"]);

export enum Strictness {
  Tolerant = "tolerant",
  Strict = "strict",
  Ci = "ci",
}

export interface ParseOptions {
  readonly file?: string;
  readonly symbols?: Partial<Symbols>;
  readonly strictness?: Strictness;
}

export interface ParseResult {
  readonly document: AstDocument;
  readonly diagnostics: readonly Diagnostic[];
  readonly symbols: Symbols;
  readonly ok: boolean;
}

interface MutableAttribute {
  key: string;
  rawKey: string;
  values: string[];
  location: SourceLocation;
}

export function parse(text: string, options: ParseOptions = {}): ParseResult {
  const file = options.file ?? "<text>";
  const symbols = resolveSymbols(options.symbols);
  const strictness = options.strictness ?? Strictness.Tolerant;
  const lexed = lex(text);
  const diagnostics: Diagnostic[] = [...lexed.diagnostics];

  const header: MutableAttribute[] = [];
  const blocks: MutableAttribute[][] = [];

  const state: {
    current: MutableAttribute[] | null;
    blockList: MutableAttribute | null;
    lastAttribute: MutableAttribute | null;
  } = { current: null, blockList: null, lastAttribute: null };

  const at = (line: number, column: number): SourceLocation => ({
    file,
    line,
    column,
  });

  const startBlock = (): MutableAttribute[] => {
    const block: MutableAttribute[] = [];
    blocks.push(block);
    state.current = block;
    state.blockList = null;
    state.lastAttribute = null;
    return block;
  };

  const pushAttribute = (attribute: MutableAttribute): void => {
    if (state.current === null) {
      header.push(attribute);
    } else {
      state.current.push(attribute);
    }
    state.lastAttribute = attribute;
  };

  const makeAttribute = (
    key: string,
    rawKey: string,
    values: string[],
    location: SourceLocation,
  ): MutableAttribute => ({ key, rawKey, values, location });

  for (const line of lexed.lines) {
    const raw = line.text;
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      continue;
    }
    if (trimmed.startsWith(symbols.comment)) {
      continue;
    }

    if (trimmed.startsWith(symbols.question)) {
      const body = trimmed.slice(symbols.question.length).trim();
      const column = raw.indexOf(trimmed) + 1;
      const block = startBlock();
      const location = at(line.number, column);
      if (body.length === 0) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.MissingQuestion,
            "A question block has no text.",
            {
              location,
              suggestion:
                "Write the question after the ## shorthand, or use Question => text.",
            },
          ),
        );
      }
      const attribute = makeAttribute(
        "Question",
        "Question",
        body.length > 0 ? [body] : [],
        location,
      );
      block.push(attribute);
      state.lastAttribute = attribute;
      continue;
    }

    if (trimmed.startsWith(symbols.section)) {
      const name = trimmed.slice(symbols.section.length).trim();
      const column = raw.indexOf(trimmed) + 1;
      const block = startBlock();
      const location = at(line.number, column);
      if (name.length === 0) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.MissingQuestion,
            "A round header has no name.",
            {
              location,
              suggestion: "Write `# Round name`.",
            },
          ),
        );
      }
      const questionAttribute = makeAttribute(
        "Question",
        "Question",
        name.length > 0 ? [name] : [],
        location,
      );
      const typeAttribute = makeAttribute(
        "Type",
        "Type",
        ["section"],
        location,
      );
      block.push(questionAttribute, typeAttribute);
      state.lastAttribute = typeAttribute;
      continue;
    }

    const pair = splitPair(trimmed, symbols.pairing);
    if (!pair) {
      const target = state.blockList ?? state.lastAttribute;
      if (target !== null && state.blockList !== null) {
        target.values.push(trimmed);
        continue;
      }
      diagnostics.push(
        syntaxError(
          DiagnosticCodes.InvalidLine,
          `Cannot parse this line: "${trimmed}".`,
          {
            location: at(line.number, 1),
            suggestion:
              "Write `Key => Value`, or continue a list on its own line.",
          },
        ),
      );
      continue;
    }

    const [rawKeyRaw, rawValue] = pair;
    const rawKey = rawKeyRaw.trim();
    const column = Math.max(raw.indexOf(rawKey), 0) + 1;
    const location = at(line.number, column);

    const spec = findAttribute(rawKey);
    const headerKey =
      state.current === null ? findHeaderKey(rawKey) : undefined;

    if (!spec && headerKey === undefined) {
      const suggestion = nearestAttributeName(rawKey);
      diagnostics.push(
        syntaxWarning(
          DiagnosticCodes.UnknownAttribute,
          `Unknown attribute "${rawKey}".`,
          suggestion !== undefined
            ? { location, suggestion: `Did you mean ${suggestion}?` }
            : { location },
        ),
      );
    }

    const key = headerKey ?? spec?.key ?? rawKey.toLowerCase();
    const values: string[] = [];
    const value = rawValue.trim();

    if (value.length > 0) {
      const isList = spec !== undefined && isListAttribute(spec.key);
      if (isList && !value.startsWith("$")) {
        for (const part of splitUnescaped(value, symbols.inlineList)) {
          const item = part.trim();
          if (item.length > 0) {
            values.push(item);
          }
        }
      } else {
        values.push(value);
      }
    }

    if (key === "Question") {
      // A Question line opens a block, except inside a Start/End block that has
      // not seen its question yet. Those write `Type =>` first.
      const currentType = state.current
        ?.find((attribute) => attribute.key === "Type")
        ?.values[0]?.toLowerCase();
      const currentHasQuestion =
        state.current?.some((attribute) => attribute.key === "Question") ??
        false;
      const screenBlockWaiting =
        currentType !== undefined &&
        SCREEN_TYPES.has(currentType) &&
        !currentHasQuestion;
      if (state.current === null || !screenBlockWaiting) {
        startBlock();
      }
    } else if (key === "Type") {
      // `Type => Start` opens its own screen block, even after a question.
      const opensScreen = values.some((val) =>
        SCREEN_TYPES.has(val.toLowerCase()),
      );
      const currentHasQuestion =
        state.current?.some((attribute) => attribute.key === "Question") ??
        false;
      if (opensScreen && (state.current === null || currentHasQuestion)) {
        startBlock();
      }
    } else if (state.current === null && headerKey === undefined) {
      startBlock();
    }

    const attribute = makeAttribute(
      key,
      rawKey.length > 0 ? rawKey : key,
      values,
      location,
    );
    pushAttribute(attribute);

    if (values.length > 0) {
      state.blockList = null;
      continue;
    }

    const listLike = spec === undefined || isListAttribute(spec.key);
    if (!listLike) {
      diagnostics.push(
        syntaxError(DiagnosticCodes.EmptyList, `"${rawKey}" needs a value.`, {
          location,
          suggestion: "Put the value after =>.",
        }),
      );
      state.blockList = null;
      continue;
    }
    state.blockList = attribute;
  }

  if (state.blockList !== null && state.blockList.values.length === 0) {
    diagnostics.push(
      syntaxError(
        DiagnosticCodes.EmptyList,
        `"${state.blockList.rawKey}" has an empty list.`,
        { location: state.blockList.location },
      ),
    );
  }

  const sortAttributes = (
    attributes: readonly MutableAttribute[],
  ): AstAttribute[] =>
    attributes
      .map((attribute) => ({
        key: attribute.key,
        rawKey: attribute.rawKey,
        values: [...attribute.values],
        location: attribute.location,
      }))
      .sort((a, b) => attributeOrder(a.key) - attributeOrder(b.key));

  const questions: AstQuestion[] = blocks.map((block) => ({
    attributes: sortAttributes(block),
    location: block[0]?.location ?? at(1, 1),
  }));

  const ast: AstDocument = {
    header: sortAttributes(header),
    questions,
  };

  const errorsPresent = hasErrors(diagnostics);
  const failOnWarnings = strictness === Strictness.Ci && diagnostics.length > 0;

  return {
    document: ast,
    diagnostics,
    symbols,
    ok: !errorsPresent && !failOnWarnings,
  };
}
