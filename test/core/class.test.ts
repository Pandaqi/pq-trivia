import { describe, expect, test } from "bun:test";
import { Quiz } from "../../src/core/session/quiz";
import { SessionStatus } from "../../src/core/session/session";

const TEXT = `Title => One liner
Seed => one

Question => Ready?
Answers => Yes
`;

describe("new Quiz", () => {
  test("loads the text it was given", async () => {
    const quiz = new Quiz({ text: TEXT, file: "one.trivia" });
    await quiz.loading;

    expect(quiz.state.status).toBe(SessionStatus.Ready);
    expect(quiz.meta?.title).toBe("One liner");
    expect(quiz.sourceText()).toBe(TEXT);
  });

  test("takes any other input as load", async () => {
    const quiz = new Quiz({ load: { type: "text", text: TEXT } });
    await quiz.loading;

    expect(quiz.state.plan?.total).toBe(1);
  });

  test("without input it waits for load()", async () => {
    const quiz = new Quiz();
    // Not undefined: a helper can always await it, promise or not.
    expect(quiz.loading).toBeInstanceOf(Promise);
    await quiz.loading;

    expect(quiz.state.plan).toBeNull();
    expect(quiz.state.status).not.toBe(SessionStatus.Error);
  });

  test("loading follows a load started later", async () => {
    const quiz = new Quiz();
    const loading = quiz.load({ type: "text", text: TEXT });

    expect(quiz.loading).toBe(loading);
    await loading;
    expect(quiz.state.plan?.total).toBe(1);
  });
});
