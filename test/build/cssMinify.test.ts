/**
 * The one-file bundle inlines eight theme files. Minification may drop
 * comments and layout whitespace, never a token and never a space inside
 * quotes.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { minifyCss } from "../../scripts/css";

const THEMES: readonly string[] = [
  "paper.base.css",
  "paper.answers.css",
  "paper.controls.css",
  "paper.interactive.css",
  "paper.live.css",
  "print.pages.css",
  "print.questions.css",
  "print.forms.css",
];

const PUNCTUATION = "{};,";

function stringEnd(css: string, start: number, quote: string): number {
  let index = start + 1;
  while (index < css.length) {
    const char = css.charAt(index);
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === quote) {
      return index + 1;
    }
    index += 1;
  }
  return css.length;
}

/** Whitespace is dropped. A string is one token, spaces and all. */
function tokens(css: string): string[] {
  const out: string[] = [];
  let index = 0;
  while (index < css.length) {
    const char = css.charAt(index);
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "/" && css.charAt(index + 1) === "*") {
      const end = css.indexOf("*/", index + 2);
      index = end < 0 ? css.length : end + 2;
      continue;
    }
    if (char === '"' || char === "'") {
      const end = stringEnd(css, index, char);
      out.push(css.slice(index, end));
      index = end;
      continue;
    }
    if (PUNCTUATION.includes(char)) {
      out.push(char);
      index += 1;
      continue;
    }
    let end = index + 1;
    while (end < css.length) {
      const next = css.charAt(end);
      const comment = next === "/" && css.charAt(end + 1) === "*";
      if (
        /\s/.test(next) ||
        PUNCTUATION.includes(next) ||
        next === '"' ||
        next === "'" ||
        comment
      ) {
        break;
      }
      end += 1;
    }
    out.push(css.slice(index, end));
    index = end;
  }
  return out;
}

/** The minifier may drop the last `;` in a block. Nothing else. */
function withoutClosingSemicolons(values: readonly string[]): string[] {
  return values.filter(
    (value, index) => !(value === ";" && values[index + 1] === "}"),
  );
}

describe("theme CSS minification", () => {
  for (const file of THEMES) {
    test(`${file} keeps every token`, () => {
      const css = readFileSync(
        join(import.meta.dir, "../../src/themes", file),
        "utf8",
      );
      const minified = minifyCss(css);
      expect(withoutClosingSemicolons(tokens(minified))).toEqual(
        withoutClosingSemicolons(tokens(css)),
      );
      expect(minified).not.toContain("/*");
      expect((minified.match(/{/g) ?? []).length).toBe(
        (minified.match(/}/g) ?? []).length,
      );
    });
  }

  test("quoted values keep their spaces", () => {
    const css = `.x{content:"a  b";font-family:"Two  Words";}`;
    expect(minifyCss(css)).toBe(`.x{content:"a  b";font-family:"Two  Words"}`);
  });
});
