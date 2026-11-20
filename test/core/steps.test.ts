import { describe, expect, test } from "bun:test";
import { ANIMATIONS, AnimationId } from "../../src/animations/registry";
import { buildQuiz } from "../../src/core/model/quiz";
import {
  parseSteps,
  StepPart,
  stepViewOf,
  STEP_PARTS,
  STEP_TRANSITIONS,
} from "../../src/core/model/steps";
import { planQuiz } from "../../src/core/plan/plan";
import {
  createSessionState,
  PlayMode,
  progressOf,
  sessionReducer,
} from "../../src/core/session/session";
import { questionScreen } from "../../src/core/session/viewModel";

const TEXT = `
Question => Who is superman?
Answers => Clark Kent | Bruce Wayne | Peter Parker

Question => Which clip is this?
Media => intro.mp4
Steps => media | question | answers
Answers => Song A | Song B
`;

const plan = planQuiz(buildQuiz(TEXT));
const plain = plan.questions[0];
const staged = plan.questions[1];
if (plain === undefined || staged === undefined) {
  throw new Error("fixture lost a question");
}

const partsOf = (raw: readonly string[]): (readonly StepPart[])[] =>
  parseSteps(raw).map((step) => step.parts);

const enteredOf = (raw: readonly string[]): Record<string, string | null> => {
  const out: Record<string, string | null> = {};
  for (const entry of parseSteps(raw).flatMap((step) => step.entered)) {
    out[entry.part] = entry.transition;
  }
  return out;
};

function view(): Parameters<typeof questionScreen>[2] {
  return {
    index: 0,
    total: plan.questions.length,
    progress: progressOf(createSessionState()),
    roundName: null,
    roundSecret: null,
    roundNumber: null,
    roundPosition: 0,
    roundQuestionCount: plan.questions.length,
    roundPoints: 0,
    seed: plan.seed,
    isRoundStart: false,
    authorsDiverse: false,
    categoriesDiverse: false,
  };
}

function loaded(): ReturnType<typeof createSessionState> {
  return sessionReducer(
    createSessionState(),
    { type: "load/success", plan },
    0,
  );
}

describe("the step plan", () => {
  test("nothing declared means one screen with everything on it", () => {
    expect(parseSteps([])).toEqual([]);
    expect(
      stepViewOf({
        steps: [],
        transition: null,
        defaults: {},
        step: 0,
        complete: false,
      }).total,
    ).toBe(1);
  });

  test("each entry adds to the one before", () => {
    // The last step also picks up the parts nobody named, so it is complete.
    expect(partsOf(["media|question|answers"])).toEqual([
      [StepPart.Media],
      [StepPart.Media, StepPart.Question],
      [...STEP_PARTS],
    ]);
  });

  test("`all` brings in the rest, and unnamed parts join the last step", () => {
    expect(partsOf(["media|all"])).toEqual([[StepPart.Media], [...STEP_PARTS]]);
    const last = partsOf(["media|question"]).at(-1) ?? [];
    expect(last).toContain(StepPart.Explanation);
    expect(last).toContain(StepPart.Hints);
  });

  test("a step that adds nothing is not a step", () => {
    expect(parseSteps(["media|media|question"])).toHaveLength(2);
  });
});

describe("transitions between steps", () => {
  test("an animation name sets the entrance for what follows", () => {
    const entered = enteredOf([
      "media",
      "fade",
      "question",
      "slide-up",
      "answers",
    ]);
    expect(entered[StepPart.Media]).toBeNull();
    expect(entered[StepPart.Question]).toBe("fade");
    expect(entered[StepPart.Answers]).toBe("slide-up");
  });

  test("a name stays in force until another changes it", () => {
    const entered = enteredOf(["fade", "question", "answers"]);
    expect(entered[StepPart.Question]).toBe("fade");
    expect(entered[StepPart.Answers]).toBe("fade");
  });

  test("the list of names matches the animation registry", () => {
    expect([...STEP_TRANSITIONS].sort()).toEqual(
      Object.values(AnimationId).sort(),
    );
    expect(Object.keys(ANIMATIONS)).toHaveLength(STEP_TRANSITIONS.length);
  });
});

