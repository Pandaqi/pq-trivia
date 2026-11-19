import { describe, expect, test } from "bun:test";
import { buildQuiz } from "../../src/core/model/quiz";
import { planQuiz } from "../../src/core/plan/plan";
import { Rng } from "../../src/core/plan/rng";

const quiz = (body: string) => buildQuiz(body);

const eight = `
# Round
Question => One
Question => Two
Question => Three
Question => Four
Question => Five
Question => Six
Question => Seven
Question => Eight
`;

describe("V2 defaults on the plan", () => {
  test("defaultTimer fills in questions without a Timer", () => {
    const model = quiz("Question => One\nQuestion => Two\nTimer => 10");
    const plan = planQuiz(model, { defaultTimerMs: 30_000 });
    expect(plan.questions.map((question) => question.timerMs)).toEqual([
      30_000,
      10_000,
    ]);
  });

  test("disableTextFormatting turns formatting off everywhere", () => {
    const plan = planQuiz(quiz("Question => **Bold**"), {
      disableTextFormatting: true,
    });
    expect(plan.questions[0]?.formatText).toBe(false);
  });

  test("a secret round can ask its own theme", () => {
    const model = quiz(
      "# Instruments\nSecret => Instruments\nQuestion => One\nQuestion => Two",
    );
    const plan = planQuiz(model, {
      addSecretThemeQuestions: true,
      secretQuestionText: "What was the secret theme of this round?",
    });
    expect(plan.questions).toHaveLength(3);
    const last = plan.questions[2];
    expect(last?.text[0]?.text).toBe("What was the secret theme of this round?");
    expect(last?.correct[0]?.text).toBe("Instruments");
    expect(last?.round).toBe(plan.rounds[0]?.id ?? "missing");
  });
});

describe("plan", () => {
  test("author order is the default", () => {
    const model = quiz(eight);
    const plan = planQuiz(model);
    expect(plan.questions.map((question) => question.text[0]?.text)).toEqual([
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
    ]);
  });

  test("same seed, same shuffle", () => {
    const model = quiz(eight);
    const a = planQuiz(model, { seed: "night", shuffleQuestions: true });
    const b = planQuiz(model, { seed: "night", shuffleQuestions: true });
    const c = planQuiz(model, { seed: "other", shuffleQuestions: true });
    expect(a.questions.map((question) => question.id)).toEqual(
      b.questions.map((question) => question.id),
    );
    expect(a.questions.map((question) => question.id)).not.toEqual(
      c.questions.map((question) => question.id),
    );
  });

  test("placement beats the shuffle", () => {
    const model = quiz(`
# Round
Question => One
ID => one
Question => Two
ID => two
Question => Three
ID => three
PlaceBefore => one
`);
    const plan = planQuiz(model, { seed: "any", shuffleQuestions: true });
    const ids = plan.questions.map((question) => question.id);
    expect(ids.indexOf("three")).toBe(ids.indexOf("one") - 1);
  });

  test("PlaceAt is one-based", () => {
    const model = quiz(`
# Round
Question => One
ID => one
Question => Two
ID => two
Question => Three
ID => three
PlaceAt => 1
`);
    const plan = planQuiz(model);
    expect(plan.questions[0]?.id).toBe("three");
  });

  test("rng is stable and stays in range", () => {
    const a = new Rng("seed");
    const b = new Rng("seed");
    for (let index = 0; index < 20; index += 1) {
      const value = a.next();
      expect(value).toBe(b.next());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
