import { describe, expect, test } from "bun:test";
import { tokenize } from "../../src/renderers/preact/components/CodeBlock";

function kinds(code: string, language: string): readonly string[] {
  return tokenize(code, language)
    .filter((token) => token.kind !== "text")
    .map((token) => token.kind);
}

describe("fence highlighter", () => {
  test("a CSS colour is not a comment", () => {
    expect(kinds("a { color: #fff; border: #000; }", "css")).not.toContain(
      "comment",
    );
  });

  test("a CSS colour is a value, not a word", () => {
    expect(kinds("a { color: #fff; }", "css")).toEqual(["number"]);
  });

  test("a URL in CSS is not a comment", () => {
    expect(
      kinds("a { background: url(https://example.com/x.png); }", "css"),
    ).not.toContain("comment");
  });

  test("CSS block comments still work", () => {
    expect(kinds("/* note */ a { color: red; }", "css")).toContain("comment");
  });

  test("SCSS keeps its line comments", () => {
    expect(kinds("// note\na { color: red; }", "scss")).toContain("comment");
  });

  test("a hash is a comment in Python", () => {
    expect(kinds("x = 1  # note", "python")).toEqual(["number", "comment"]);
  });

  test("a hash is a comment in shell", () => {
    expect(kinds("echo hi  # say hi", "bash")).toContain("comment");
  });

  test("a URL inside a string stays a string", () => {
    const token = tokenize('const url = "https://example.com"', "js").find(
      (item) => item.kind === "string",
    );
    expect(token?.text).toBe('"https://example.com"');
  });

  test("keywords and numbers are highlighted", () => {
    expect(kinds("const x = 1", "js")).toContain("keyword");
    expect(kinds("const x = 1", "js")).toContain("number");
  });
});
