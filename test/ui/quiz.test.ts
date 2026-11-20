/**
 * `new Quiz({ text })` is a page on its own, and the paper carries the same
 * hint line the screen does. Both were features with no test; this is that.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  mountPrintSheet,
  type MountedPrintSheet,
} from "../../src/renderers/preact/print/mountPrint";
import { Quiz } from "../../src/renderers/preact/quiz";
import { installDom, type TestDom } from "./dom";

const TEXT = `Title => One liner
Seed => one

# Round one

Question => Pick one.
Answers => One | Two
Correct => One

Question => In which year?
Answers => 1989
Type => Range
`;

let dom: TestDom;

beforeAll(() => {
  dom = installDom();
});

afterAll(() => {
  dom?.uninstall();
});

describe("new Quiz", () => {
  test("mounts into an element by id", async () => {
    const host = document.createElement("div");
    host.id = "quiz";
    document.body.append(host);

    const quiz = new Quiz({ text: TEXT, id: "quiz" });
    await quiz.loading;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.querySelector(".pq-quiz")).not.toBeNull();
    quiz.destroy();
    expect(host.querySelector(".pq-quiz")).toBeNull();
    host.remove();
  });

  test("mounts into the body when given no id", async () => {
    const before = document.querySelectorAll(".pq-quiz").length;
    const quiz = new Quiz({ text: TEXT });
    await quiz.loading;

    expect(document.querySelectorAll(".pq-quiz").length).toBe(before + 1);
    quiz.destroy();
  });
});

describe("print", () => {
  let sheet: MountedPrintSheet;
  let quiz: Quiz;

  beforeAll(async () => {
    quiz = new Quiz({ text: TEXT });
    await quiz.loading;
    const host = document.createElement("div");
    document.body.append(host);
    sheet = mountPrintSheet(quiz, host);
  });

  afterAll(() => {
    sheet?.destroy();
    quiz?.destroy();
  });

  test("a question carries the type hint it carries on screen", () => {
    const hints = [
      ...document.querySelectorAll(".pq-print-sheet .pq-type-hint"),
    ];
    expect(hints.map((node) => node.textContent)).toContain(
      "This is a multiple choice question wanting 1 answer, 1 point each.",
    );
  });

  test("the setting takes the line off the paper", async () => {
    quiz.configure({ printTypeHints: false });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      document.querySelectorAll(".pq-print-sheet .pq-type-hint").length,
    ).toBe(0);
  });
});
