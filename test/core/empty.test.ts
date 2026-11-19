import { describe, expect, test } from "bun:test";
import { buildQuiz } from "../../src/core/model/quiz";
import { planQuiz } from "../../src/core/plan/plan";

describe("empty quiz", () => {
  test("warns once, with one wording", () => {
    const quiz = buildQuiz("Title => Nothing here\n");
    const empty = quiz.diagnostics.filter(
      (diagnostic) => diagnostic.message === "Quiz is empty.",
    );

    expect(empty).toHaveLength(1);
  });

  test("plan buttons come from the Start block", () => {
    const quiz = buildQuiz(`Title => Gated
Type => Start
Question => Ready?
Buttons => play

Question => One
Answers => A | B
Correct => A
`);

    expect(planQuiz(quiz).buttons).toEqual(["play"]);
  });

  test("a quiz without a Start block has no button gate", () => {
    const quiz = buildQuiz(`Question => One
Answers => A | B
Correct => A
`);

    expect(planQuiz(quiz).buttons).toEqual([]);
  });
});
