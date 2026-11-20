import { describe, expect, test } from "bun:test";
import { buildQuiz } from "../../src/core/model/quiz";
import { planQuiz } from "../../src/core/plan/plan";
import { drawPool } from "../../src/core/plan/pool";
import type { QuestionModel } from "../../src/core/model/question";

const source = `Quiz => Pools
Syntax => 3

Question => One
Answers => a

Question => Two
Answers => b

Question => Three
Answers => c

Question => Four
Answers => d

Question => Five
Answers => e
`;

function questions(): readonly QuestionModel[] {
  return buildQuiz(source).questions;
}

describe("drawing a pool", () => {
  test("the same seed draws the same questions", () => {
    const a = drawPool(questions(), 2, "music", "r1");
    const b = drawPool(questions(), 2, "music", "r1");
    expect(a.drawn).toEqual(b.drawn);
    expect(a.drawn.length).toBe(2);
  });

  test("a different seed draws another set", () => {
    const seen = new Set<string>();
    for (const seed of ["a", "b", "c", "d"]) {
      seen.add(drawPool(questions(), 2, seed, "r1").drawn.join("|"));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  test("the author's order survives the draw", () => {
    const all = questions();
    const draw = drawPool(all, 3, "music", "r1");
    const order = all.map((question) => question.id);
    const positions = draw.questions.map((question) =>
      order.indexOf(question.id),
    );
    expect([...positions].sort((x, y) => x - y)).toEqual(positions);
  });

  test("asking for more than there is keeps everything", () => {
    const draw = drawPool(questions(), 99, "music", "r1");
    expect(draw.questions.length).toBe(5);
    expect(draw.drawn).toEqual([]);
  });

  test("balancing spreads the difficulty", () => {
    const tagged = questions().map((question, index) => ({
      ...question,
      difficulty: index < 3 ? 1 : 5,
    }));
    const draw = drawPool(tagged, 2, "music", "r1", true);
    expect(draw.questions.map((question) => question.difficulty)).toEqual([
      1, 5,
    ]);
  });
});

describe("pools in a plan", () => {
  test("the plan draws and remembers what it drew", () => {
    const plan = planQuiz(buildQuiz(source), { seed: "music", poolSize: 2 });
    expect(plan.total).toBe(2);
    expect(plan.rounds[0]?.drawn.length).toBe(2);
    expect(plan.rounds[0]?.pool).toBe(2);
  });

  test("no pool means every question", () => {
    const plan = planQuiz(buildQuiz(source), { seed: "music" });
    expect(plan.total).toBe(5);
    expect(plan.rounds[0]?.drawn).toEqual([]);
  });
});
