import { describe, expect, test } from "bun:test";
import { ScoringMethod } from "../../src/core/model/question";
import { buildQuiz } from "../../src/core/model/quiz";
import { planQuiz } from "../../src/core/plan/plan";
import {
  createSessionState,
  PlayMode,
  progressOf,
  sessionReducer,
} from "../../src/core/session/session";
import { questionScreen } from "../../src/core/session/viewModel";

const plan = planQuiz(
  buildQuiz(`
Question => Pick one
Answers => A | B | C
Type => Choice
Correct => A
Score => 2

Question => Fill [blank] and [blank].
Answers => one | two
Type => Cloze
Score => 4
Scoring => partial
`),
);

const first = plan.questions[0];
if (first === undefined) {
  throw new Error("fixture lost its question");
}

function view(): Parameters<typeof questionScreen>[2] {
  return {
    index: 0,
    total: plan.questions.length,
    progress: progressOf(createSessionState()),
    roundName: null,
    roundSecret: null,
    roundNumber: null,
    isRoundStart: false,
  };
}

function loaded(): ReturnType<typeof createSessionState> {
  return sessionReducer(
    createSessionState(),
    { type: "load/success", plan },
    0,
  );
}

describe("answer points", () => {
  test("question mode carries no points in the view model", () => {
    const screen = questionScreen(first, loaded(), view());
    expect(screen.answers.map((answer) => answer.points)).toEqual([
      null,
      null,
      null,
    ]);
    expect(screen.answers.map((answer) => answer.correct)).toEqual([
      null,
      null,
      null,
    ]);
  });

  test("answer mode puts the score on the correct answer only", () => {
    const state = sessionReducer(
      loaded(),
      { type: "mode/set", mode: PlayMode.Answers },
      0,
    );
    const screen = questionScreen(first, state, view());
    expect(screen.answers.map((answer) => answer.points)).toEqual([
      2,
      null,
      null,
    ]);
  });

  test("partial scoring splits the points between correct answers", () => {
    const cloze = plan.questions[1];
    if (cloze === undefined) {
      throw new Error("fixture lost its question");
    }
    const state = sessionReducer(
      loaded(),
      { type: "mode/set", mode: PlayMode.Answers },
      0,
    );
    expect(cloze.scoring).toBe(ScoringMethod.Partial);
    expect(
      questionScreen(cloze, state, view()).answers.map((a) => a.points),
    ).toEqual([2, 2]);
  });
});
