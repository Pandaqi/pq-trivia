import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildQuiz } from "../../src/core/model/quiz";
import { QuestionType } from "../../src/core/model/question";
import { DiagnosticSeverity } from "../../src/core/syntax/diagnostics";

const read = (path: string): Promise<string> =>
  readFile(join(import.meta.dir, "..", "..", path), "utf8");

describe("the shipped template", () => {
  test("parses as a choice question", async () => {
    const file = "examples/quick-start-template/template/quiz.trivia";
    const quiz = buildQuiz(await read(file), { file });
    expect(
      quiz.diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error),
    ).toHaveLength(0);
    expect(quiz.questions).toHaveLength(4);
    const question = quiz.questions[0];
    expect(question?.type).toBe(QuestionType.Choice);
    expect(question?.score).toBe(2);
    expect(question?.authors).toEqual(["Pandaqi"]);
    expect(question?.correct[0]?.text).toBe("Groundbreaking");
    expect(question?.answers).toHaveLength(4);
    expect(quiz.questions[3]?.type).toBe(QuestionType.Sort);
  });
});

describe("a V2-style file", () => {
  test("keeps V2 inference and shorthand", async () => {
    const quiz = buildQuiz(await read("test/fixtures/v2-real.trivia"), {
      file: "v2-real.trivia",
    });
    expect(quiz.questions).toHaveLength(5);
    expect(quiz.questions[0]?.type).toBe(QuestionType.Choice);
    expect(quiz.questions[0]?.authors).toEqual(["Pandaqi"]);
    expect(quiz.rounds.map((round) => round.name)).toEqual([
      "General",
      "A round with a secret",
    ]);
    expect(quiz.rounds[1]?.secret).toBe("Instruments");
    expect(quiz.questions[3]?.type).toBe(QuestionType.Open);
    expect(quiz.questions[3]?.text[0]?.text).toBe(
      "What is the capital of the Netherlands?",
    );
    expect(quiz.questions[4]?.correct).toHaveLength(2);
    expect(
      quiz.diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error),
    ).toHaveLength(0);
  });
});
