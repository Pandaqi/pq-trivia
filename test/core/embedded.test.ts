import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildQuiz } from "../../src/core/model/quiz";
import { answerRefs } from "../../src/core/model/answers";
import {
  fromEmbedded,
  toEmbedded,
  toEmbeddedJson,
} from "../../src/core/export/embedded";

const fixture = (name: string): Promise<string> =>
  readFile(join(import.meta.dir, "..", "fixtures", name), "utf8");

describe("embedded JSON v3", () => {
  test("survives a round trip", async () => {
    const quiz = buildQuiz(await fixture("simple.trivia"), {
      file: "simple.trivia",
    });
    const data = toEmbedded(quiz);
    const back = fromEmbedded(JSON.parse(JSON.stringify(data))).quiz;

    expect(back.questions.map((question) => question.id)).toEqual(
      quiz.questions.map((question) => question.id),
    );
    expect(back.questions.map((question) => question.type)).toEqual(
      quiz.questions.map((question) => question.type),
    );
    expect(back.questions.map((question) => question.score)).toEqual(
      quiz.questions.map((question) => question.score),
    );
    expect(back.rounds.map((round) => round.name)).toEqual(
      quiz.rounds.map((round) => round.name),
    );
    expect(back.meta.title).toBe(quiz.meta.title);

    const original = quiz.questions[0];
    const restored = back.questions[0];
    expect(restored?.answers.map((answer) => answer.text)).toEqual(
      original?.answers.map((answer) => answer.text),
    );
    expect(restored?.correct.map((value) => value.text)).toEqual(
      original?.correct.map((value) => value.text),
    );
  });

  test("correct answers travel as IDs", async () => {
    const quiz = buildQuiz(await fixture("simple.trivia"));
    const data = toEmbedded(quiz);
    const first = quiz.questions[0];
    if (first === undefined) {
      throw new Error("no question");
    }
    const firstId = answerRefs(first)[0]?.id ?? "";
    expect([...(data.questions[first.id]?.correct ?? [])]).toEqual([firstId]);
  });

  test("compact and pretty parse the same", async () => {
    const quiz = buildQuiz(await fixture("all-types.trivia"));
    const compact = toEmbeddedJson(quiz, { compact: true, pretty: false });
    const readable = toEmbeddedJson(quiz, { compact: true });
    const a = fromEmbedded(JSON.parse(compact)).quiz;
    const b = fromEmbedded(JSON.parse(readable)).quiz;
    expect(JSON.stringify(a.questions)).toBe(JSON.stringify(b.questions));
  });

  test("garbage is a diagnostic, not a crash", () => {
    const result = fromEmbedded({ nope: true });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.quiz.questions).toHaveLength(0);
  });
});
