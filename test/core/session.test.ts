import { describe, expect, test } from "bun:test";
import { buildQuiz } from "../../src/core/model/quiz";
import { answerRefs } from "../../src/core/model/answers";
import { planQuiz } from "../../src/core/plan/plan";
import {
  createSessionState,
  currentQuestion,
  progressOf,
  PlayMode,
  sessionReducer,
  SessionStatus,
} from "../../src/core/session/session";
import {
  AttemptJournal,
  createAttempt,
  type TimerApi,
} from "../../src/core/session/attempts";
import { MemoryStorage } from "../../src/core/session/storage";
import {
  defaultResponse,
  isEmptyResponse,
  ResponseKind,
  toggleChoice,
} from "../../src/core/session/responses";
import { QuestionType } from "../../src/core/model/question";

const model = buildQuiz(`
## Round
Question => Pick one
Answers => A | B | C
Type => Choice

Question => Write a number
Answers => 7
Type => Range

Question => Fill [blank] and [blank].
Answers => one | two
Type => Cloze
`);

const plan = planQuiz(model, { addMissingSectionScreens: false });

describe("session", () => {
  test("loads a plan and seeds responses", () => {
    const ready = sessionReducer(
      createSessionState(),
      { type: "load/success", plan },
      0,
    );
    expect(ready.status).toBe(SessionStatus.Ready);
    expect(ready.index).toBe(-1);
    expect(Object.keys(ready.responses)).toHaveLength(3);
    expect(ready.responses[plan.questions[0]?.id ?? ""]?.kind).toBe(
      ResponseKind.Choice,
    );
  });

  test("walks from start to end", () => {
    let state = sessionReducer(
      createSessionState(),
      { type: "load/success", plan },
      0,
    );
    state = sessionReducer(state, { type: "nav/next" }, 100);
    expect(state.index).toBe(0);
    expect(currentQuestion(state)?.id).toBe(plan.questions[0]?.id);
    expect(state.status).toBe(SessionStatus.Playing);
    expect(state.startedAt).toBe(100);
    state = sessionReducer(state, { type: "nav/next" }, 200);
    state = sessionReducer(state, { type: "nav/next" }, 300);
    expect(state.index).toBe(2);
    expect(state.status).toBe(SessionStatus.Playing);
    state = sessionReducer(state, { type: "nav/next" }, 400);
    expect(state.index).toBe(3);
    expect(state.status).toBe(SessionStatus.Finished);
    expect(state.endedAt).toBe(400);
  });

  test("choice responses are sets of answer IDs", () => {
    const question = plan.questions[0];
    if (question === undefined) {
      throw new Error("no question");
    }
    const refs = answerRefs(question);
    const firstId = refs[0]?.id ?? "";
    const thirdId = refs[2]?.id ?? "";
    let response = defaultResponse(question);
    let state = sessionReducer(
      createSessionState(),
      { type: "load/success", plan },
      0,
    );
    state = sessionReducer(
      state,
      { type: "answer/toggle", questionId: question.id, answerId: firstId },
      0,
    );
    state = sessionReducer(
      state,
      { type: "answer/toggle", questionId: question.id, answerId: thirdId },
      0,
    );
    response = state.responses[question.id] ?? response;
    expect(response.kind).toBe(ResponseKind.Choice);
    if (response.kind === ResponseKind.Choice) {
      expect([...response.selected]).toEqual([firstId, thirdId]);
    }
    response = toggleChoice(response, firstId);
    if (response.kind === ResponseKind.Choice) {
      expect([...response.selected]).toEqual([thirdId]);
    }
  });

  test("progress counts real answers only", () => {
    let state = sessionReducer(
      createSessionState(),
      { type: "load/success", plan },
      0,
    );
    expect(progressOf(state).answered).toBe(0);
    const cloze = plan.questions[2];
    if (cloze === undefined) {
      throw new Error("no cloze question");
    }
    expect(cloze.type).toBe(QuestionType.Cloze);
    const response = state.responses[cloze.id];
    expect(response && isEmptyResponse(response)).toBe(true);
    state = sessionReducer(
      state,
      {
        type: "response/set",
        questionId: cloze.id,
        response: { kind: ResponseKind.Cloze, blanks: ["one", ""] },
      },
      0,
    );
    expect(progressOf(state).answered).toBe(1);
    expect(progressOf(state).percent).toBe(33);
  });

  test("reordering keeps answers and clamps the index", () => {
    let state = sessionReducer(
      createSessionState(),
      { type: "load/success", plan },
      0,
    );
    state = sessionReducer(state, { type: "nav/next" }, 10);
    const first = plan.questions[0];
    if (first === undefined) {
      throw new Error("no question");
    }
    const answerId = answerRefs(first)[0]?.id ?? "";
    state = sessionReducer(
      state,
      { type: "answer/toggle", questionId: first.id, answerId },
      10,
    );

    const reversed = { ...plan, questions: [...plan.questions].reverse() };
    const next = sessionReducer(
      state,
      { type: "plan/replace", plan: reversed },
      10,
    );

    expect(next.plan?.questions[0]?.id).toBe(plan.questions[2]?.id);
    expect(Object.keys(next.responses)).toHaveLength(3);
    expect(next.responses[first.id]).toEqual(state.responses[first.id]);
  });

  test("mode and restart are plain transitions", () => {
    let state = sessionReducer(
      createSessionState(),
      { type: "load/success", plan },
      0,
    );
    state = sessionReducer(state, { type: "nav/next" }, 0);
    state = sessionReducer(
      state,
      { type: "mode/set", mode: PlayMode.Answers },
      0,
    );
    expect(state.mode).toBe(PlayMode.Answers);
    state = sessionReducer(state, { type: "nav/restart" }, 0);
    expect(state.index).toBe(-1);
    expect(state.status).toBe(SessionStatus.Ready);
    expect(Object.keys(state.responses)).toHaveLength(0);
  });
});

describe("attempt autosave", () => {
  test("typing queues one write instead of one per key", async () => {
    let pending: (() => void) | null = null;
    const timers: TimerApi = {
      schedule: (callback) => {
        pending = callback;
        return 1;
      },
      cancel: () => {
        pending = null;
      },
    };
    const journal = new AttemptJournal(new MemoryStorage(), "quiz", {
      debounceMs: 300,
      timers,
    });
    const record = (index: number): ReturnType<typeof createAttempt> =>
      createAttempt(
        "quiz",
        "Title",
        {
          seed: "",
          shuffleQuestions: false,
          shuffleRounds: false,
          mode: PlayMode.Questions,
          restricted: false,
        },
        {
          index,
          status: "playing",
          responses: {},
          startedAt: 0,
          endedAt: null,
          report: null,
          savedAt: index,
        },
      );

    journal.saveSoon(() => record(1));
    journal.saveSoon(() => record(2));
    journal.saveSoon(() => record(3));
    expect(pending).not.toBeNull();
    (pending as unknown as () => void)();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const history = await journal.history();
    expect(history).toHaveLength(1);
    expect(history[0]?.index).toBe(3);
  });
});
