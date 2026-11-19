import { describe, expect, test } from "bun:test";
import { quizToEmbedded } from "../../src/core/export/embedded";
import { createQuiz } from "../../src/core/quiz";
import { SessionStatus } from "../../src/core/session/session";
import { browserAnswerKey, encryptQuiz } from "../../src/platform/answerKey";

const TEXT = [
  "Title: Locked Quiz",
  "",
  "Question => What is 2 + 2?",
  "Answer => 4",
  "",
  "Question => Name a primary colour.",
  "Answer => red",
].join("\n");

describe("encrypted answers", () => {
  test("the envelope hides the answers", async () => {
    const payload = await encryptQuiz(quizToEmbedded(TEXT), "open sesame");
    expect(payload.format).toBe("pq-encrypted");
    expect(payload.version).toBe(1);
    const packed = JSON.stringify(payload);
    expect(packed).not.toContain("correct");
    expect(packed).not.toContain("2 + 2");
  });

  test("loading waits for a passphrase", async () => {
    const payload = await encryptQuiz(quizToEmbedded(TEXT), "open sesame");
    const quiz = createQuiz({ config: { answersKey: browserAnswerKey } });
    await quiz.load({ type: "encrypted", data: payload });
    expect(quiz.locked()).toBe(true);
    expect(quiz.state.status).toBe(SessionStatus.Error);
    expect(quiz.state.plan).toBeNull();
  });

  test("the right passphrase opens it, the wrong one does not", async () => {
    const payload = await encryptQuiz(quizToEmbedded(TEXT), "open sesame");
    const quiz = createQuiz({ config: { answersKey: browserAnswerKey } });
    await quiz.load({ type: "encrypted", data: payload });

    expect(await quiz.unlock("guess")).toBe(false);
    expect(quiz.locked()).toBe(true);

    expect(await quiz.unlock("open sesame")).toBe(true);
    expect(quiz.locked()).toBe(false);
    expect(quiz.state.plan?.total).toBe(2);
    expect(quiz.state.status).not.toBe(SessionStatus.Error);
  });

  test("without a key the file stays locked", async () => {
    const payload = await encryptQuiz(quizToEmbedded(TEXT), "open sesame");
    const quiz = createQuiz();
    await quiz.load({ type: "encrypted", data: payload });
    expect(quiz.locked()).toBe(true);
    expect(await quiz.unlock("open sesame")).toBe(false);
  });
});
