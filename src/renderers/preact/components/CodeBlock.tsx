/**
 * Fenced code, with a small highlighter you can turn on.
 *
 * Plain monospace by default. `codeHighlight: true` splits comments, strings,
 * numbers and keywords into spans; CSS decides the colours. No parser library,
 * no language grammars, no bytes spent on code most quizzes never show.
 */

import { createContext } from "preact";
import type { JSX } from "preact";
import { useContext } from "preact/hooks";

export const CodeHighlightContext = createContext(false);

export function useCodeHighlight(): boolean {
  return useContext(CodeHighlightContext);
}

const KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "of",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

/** Languages where `#` starts a comment. CSS and friends are not on it. */
const HASH_COMMENTS: ReadonlySet<string> = new Set([
  "bash",
  "fish",
  "make",
  "makefile",
  "perl",
  "pl",
  "py",
  "python",
  "r",
  "rb",
  "ruby",
  "sh",
  "shell",
  "toml",
  "yaml",
  "yml",
  "zsh",
]);

const BLOCK_COMMENT = /^\/\*[\s\S]*?\*\//;
const SLASH_COMMENT = /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/;
const HASH_COMMENT = /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/;
const HEX_COLOUR = /^#[0-9a-fA-F]{3,8}\b/;

type TokenKind = "text" | "comment" | "string" | "number" | "keyword";

interface Token {
  readonly kind: TokenKind;
  readonly text: string;
}

/**
 * One pass, no backtracking. A quote inside a comment stays a comment, because
 * comments and strings are tried before everything else at each position.
 */
export function tokenize(code: string, language = ""): readonly Token[] {
  const lang = language.trim().toLowerCase();
  // Plain CSS has one comment form. `//` in `url(https://…)` is not one.
  const comments =
    lang === "css"
      ? BLOCK_COMMENT
      : HASH_COMMENTS.has(lang)
        ? HASH_COMMENT
        : SLASH_COMMENT;
  // A CSS colour is not a comment, and not a keyword either.
  const colour = lang === "css" || lang === "less" || lang === "scss";
  const tokens: Token[] = [];
  let plain = "";
  let index = 0;

  const push = (kind: TokenKind, text: string): void => {
    if (plain.length > 0) {
      tokens.push({ kind: "text", text: plain });
      plain = "";
    }
    tokens.push({ kind, text });
  };

  while (index < code.length) {
    const rest = code.slice(index);
    if (colour) {
      const hex = HEX_COLOUR.exec(rest);
      if (hex !== null) {
        push("number", hex[0]);
        index += hex[0].length;
        continue;
      }
    }
    const comment = comments.exec(rest);
    if (comment !== null) {
      push("comment", comment[0]);
      index += comment[0].length;
      continue;
    }
    const string =
      /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/.exec(rest);
    if (string !== null) {
      push("string", string[0]);
      index += string[0].length;
      continue;
    }
    const number = /^\b\d+(?:\.\d+)?\b/.exec(rest);
    if (number !== null) {
      push("number", number[0]);
      index += number[0].length;
      continue;
    }
    const word = /^[A-Za-z_$][\w$]*/.exec(rest);
    if (word !== null) {
      if (KEYWORDS.has(word[0])) {
        push("keyword", word[0]);
      } else {
        plain += word[0];
      }
      index += word[0].length;
      continue;
    }
    plain += code.charAt(index);
    index += 1;
  }
  if (plain.length > 0) {
    tokens.push({ kind: "text", text: plain });
  }
  return tokens;
}

export function CodeBlock({
  code,
  language,
}: {
  readonly code: string;
  readonly language: string;
}): JSX.Element {
  const highlight = useCodeHighlight();
  const tokens = highlight
    ? tokenize(code, language)
    : [{ kind: "text", text: code }];

  return (
    <div class="pq-code-block">
      <pre>
        <code
          data-pq-language={language.length === 0 ? undefined : language}
          data-pq-highlight={highlight ? "true" : undefined}
        >
          {tokens.map((token, index) =>
            token.kind === "text" ? (
              token.text
            ) : (
              <span key={index} class={`pq-token pq-token-${token.kind}`}>
                {token.text}
              </span>
            ),
          )}
        </code>
      </pre>
    </div>
  );
}
