import { describe, expect, test } from "bun:test";
import { buildQuiz } from "../../src/core/model/quiz";
import { planQuiz } from "../../src/core/plan/plan";
import { applyVariant, withVariants } from "../../src/core/plan/variants";

const source = `Quiz => Variants
Syntax => 3

Question => In {1}, who sang {2}?
Answers => Hey Jude | Let It Be

Variants => 1969 | 1970
Variants => Hey Jude | Let It Be
`;

describe("variants", () => {
  test("a placeholder takes a value from its slot", () => {
    const quiz = buildQuiz(source);
    const question = quiz.questions[0];
    if (question === undefined) {
      throw new Error("no question");
    }
    const filled = withVariants(question, "music");
    const text = filled.text[0]?.text ?? "";
    expect(text).not.toContain("{1}");
    expect(text).not.toContain("{2}");
    expect(["1969", "1970"].some((year) => text.includes(year))).toBe(true);
  });

  test("the same seed gives the same values", () => {
    const question = buildQuiz(source).questions[0];
    if (question === undefined) {
      throw new Error("no question");
    }
    expect(withVariants(question, "music").text).toEqual(
      withVariants(question, "music").text,
    );
  });

  test("two slots of one question do not pick the same position", () => {
    // Same list on both slots, so a shared stream would always choose alike.
    const quiz = buildQuiz(`Quiz => Slots
Syntax => 3

Question => {1} and {2}
Answers => a | b | c

Variants => a | b | c
Variants => a | b | c
`);
    const question = quiz.questions[0];
    if (question === undefined) {
      throw new Error("no question");
    }
    const picks = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"].map((seed) =>
      (withVariants(question, seed).text[0]?.text ?? "").split(" and "),
    );
    expect(picks.some((parts) => parts[0] !== parts[1])).toBe(true);
  });

  test("a question without variants is untouched", () => {
    const question = buildQuiz("Question => Plain\nAnswers => a").questions[0];
    if (question === undefined) {
      throw new Error("no question");
    }
    expect(withVariants(question, "music")).toBe(question);
  });

  test("an out-of-range placeholder stays as written", () => {
    const question = buildQuiz("Question => Ask {9}\nVariants => only")
      .questions[0];
    if (question === undefined) {
      throw new Error("no question");
    }
    expect(applyVariant(question, ["only"]).text[0]?.text).toBe("Ask {9}");
  });

  test("the plan fills the values and keeps the ID", () => {
    const quiz = buildQuiz(source);
    const plan = planQuiz(quiz, { seed: "music" });
    const question = plan.questions[0];
    expect(question?.id).toBe(quiz.questions[0]?.id);
    expect(question?.text[0]?.text).not.toContain("{1}");
  });
});
