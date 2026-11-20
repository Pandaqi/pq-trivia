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
import type { AttributeSpec } from "./attributes";

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
  /** V2's `forbidInlineLists`: keep `|` in the value. */
  readonly forbidInlineLists?: boolean;
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

interface ParserState {
  current: MutableAttribute[] | null;
  blockList: MutableAttribute | null;
  group: MutableAttribute | null;
  lastAttribute: MutableAttribute | null;
}

/** `A, B, C` in one value, or the value itself. `$` keeps it whole. */
function valuesOf(
  rawValue: string,
  spec: AttributeSpec | undefined,
  options: ParseOptions,
  symbols: Symbols,
): string[] {
  const value = rawValue.trim();
  if (value.length === 0) {
    return [];
  }
  const isList = spec !== undefined && isListAttribute(spec.key);
  if (!isList || options.forbidInlineLists === true || value.startsWith("$")) {
    return [value];
  }
  return splitUnescaped(value, symbols.inlineList)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** `Type => Start` opens a new screen, even after a question has been read. */
function opensScreenBlock(
  values: readonly string[],
  state: ParserState,
): boolean {
  const opensScreen = values.some((value) =>
    SCREEN_TYPES.has(value.toLowerCase()),
  );
  if (!opensScreen) {
    return false;
  }
  if (state.current === null) {
    return true;
  }
  return state.current.some((attribute) => attribute.key === "Question");
}

/** Start and End write `Type =>` before their question. Those stay open. */
function opensQuestionBlock(state: ParserState): boolean {
  if (state.current === null) {
    return true;
  }
  const currentType = state.current
    .find((attribute) => attribute.key === "Type")
    ?.values[0]?.toLowerCase();
  const currentHasQuestion = state.current.some(
    (attribute) => attribute.key === "Question",
  );
  const screenWaiting =
    currentType !== undefined &&
    SCREEN_TYPES.has(currentType) &&
    !currentHasQuestion;
  return !screenWaiting;
}

export function parse(text: string, options: ParseOptions = {}): ParseResult {
  const file = options.file ?? "<text>";
  const symbols = resolveSymbols(options.symbols);
  const strictness = options.strictness ?? Strictness.Tolerant;
  const lexed = lex(text);
  const diagnostics: Diagnostic[] = [...lexed.diagnostics];

  const header: MutableAttribute[] = [];
  const blocks: MutableAttribute[][] = [];

  const state: ParserState = {
    current: null,
    blockList: null,
    group: null,
    lastAttribute: null,
  };

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
    state.group = null;
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

    // `#### Answers` starts a block where every line is one value for the key.
    // Longest marker first: `####`, then `###`, then `##`, then `#`.
    const groupHeading = symbols.block;
    if (trimmed.startsWith(groupHeading)) {
      const name = trimmed.slice(groupHeading.length).trim();
      const column = raw.indexOf(trimmed) + 1;
      const location = at(line.number, column);
      if (name.length === 0) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.MissingQuestion,
            "A block heading has no key.",
            {
              location,
              suggestion: "Write `#### Answers`, then one value per line.",
            },
          ),
        );
        continue;
      }
      const spec = findAttribute(name);
      const headerKey =
        state.current === null ? findHeaderKey(name) : undefined;
      if (!spec && headerKey === undefined) {
        const suggestion = nearestAttributeName(name);
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.UnknownAttribute,
            `Unknown attribute "${name}".`,
            suggestion === undefined
              ? { location }
              : { location, suggestion: `Did you mean ${suggestion}?` },
          ),
        );
      }
      const attribute = makeAttribute(
        headerKey ?? spec?.key ?? name.toLowerCase(),
        name,
        [],
        location,
      );
      pushAttribute(attribute);
      state.group = attribute;
      state.blockList = null;
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
                "Write the question after the ### shorthand, or use Question => text.",
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
              suggestion: "Write `## Round name`.",
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

    if (trimmed.startsWith(symbols.title)) {
      const name = trimmed.slice(symbols.title.length).trim();
      const column = raw.indexOf(trimmed) + 1;
      const location = at(line.number, column);
      if (name.length === 0) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.MissingQuestion,
            "A quiz title heading has no text.",
            {
              location,
              suggestion: "Write `# Quiz title`.",
            },
          ),
        );
        continue;
      }
      // The title belongs to the whole quiz, wherever the line sits. A second
      // one means a second quiz, and a file holds one, so say so.
      if (header.some((attribute) => attribute.key === "Title")) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.InvalidLine,
            "A second title starts a second quiz, and a file holds one.",
            {
              location,
              suggestion: "Keep one title, or split the quiz into two files.",
            },
          ),
        );
      } else {
        header.push(makeAttribute("Title", "Title", [name], location));
      }
      continue;
    }

    const pair = splitPair(trimmed, symbols.pairing);
    if (!pair) {
      // Inside a `#### Key` block every line is a value, verbatim.
      if (state.group !== null) {
        state.group.values.push(trimmed);
        continue;
      }
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

    state.group = null;
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
    const values = valuesOf(rawValue, spec, options, symbols);

    switch (key) {
      case "Question":
        // A Question line opens a block, except inside a Start/End block that
        // has not seen its question yet. Those write `Type =>` first.
        if (opensQuestionBlock(state)) {
          startBlock();
        }
        break;
      case "Type":
        // `Type => Start` opens its own screen block, even after a question.
        if (opensScreenBlock(values, state)) {
          startBlock();
        }
        break;
      default:
        if (state.current === null && headerKey === undefined) {
          startBlock();
        }
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

  if (state.group !== null && state.group.values.length === 0) {
    diagnostics.push(
      syntaxError(
        DiagnosticCodes.EmptyList,
        `"${state.group.rawKey}" has an empty block.`,
        { location: state.group.location },
      ),
    );
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
