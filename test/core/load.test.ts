import { describe, expect, test } from "bun:test";
import {
  buildQuiz,
  buildQuizFromParsed,
  parseQuiz,
} from "../../src/core/model/quiz";
import { isManifest, parseManifest } from "../../src/core/quiz/manifest";
import { createQuiz } from "../../src/core/quiz";

const ONE = `
Title => One
Seed => a

Question => First?
Answers => Yes
`;

const TWO = `
# Second round

Question => Second?
Answers => Also yes
`;

describe("pre-parsed input", () => {
  test("a parsed document builds the same model", () => {
    const plain = buildQuiz(ONE);
    const parsed = parseQuiz(ONE);
    const fromAst = buildQuizFromParsed([parsed]);
    expect(fromAst.questions.length).toBe(plain.questions.length);
    expect(fromAst.meta.title).toBe(plain.meta.title);
    expect(fromAst.questions[0]?.text[0]?.text).toBe(
      plain.questions[0]?.text[0]?.text,
    );
  });

  test("several files share one quiz and the first header wins", () => {
    const quiz = buildQuizFromParsed([parseQuiz(ONE), parseQuiz(TWO)]);
    expect(quiz.meta.title).toBe("One");
    expect(quiz.questions.length).toBe(2);
    // The second file opens its own round. Nothing is glued together by hand.
    expect(quiz.rounds.length).toBe(2);
  });

  test("a parse hook is used for every file", async () => {
    const seen: string[] = [];
    const quiz = createQuiz({
      parseText: (text, options) => {
        seen.push(options.file ?? "");
        return parseQuiz(text, options);
      },
    });
    await quiz.load({
      type: "files",
      files: [
        { name: "a.trivia", text: ONE },
        { name: "b.trivia", text: TWO },
      ],
    });
    expect(seen).toEqual(["a.trivia", "b.trivia"]);
    expect(quiz.state.plan?.total).toBe(2);
  });
});

describe("manifest", () => {
  test("reads files, languages and build hash", () => {
    const manifest = parseManifest({
      version: 3,
      title: "Big Quiz",
      files: [
        { path: "en.trivia", language: "en" },
        { path: "nl.trivia", language: "nl" },
      ],
      build: { hash: "sha256-abc" },
    });
    expect(manifest.files.length).toBe(2);
    expect(manifest.files[0]?.language).toBe("en");
    expect(manifest.buildHash).toBe("sha256-abc");
  });

  test("a bare file list is enough", () => {
    expect(parseManifest({ files: ["q.trivia"] }).files[0]?.path).toBe(
      "q.trivia",
    );
  });

  test("no files is an error, not an empty quiz", () => {
    expect(() => parseManifest({ title: "Nothing" })).toThrow();
    expect(isManifest({ title: "Nothing" })).toBe(false);
    expect(isManifest({ files: [] })).toBe(true);
  });
});
