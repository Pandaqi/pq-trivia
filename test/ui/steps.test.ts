/**
 * A staged question in a real DOM: the parts arrive, and they arrive in order.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Quiz } from "../../src/core/quiz/class";
import { mountQuiz, type MountedQuiz } from "../../src/renderers/preact/mount";
import { installDom, settleDom, type TestDom } from "./dom";

const TEXT = `Title => Steps
Seed => steps

Question => Wait for it
Media => clip.mp4
Steps => media | question | answers
Answers => One | Two | Three
`;

/** Preact draws effects on a frame, so poll instead of guessing a delay. */
async function waitFor(ready: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (ready()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

const has = (selector: string): boolean =>
  document.querySelector(selector) !== null;

let dom: TestDom;
let mounted: MountedQuiz;
let quiz: Quiz;

beforeAll(async () => {
  dom = installDom();
  const host = document.createElement("div");
  document.body.append(host);
  quiz = new Quiz({ text: TEXT });
  mounted = mountQuiz(quiz, host, { attempts: false, printSheet: false });
  await quiz.loading;
  quiz.goTo(0);
  await waitFor(() => has(".pq-step-bar"));
});

afterAll(async () => {
  mounted?.destroy();
  await settleDom();
  dom?.uninstall();
});

describe("a staged question", () => {
  test("starts with the media alone", () => {
    expect(has(".pq-media")).toBe(true);
    expect(has(".pq-header")).toBe(false);
    expect(has(".pq-answers")).toBe(false);
    expect(document.querySelector(".pq-step-bar")?.textContent).toContain(
      "Step 1 of 3",
    );
  });

  test("brings in the question, then the answers", async () => {
    expect(quiz.nextStep()).toBe(true);
    await waitFor(() => has(".pq-header"));
    expect(document.querySelector(".pq-header")?.textContent).toContain(
      "Wait for it",
    );
    expect(has(".pq-answers")).toBe(false);

    expect(quiz.nextStep()).toBe(true);
    await waitFor(() => has(".pq-answers"));
    expect(has(".pq-answers")).toBe(true);
  });

  test("stops asking for another step at the end", () => {
    expect(quiz.nextStep()).toBe(false);
    expect(has(".pq-step-bar")).toBe(false);
  });
});
