import { describe, expect, test } from "bun:test";
import {
  applyFlow,
  evaluateFlow,
  parseFlow,
  type FlowContext,
} from "../../src/core/session/flow";
import { buildQuiz } from "../../src/core/model/quiz";
import { planQuiz } from "../../src/core/plan/plan";
import { ResponseKind } from "../../src/core/session/responses";
import { nextCheck, InteractivePolicy } from "../../src/core/session/policies";
import {
  createSessionState,
  PlayMode,
  sessionReducer,
} from "../../src/core/session/session";

const quiz = buildQuiz(`
Question => Warm up
Answers => A
Score => 1
ID => warm

Question => Unlocked only after a correct answer
Answers => B
When => correct(warm) and score >= 1
ID => bonus

Question => Always here
Answers => C
ID => always
`);

const plan = planQuiz(quiz);

const emptyContext: FlowContext = {
  score: 0,
  round: null,
  correct: new Set(),
  wrong: new Set(),
  answered: new Set(),
};

describe("flow expressions", () => {
  test("calls, comparisons and booleans", () => {
    const parsed = parseFlow('correct(a) and (score >= 3 or round = "Bonus")');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(
      evaluateFlow(parsed.node, {
        ...emptyContext,
        score: 4,
        correct: new Set(["a"]),
      }),
    ).toBe(true);
    expect(
      evaluateFlow(parsed.node, {
        ...emptyContext,
        score: 1,
        correct: new Set(["a"]),
      }),
    ).toBe(false);
  });

  test("not and unknown names fail kindly", () => {
    const parsed = parseFlow("not wrong(a)");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(evaluateFlow(parsed.node, emptyContext)).toBe(true);
    }
    const bad = parseFlow("Score >>> 3");
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error.length).toBeGreaterThan(0);
    }
  });

  test("a bad expression keeps the question and reports the reason", () => {
    const broken = planQuiz(
      buildQuiz(`
Question => Hidden
Answers => A
When => nonsense(
`),
    );
    const result = applyFlow(broken, {});
    expect(result.plan.questions.length).toBe(1);
    expect(result.problems.length).toBeGreaterThan(0);
  });
});

describe("flow plans", () => {
  test("a locked question is not in the plan yet", () => {
    const result = applyFlow(plan, {});
    expect(result.plan.questions.map((question) => question.id)).not.toContain(
      "bonus",
    );
    expect(result.plan.total).toBe(2);
  });

  test("a correct answer unlocks it", () => {
    const result = applyFlow(plan, {
      warm: { kind: ResponseKind.Open, text: "A" },
    });
    expect(result.plan.questions.map((question) => question.id)).toContain(
      "bonus",
    );
    expect(result.plan.maxScore).toBe(3);
  });

  test("a wrong answer keeps it locked", () => {
    const result = applyFlow(plan, {
      warm: { kind: ResponseKind.Open, text: "nope" },
    });
    expect(result.plan.questions.map((question) => question.id)).not.toContain(
      "bonus",
    );
  });
});

describe("next checks", () => {
  const loaded = sessionReducer(
    createSessionState(),
    { type: "load/success", plan },
    0,
  );
  const typing = sessionReducer(
    sessionReducer(loaded, { type: "nav/next" }, 0),
    { type: "interactive/set", interactive: true },
    0,
  );
  const playing = sessionReducer(
    typing,
    { type: "mode/set", mode: PlayMode.Answers },
    0,
  );

  test("required asks for something in interactive play", () => {
    const check = nextCheck(typing, InteractivePolicy.Required);
    expect(check.issues.length).toBe(1);
    expect(check.blocked).toBe(false);
  });

  test("permissive never blocks", () => {
    const check = nextCheck(typing, InteractivePolicy.Permissive);
    expect(check.issues).toEqual([]);
  });

  test("read-aloud play has no fields, so it never asks", () => {
    const check = nextCheck(
      sessionReducer(
        typing,
        { type: "interactive/set", interactive: false },
        0,
      ),
      InteractivePolicy.Required,
    );
    expect(check.issues).toEqual([]);
  });

  test("answer mode is presentation, not input", () => {
    const check = nextCheck(playing, InteractivePolicy.Required);
    expect(check.issues).toEqual([]);
  });
});
