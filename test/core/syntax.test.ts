import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildQuiz } from "../../src/core/model/quiz";
import { QuestionType, ScoringMethod } from "../../src/core/model/question";
import { formatText } from "../../src/core/syntax/serialize";
import { DiagnosticSeverity } from "../../src/core/syntax/diagnostics";
import { coerceDuration } from "../../src/core/values/coerce";
import { ValueMask } from "../../src/core/values/qval";

const fixture = (name: string): Promise<string> =>
  readFile(join(import.meta.dir, "..", "fixtures", name), "utf8");

describe("parser", () => {
  test("reads the header", async () => {
    const quiz = buildQuiz(await fixture("simple.trivia"), {
      file: "simple.trivia",
    });
    expect(quiz.meta.title).toBe("The Wayward Melody Test");
    expect(quiz.meta.theme).toBe("vinyl");
    expect(quiz.meta.seed).toBe("music-night");
    expect(quiz.meta.authors[0]).toBe("Tiamo");
    expect(
      quiz.diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error),
    ).toHaveLength(0);
  });

  test("groups rounds and questions", async () => {
    const quiz = buildQuiz(await fixture("simple.trivia"));
    expect(quiz.questions).toHaveLength(4);
    expect(quiz.rounds.map((round) => round.name)).toEqual(["Warm-up"]);
    expect(quiz.rounds[0]?.questions).toHaveLength(4);
    expect(quiz.start).not.toBeNull();
    expect(quiz.end).not.toBeNull();
  });

  test("every type survives a parse", async () => {
    const quiz = buildQuiz(await fixture("simple.trivia"));
    expect(quiz.questions.map((question) => question.type)).toEqual([
      QuestionType.Choice,
      QuestionType.Range,
      QuestionType.Cloze,
      QuestionType.Match,
    ]);
    expect(quiz.questions[2]?.scoring).toBe(ScoringMethod.AllOrNothing);
  });

  test("real booleans, not strings", () => {
    const quiz = buildQuiz(
      `Question => Text\nFormatText => false\nHiddenAtExport => yes`,
    );
    expect(quiz.questions[0]?.formatText).toBe(false);
    expect(quiz.questions[0]?.hiddenAtExport).toBe(true);
  });

  test("masks stay attached to values", () => {
    const quiz = buildQuiz(
      `Question => Pick one\nAnswers => ?only here | !only there\nType => Choice\nCorrect => only here`,
    );
    const answers = quiz.questions[0]?.answers ?? [];
    expect(answers[0]?.mask).toBe(ValueMask.Question);
    expect(answers[1]?.mask).toBe(ValueMask.Answer);
  });

  test("unknown attributes warn and suggest", async () => {
    const quiz = buildQuiz(await fixture("broken.trivia"), {
      file: "broken.trivia",
    });
    const unknown = quiz.diagnostics.find(
      (diagnostic) => diagnostic.code === "PQ101",
    );
    expect(unknown?.severity).toBe(DiagnosticSeverity.Warning);
    expect(unknown?.suggestion).toContain("Question");
  });

  test("empty lists are errors, duplicates are errors", async () => {
    const quiz = buildQuiz(await fixture("broken.trivia"), {
      file: "broken.trivia",
    });
    const codes = quiz.diagnostics.map((diagnostic) => diagnostic.code);
    expect(codes).toContain("PQ110");
    expect(codes).toContain("PQ109");
  });

  test("durations accept what authors type", () => {
    expect(coerceDuration("90")).toBe(90_000);
    expect(coerceDuration("1:30")).toBe(90_000);
    expect(coerceDuration("1m30s")).toBe(90_000);
    expect(coerceDuration("banana")).toBeUndefined();
  });

  test("### is the question shorthand", () => {
    const quiz = buildQuiz("### Who wrote it?\nAnswers => Queen\n");
    expect(quiz.questions).toHaveLength(1);
    expect(quiz.questions[0]?.text[0]?.text).toBe("Who wrote it?");
    expect(quiz.questions[0]?.answers[0]?.text).toBe("Queen");
  });

  test("#### Key blocks take one value per line", () => {
    const quiz = buildQuiz(
      [
        "### Pick one",
        "#### Answers",
        "Alpha",
        "Beta with **bold** and [a link](https://example.com)",
        "Gamma",
        "Correct => Alpha",
        "Type => Choice",
        "#### Media",
        "one.png",
        "two.mp3",
      ].join("\n"),
    );
    const question = quiz.questions[0];
    expect(question?.answers.map((answer) => answer.text)).toEqual([
      "Alpha",
      "Beta with **bold** and [a link](https://example.com)",
      "Gamma",
    ]);
    expect(question?.media.map((item) => item.path)).toEqual([
      "one.png",
      "two.mp3",
    ]);
    expect(question?.correct[0]?.text).toBe("Alpha");
    expect(quiz.diagnostics.filter((d) => d.severity === "error")).toHaveLength(
      0,
    );
  });

  test("a #### block ends at the next key or heading", () => {
    const quiz = buildQuiz(
      [
        "### First question",
        "#### Answers",
        "First",
        "Second",
        "Question => A later question",
        "Answers => one | two",
        "## Round two",
        "Question => Another",
      ].join("\n"),
    );
    expect(quiz.questions[0]?.text[0]?.text).toBe("First question");
    expect(quiz.questions[0]?.answers.map((a) => a.text)).toEqual([
      "First",
      "Second",
    ]);
    expect(quiz.questions[1]?.text[0]?.text).toBe("A later question");
    expect(quiz.questions[1]?.answers.map((a) => a.text)).toEqual([
      "one",
      "two",
    ]);
    expect(quiz.rounds.map((round) => round.name)).toContain("Round two");
  });

  test("lists work on one line and on their own lines", () => {
    const inline = buildQuiz("Question => Q\nAnswers => A | B | C");
    const lines = buildQuiz("Question => Q\nAnswers =>\nA\nB\nC");
    expect(inline.questions[0]?.answers.map((a) => a.text)).toEqual([
      "A",
      "B",
      "C",
    ]);
    expect(lines.questions[0]?.answers.map((a) => a.text)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  test("the formatter is idempotent", async () => {
    const text = await fixture("all-types.trivia");
    const once = formatText(text);
    const twice = formatText(once);
    expect(twice).toBe(once);
  });
});
