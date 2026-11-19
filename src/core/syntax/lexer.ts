/**
 * Turns a file into numbered lines, minus comments.
 *
 * Line numbers stay honest, because diagnostics point at them.
 */

import { DiagnosticCodes, syntaxWarning, type Diagnostic } from "./diagnostics";

export interface SourceLine {
  readonly text: string;
  readonly number: number;
}

export interface LexResult {
  readonly lines: readonly SourceLine[];
  readonly diagnostics: readonly Diagnostic[];
}

export function lex(text: string): LexResult {
  const diagnostics: Diagnostic[] = [];
  const source = text.replace(/^\uFEFF/, "");
  const rawLines = source.split(/\r?\n/);

  let inBlockComment = false;
  let blockCommentStart = 0;
  const lines: SourceLine[] = [];

  for (let index = 0; index < rawLines.length; index += 1) {
    const number = index + 1;
    const raw = rawLines[index] ?? "";
    let out = "";
    let cursor = 0;

    while (cursor < raw.length) {
      if (inBlockComment) {
        const end = raw.indexOf("*/", cursor);
        if (end < 0) {
          cursor = raw.length;
          continue;
        }
        inBlockComment = false;
        cursor = end + 2;
        continue;
      }

      const start = raw.indexOf("/*", cursor);
      if (start < 0) {
        out += raw.slice(cursor);
        cursor = raw.length;
        continue;
      }

      out += raw.slice(cursor, start);
      inBlockComment = true;
      blockCommentStart = number;
      cursor = start + 2;
    }

    lines.push({ text: out, number });
  }

  if (inBlockComment) {
    diagnostics.push(
      syntaxWarning(
        DiagnosticCodes.UnclosedComment,
        "A block comment was never closed.",
        {
          location: { file: "<text>", line: blockCommentStart, column: 1 },
          suggestion: "Add */ where the comment ends.",
        },
      ),
    );
  }

  return { lines, diagnostics };
}
