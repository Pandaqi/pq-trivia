import { describe, expect, test } from "bun:test";
import { createQuiz } from "../../src/core/session/quiz";
import { PlayMode, SessionStatus } from "../../src/core/session/session";
import { ScreenKind } from "../../src/core/session/viewModel";
import { ResponseKind } from "../../src/core/session/responses";
import { QuestionType } from "../../src/core/model/question";

const text = `
## Round
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

    // A round opens with its own page, like V2.
    expect(quiz.next().ok).toBe(true);
    expect(quiz.currentScreen()?.kind).toBe(ScreenKind.Question);
    const section = quiz.currentScreen();
    if (section?.kind !== ScreenKind.Question) {
      throw new Error("expected the section page");
    }
    expect(section.type).toBe(QuestionType.Section);
    expect(screens).toContain(ScreenKind.Question);

    expect(quiz.next().ok).toBe(true);
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
    quiz.next();
    const questionId =
      quiz.state.plan?.questions.find(
        (question) => question.type !== QuestionType.Section,
      )?.id ?? "";
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

  test("a section screen opens a round and never blocks next", async () => {
    const quiz = createQuiz({ config: { addMissingSectionScreens: true } });
    await quiz.load({
      type: "text",
      text: "## First\nQuestion => One\n## Second\nQuestion => Two",
    });
    expect(quiz.state.plan?.questions[0]?.type).toBe(QuestionType.Section);
    quiz.setMode(PlayMode.Answers);
    expect(quiz.next().ok).toBe(true);
    expect(quiz.currentScreen()?.kind).toBe(ScreenKind.Question);
    quiz.destroy();
  });

  test("config filters and score clamps are applied before the plan", async () => {
    const quiz = createQuiz({
      config: {
        include: { category: "history" },
        minScore: 2,
        maxScore: 3,
        possibleAuthors: ["someone"],
      },
    });
    await quiz.load({
      type: "text",
      text: `Question => One\nAnswers => A | B\nType => Choice\nCorrect => A\nCategory => history\nAuthor => other\n\nQuestion => Two\nAnswers => C | D\nType => Choice\nCorrect => C\nCategory => sport`,
    });
    expect(quiz.state.plan?.questions).toHaveLength(1);
    expect(quiz.state.plan?.questions[0]?.score).toBe(2);
    expect(
      quiz
        .diagnostics()
        .some((diagnostic) => diagnostic.message.includes("possibleAuthors")),
    ).toBe(true);
    quiz.destroy();
  });

  test("a hidden source step is skipped by Next", async () => {
    const quiz = createQuiz({ config: { showSources: false } });
    await quiz.load({
      type: "text",
      text: [
        "Question => Which one?",
        "Answers => A | B",
        "Steps => question | sources | answers",
        "Sources => https://example.test/where",
      ].join("\n"),
    });
    quiz.goTo(0);
    const screen = quiz.currentScreen();
    if (screen?.kind !== ScreenKind.Question) {
      throw new Error("expected a question screen");
    }
    expect(screen.steps.total).toBe(2);
    expect(quiz.nextStep()).toBe(true);
    const after = quiz.currentScreen();
    if (after?.kind !== ScreenKind.Question) {
      throw new Error("expected a question screen after the step");
    }
    expect(after.steps.total).toBe(2);
    // There is no hidden source slide left to eat another press.
    expect(quiz.nextStep()).toBe(false);
    quiz.destroy();
  });

  test("the reveal toggle puts the answer away again", async () => {
    const quiz = createQuiz();
    await quiz.load({ type: "text", text });
    // The start screen has no question, so there is nothing to toggle.
    expect(quiz.toggleReveal()).toBe(false);

    quiz.next();
    quiz.next();
    const id =
      quiz.state.plan?.questions.find(
        (question) => question.type !== QuestionType.Section,
      )?.id ?? "";

    // V2's `a`: show, press again, gone, press again, back.
    expect(quiz.toggleReveal()).toBe(true);
    expect(quiz.state.revealed).toContain(id);
    const shown = quiz.currentScreen();
    if (shown?.kind !== ScreenKind.Question) {
      throw new Error("expected a question screen");
    }
    expect(shown.revealed).toBe(true);

    expect(quiz.toggleReveal()).toBe(true);
    expect(quiz.state.revealed).not.toContain(id);
    const hidden = quiz.currentScreen();
    if (hidden?.kind !== ScreenKind.Question) {
      throw new Error("expected a question screen");
    }
    expect(hidden.revealed).toBe(false);

    expect(quiz.toggleReveal()).toBe(true);
    expect(quiz.state.revealed).toContain(id);

    // `reveal()` is the sticky one the host calls: it never takes it back.
    expect(quiz.reveal()).toBe(false);
    expect(quiz.state.revealed).toContain(id);
    expect(quiz.toggleReveal()).toBe(true);
    expect(quiz.state.revealed).not.toContain(id);
    expect(quiz.reveal()).toBe(true);
    expect(quiz.state.revealed).toContain(id);
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
        .some((diagnostic) => diagnostic.message === "Quiz is empty."),
    ).toBe(true);
    quiz.destroy();
  });
});
