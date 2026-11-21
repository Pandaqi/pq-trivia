import { describe, expect, test } from "bun:test";
import {
  allowedLifelines,
  EXTRA_TIME_MS,
  fiftyFifty,
  lifelineCost,
  lifelineFits,
  Lifeline,
  parseLifeline,
} from "../../src/core/grading/aids";
import { buildQuiz } from "../../src/core/model/quiz";
import { planQuiz } from "../../src/core/plan/plan";
import {
  createSessionState,
  sessionReducer,
  SessionStatus,
} from "../../src/core/session/session";
import { defaultResponse, setOpenText } from "../../src/core/session/responses";
import { remainingOf } from "../../src/core/session/timers";

const choice = buildQuiz(`Question => Pick one
Answers => one | two | three
Correct => one
Type => Choice
`).questions[0];

describe("lifelines", () => {
  test("the spellings people type all work", () => {
    expect(parseLifeline("50/50")).toBe(Lifeline.FiftyFifty);
    expect(parseLifeline("ask the room")).toBe(Lifeline.AskRoom);
    expect(parseLifeline("extra time")).toBe(Lifeline.ExtraTime);
    expect(parseLifeline("cheat")).toBeNull();
  });

  test("restricted mode allows none", () => {
    expect(allowedLifelines(["50/50", "extra-time"], true)).toEqual([]);
    expect(allowedLifelines(["50/50", "extra-time"], false)).toEqual([
      Lifeline.FiftyFifty,
      Lifeline.ExtraTime,
    ]);
  });

  test("each one costs points", () => {
    expect(lifelineCost([])).toBe(0);
    expect(lifelineCost([Lifeline.FiftyFifty])).toBe(1);
    expect(lifelineCost([Lifeline.FiftyFifty, Lifeline.AskRoom])).toBe(3);
  });

  test("a lifeline fits the question it sits on", () => {
    const matrix = buildQuiz(`
Question => Mark each row
Answers => True | False
Rows => One | Two
Correct => True | False
Type => Matrix
`).questions[0];
    if (choice === undefined || matrix === undefined) {
      throw new Error("fixture is broken");
    }
    expect(lifelineFits(Lifeline.FiftyFifty, choice)).toBe(true);
    expect(lifelineFits(Lifeline.FiftyFifty, matrix)).toBe(false);
    expect(lifelineFits(Lifeline.ExtraTime, choice)).toBe(false);
  });

  test("50/50 takes away two wrong answers", () => {
    if (choice === undefined) {
      throw new Error("fixture is broken");
    }
    const gone = fiftyFifty(choice, "music");
    expect(gone.length).toBe(2);
    expect(new Set(gone).size).toBe(2);
  });

  test("the same seed hides the same two", () => {
    if (choice === undefined) {
      throw new Error("fixture is broken");
    }
    expect(fiftyFifty(choice, "music")).toEqual(fiftyFifty(choice, "music"));
  });
});

describe("undo and extra time in the session", () => {
  const plan = planQuiz(
    buildQuiz(`Question => First
Answers => a

Question => Second
Answers => b
`),
  );
  const loaded = sessionReducer(
    createSessionState(),
    { type: "load/success", plan },
    0,
  );
  const first = plan.questions[0];
  if (first === undefined) {
    throw new Error("fixture is broken");
  }

  test("the first answer leaves one step back", () => {
    const answered = sessionReducer(
      loaded,
      {
        type: "response/set",
        questionId: first.id,
        response: setOpenText(defaultResponse(first), "a"),
      },
      10,
    );
    expect(answered.undo?.questionId).toBe(first.id);
    const undone = sessionReducer(answered, { type: "undo" }, 20);
    expect(undone.responses[first.id]).toEqual(
      loaded.responses[first.id] ?? undone.responses[first.id],
    );
    expect(undone.undo).toBeNull();
  });

  test("an undo with nothing to undo changes nothing", () => {
    expect(sessionReducer(loaded, { type: "undo" }, 0)).toBe(loaded);
  });

  test("extra time buys milliseconds, not progress", () => {
    const timed = planQuiz(
      buildQuiz(`Question => Fast
Answers => a
Timer => 10
`),
    );
    const state = sessionReducer(
      createSessionState(),
      { type: "load/success", plan: timed },
      0,
    );
    const started = sessionReducer(state, { type: "nav/next" }, 1000);
    expect(started.status).toBe(SessionStatus.Playing);
    const before = started.timer;
    if (before === null) {
      throw new Error("no timer");
    }
    const after = sessionReducer(
      started,
      {
        type: "timer/extend",
        questionId: before.questionId,
        ms: EXTRA_TIME_MS,
      },
      1000,
    );
    expect(after.timer?.totalMs).toBe(before.totalMs + EXTRA_TIME_MS);
    expect(remainingOf(after.timer ?? before, 1500)).toBe(
      remainingOf(before, 1500) + EXTRA_TIME_MS,
    );
  });

  test("team mode keeps two sets of answers apart", () => {
    const teams = sessionReducer(
      loaded,
      { type: "team/start", names: ["Red", "Blue"] },
      0,
    );
    expect(teams.team).toBe(0);
    const red = sessionReducer(
      teams,
      {
        type: "response/set",
        questionId: first.id,
        response: setOpenText(defaultResponse(first), "red"),
      },
      10,
    );
    const blue = sessionReducer(red, { type: "team/switch", index: 1 }, 20);
    expect(blue.responses[first.id]).not.toEqual(red.responses[first.id]);
    const back = sessionReducer(blue, { type: "team/switch", index: 0 }, 30);
    expect(back.responses[first.id]).toEqual(red.responses[first.id]);
    expect(back.teams[0]?.name).toBe("Red");
  });
});
