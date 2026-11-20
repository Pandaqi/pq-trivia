/**
 * CSS in, smaller CSS out.
 *
 * Comments and indentation are for whoever edits the theme, not for the page
 * that loads it. Quoted values are copied character for character: a font name
 * or `content` string keeps its spaces.
 */

const PUNCTUATION: ReadonlySet<string> = new Set(["{", "}", ";", ","]);

/** Index just past a quoted string, including the closing quote. */
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

/** True when only whitespace or comments sit between here and `}`. */
function closesBlock(css: string, from: number): boolean {
  let index = from;
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
    return char === "}";
  }
  return false;
}

export function minifyCss(css: string): string {
  let out = "";
  let space = false;
  let index = 0;

  while (index < css.length) {
    const char = css.charAt(index);

    if (char === '"' || char === "'") {
      if (space && out.length > 0) {
        out += " ";
      }
      space = false;
      const end = stringEnd(css, index, char);
      out += css.slice(index, end);
      index = end;
      continue;
    }

    if (char === "/" && css.charAt(index + 1) === "*") {
      const end = css.indexOf("*/", index + 2);
      index = end < 0 ? css.length : end + 2;
      space = true;
      continue;
    }

    if (/\s/.test(char)) {
      space = true;
      index += 1;
      continue;
    }

    if (PUNCTUATION.has(char)) {
      space = false;
      if (char === ";" && closesBlock(css, index + 1)) {
        index += 1;
        continue;
      }
      out += char;
      index += 1;
      continue;
    }

    if (space && out.length > 0) {
      out += " ";
    }
    space = false;
    out += char;
    index += 1;
  }

  return out;
}