describe("the step view", () => {
  test("a plain question shows every part", () => {
    const screen = questionScreen(plain, loaded(), view());
    expect(screen.steps.total).toBe(1);
    expect(screen.steps.more).toBe(false);
    expect(screen.steps.visible).toEqual(STEP_PARTS);
    expect(screen.steps.entered).toEqual([]);
  });

  test("the question's own Steps win over the quiz default", () => {
    const screen = questionScreen(staged, loaded(), {
      ...view(),
      defaultSteps: ["question|answers"],
    });
    expect(screen.steps.total).toBe(3);
  });

  test("a header default covers questions that say nothing", () => {
    const screen = questionScreen(plain, loaded(), {
      ...view(),
      defaultSteps: ["question|answers"],
    });
    expect(screen.steps.total).toBe(2);
    expect(screen.steps.visible).toEqual([StepPart.Question]);
    expect(screen.steps.more).toBe(true);
  });

  test("the answer being up shows everything, whatever the step", () => {
    const state = sessionReducer(
      loaded(),
      { type: "mode/set", mode: PlayMode.Answers },
      0,
    );
    const screen = questionScreen(staged, state, view());
    expect(screen.steps.visible).toEqual(STEP_PARTS);
    expect(screen.steps.more).toBe(false);
  });

  test("StepTransition falls back to the quiz default", () => {
    const own = questionScreen(
      { ...staged, stepTransition: "slide-up" },
      loaded(),
      { ...view(), defaultStepTransition: "zoom-in" },
    );
    expect(own.steps.transition).toBe("slide-up");

    const inherited = questionScreen(staged, loaded(), {
      ...view(),
      defaultStepTransition: "zoom-in",
    });
    expect(inherited.steps.transition).toBe("zoom-in");
  });

  test("a part keeps the transition it arrived with", () => {
    const quiz = planQuiz(
      buildQuiz(
        [
          "Question => Wait for it",
          "Media => intro.mp4",
          "Steps => media | fade | question | slide-up | answers",
          "Answers => A | B",
        ].join("\n"),
      ),
    );
    const question = quiz.questions[0];
    if (question === undefined) {
      throw new Error("fixture lost its question");
    }
    const first = questionScreen(question, loaded(), view());
    expect(first.steps.visible).toEqual([StepPart.Media]);

    const later = questionScreen(
      question,
      sessionReducer(loaded(), { type: "step/next" }, 0),
      view(),
    );
    expect(
      later.steps.entered.map((entry) => [entry.part, entry.transition]),
    ).toEqual([
      [StepPart.Media, null],
      [StepPart.Question, "fade"],
    ]);
  });
});

describe("walking the steps", () => {
  test("the reducer counts up, and navigation starts over", () => {
    const first = sessionReducer(loaded(), { type: "step/next" }, 0);
    expect(first.step).toBe(1);
    expect(sessionReducer(first, { type: "nav/next" }, 0).step).toBe(0);
    expect(sessionReducer(first, { type: "nav/goTo", index: 1 }, 0).step).toBe(
      0,
    );
  });

  test("a typo in Steps is reported, not ignored in silence", () => {
    const model = buildQuiz(
      "Question => Which?\nAnswers => A | B\nSteps => media | questoin",
    );
    expect(
      model.diagnostics.some((entry) => entry.message.includes("questoin")),
    ).toBe(true);
  });

  test("a transition name is not reported as a typo", () => {
    const model = buildQuiz(
      "Question => Which?\nAnswers => A | B\nSteps => media | slide-up | answers",
    );
    expect(model.diagnostics).toEqual([]);
  });
});
