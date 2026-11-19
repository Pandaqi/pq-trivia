import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildQuiz, type QuizModel } from "../../src/core/model/quiz";
import { formatText } from "../../src/core/syntax/serialize";
import {
  parseInline,
  inlineToPlainText,
  countBlanks,
  InlineKind,
  sanitizeStyle,
  isSafeHref,
} from "../../src/core/format/inline";

const fixture = (name: string): Promise<string> =>
  readFile(join(import.meta.dir, "..", "fixtures", name), "utf8");

/** Ignore line numbers: formatting moves them. */
function comparable(quiz: QuizModel): string {
  const questions = quiz.questions.map((question) => {
    const copy: Record<string, unknown> = { ...question };
    delete copy["location"];
    return copy;
  });
  const rounds = quiz.rounds.map((round) => ({
    id: round.id,
    name: round.name,
    secret: round.secret,
    count: round.questions.length,
  }));
  return JSON.stringify({
    meta: quiz.meta,
    questions,
    rounds,
    start: quiz.start !== null,
    end: quiz.end !== null,
  });
}

describe("formatter round-trip", () => {
  for (const name of ["simple.trivia", "all-types.trivia"]) {
    test(`${name} keeps its model`, async () => {
      const text = await fixture(name);
      const before = buildQuiz(text, { file: name });
      const formatted = formatText(text);
      const after = buildQuiz(formatted, { file: name });
      expect(comparable(after)).toBe(comparable(before));
    });
  }
});

describe("inline formatting", () => {
  test("bold, italic, underline, strike", () => {
    const nodes = parseInline("**bold** _italic_ __under__ ~~gone~~").nodes;
    expect(nodes.map((node) => node.kind)).toEqual([
      InlineKind.Strong,
      InlineKind.Text,
      InlineKind.Em,
      InlineKind.Text,
      InlineKind.Underline,
      InlineKind.Text,
      InlineKind.Strike,
    ]);
  });

  test("links are links, escaped or refused", () => {
    const good = parseInline("[docs](https://example.com)").nodes[0];
    expect(good?.kind).toBe(InlineKind.Link);
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    const bad = parseInline("[click](javascript:alert(1))");
    expect(bad.diagnostics).toHaveLength(1);
    expect(inlineToPlainText(bad.nodes)).toBe("click");
  });

  test("classes and styles are namespaced or dropped", () => {
    const styled = parseInline('[style="color:red;position:fixed"]hi[/style]')
      .nodes[0];
    expect(styled?.kind).toBe(InlineKind.Span);
    if (styled?.kind === InlineKind.Span) {
      expect(styled.attributes["style"]).toBe("color: red");
    }
    expect(sanitizeStyle("position: fixed").style).toBe("");
    const badClass = parseInline('[class="1evil"]x[/class]');
    expect(badClass.diagnostics).toHaveLength(1);
  });

  test("blanks are counted", () => {
    expect(countBlanks(parseInline("one [blank] two [blank]").nodes)).toBe(2);
    expect(inlineToPlainText(parseInline("**a** b").nodes)).toBe("a b");
  });

  test("a fenced block keeps its language and code", () => {
    const parsed = parseInline("before\n```js\nlet x = 1;\n```\nafter");
    const block = parsed.nodes.find(
      (node) => node.kind === InlineKind.CodeBlock,
    );
    expect(block).toEqual({
      kind: InlineKind.CodeBlock,
      code: "let x = 1;",
      language: "js",
    });
    expect(inlineToPlainText(parsed.nodes)).toContain("let x = 1;");
  });

  test("an unclosed fence is warned about, not swallowed", () => {
    const parsed = parseInline("```js\nlet x = 1;");
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
  });
});
