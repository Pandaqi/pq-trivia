import { describe, expect, test } from "bun:test";
import { createQuiz } from "../../src/core/session/quiz";
import { PlayMode, SessionStatus } from "../../src/core/session/session";
import { ScreenKind } from "../../src/core/session/viewModel";
import { ResponseKind } from "../../src/core/session/responses";

const text = `
# Round
Question => Pick one
Answers => A | B | C
Type => Choice
Correct => B

Question => Fill [blank].
Answers => here
Type => Cloze
`;

describe("createQuiz", () => {
  test("loads, starts at the start screen, and walks", async () => {
    const quiz = createQuiz();
    await quiz.load({ type: "text", text });
    expect(quiz.state.status).toBe(SessionStatus.Ready);
    expect(quiz.state.plan?.total).toBe(2);
    expect(quiz.currentScreen()?.kind).toBe(ScreenKind.Start);

    const screens: ScreenKind[] = [];
    quiz.subscribe((_state, screen) => {
      if (screen) {
        screens.push(screen.kind);
      }
    });

    expect(quiz.next().ok).toBe(true);
    expect(quiz.currentScreen()?.kind).toBe(ScreenKind.Question);
    expect(screens).toContain(ScreenKind.Question);

    expect(quiz.next().ok).toBe(true);
    expect(quiz.next().ok).toBe(true);
    expect(quiz.currentScreen()?.kind).toBe(ScreenKind.End);
    expect(quiz.next()).toEqual({ ok: false, reason: "end" });
    quiz.destroy();
  });

  test("question mode carries no correct answers", async () => {
    const quiz = createQuiz();
    await quiz.load({ type: "text", text });
    quiz.next();
    const screen = quiz.currentScreen();
    if (screen?.kind !== ScreenKind.Question) {
      throw new Error("expected a question screen");
    }
    expect(screen.answers.map((answer) => answer.correct)).toEqual([
      null,
      null,
      null,
    ]);
    expect(screen.explanation).toBeNull();

    quiz.setMode(PlayMode.Answers);
    const revealed = quiz.currentScreen();
    if (revealed?.kind !== ScreenKind.Question) {
      throw new Error("expected a question screen");
    }
    expect(
      revealed.answers.filter((answer) => answer.correct === true),
    ).toHaveLength(1);
    quiz.destroy();
  });

  test("responses go in and come out", async () => {
    const quiz = createQuiz();
    await quiz.load({ type: "text", text });
    quiz.next();
    const questionId = quiz.state.plan?.questions[0]?.id ?? "";
    let seen = false;
    quiz.on("response:change", (payload) => {
      seen = payload.id === questionId;
    });
    quiz.setResponse(questionId, { kind: ResponseKind.Open, text: "hello" });
    expect(seen).toBe(true);
    expect(quiz.progress().answered).toBe(1);
    quiz.destroy();
  });

  test("events fire, bad handlers do not crash the quiz", async () => {
    const quiz = createQuiz();
    let readyTotal = 0;
    quiz.on("ready", (payload) => {
      readyTotal = payload.total;
    });
    quiz.on("question:enter", () => {
      throw new Error("bad handler");
    });
    await quiz.load({ type: "text", text });
    await quiz.ready();
    expect(readyTotal).toBe(2);
    quiz.next();
    expect(quiz.currentScreen()?.kind).toBe(ScreenKind.Question);
    expect(
      quiz
        .diagnostics()
        .some((diagnostic) => diagnostic.message.includes("bad handler")),
    ).toBe(true);
    quiz.destroy();
  });

  test("export still works after loading", async () => {
    const quiz = createQuiz();
    await quiz.load({ type: "text", text });
    const data = quiz.export.embedded({ compact: true });
    expect(Object.keys(data.questions)).toHaveLength(2);
    quiz.destroy();
  });

  test("a broken load is an error state, not a throw", async () => {
    const quiz = createQuiz();
    await quiz.load({ type: "inline", data: { nope: true } });
    expect(quiz.state.status).toBe(SessionStatus.Error);
    expect(quiz.state.plan).toBeNull();
    expect(quiz.diagnostics().length).toBeGreaterThan(0);
    quiz.destroy();
  });

  test("an empty file is an error, not an empty quiz", async () => {
    const quiz = createQuiz();
    await quiz.load({ type: "text", text: "\n\n// nothing here\n" });
    expect(quiz.state.status).toBe(SessionStatus.Error);
    expect(quiz.currentScreen()).toBeNull();
    expect(
      quiz
        .diagnostics()
        .some((diagnostic) => diagnostic.message.includes("no questions")),
    ).toBe(true);
    quiz.destroy();
  });
});
