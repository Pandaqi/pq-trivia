/**
 * The settings panel and the notes inside it.
 *
 * A note takes the first Escape. The panel waits its turn. One press that does
 * two things is a press that made the user open the panel again.
 */

import { afterAll, beforeAll, expect, test } from "bun:test";
import { Quiz } from "../../src/core/quiz/class";
import { mountQuiz, type MountedQuiz } from "../../src/renderers/preact/mount";
import { installDom, type TestDom } from "./dom";

const TEXT = `Title => Escape test
Seed => escape-test

## Round one

Question => Type your answer.
Answers => Something
`;

/**
 * Preact flushes effects on a frame, not on the click that caused them. A
 * short wait covers the frame; `setTimeout(0)` alone is not enough here.
 */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

/** The node is in the page before its effects are, so wait for both. */
async function waitFor(check: () => boolean, what: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (check()) {
      await settle();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`waited too long for ${what}`);
}

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
  await settle();
});

afterAll(async () => {
  mounted?.destroy();
  // Cleanups run on a frame, and they touch `window`. Let them finish first.
  await settle();
  dom?.uninstall();
});

const note = (): Element | null => document.querySelector("[data-pq-note]");
const panel = (): Element | null =>
  document.querySelector(".pq-settings-panel");

/** A key press starts in the page and travels up to the window handlers. */
function escape(): void {
  document.body.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

test("Escape closes the note before the panel", async () => {
  quiz.goToEnd();
  quiz.showResults();
  await settle();

  const toggle = (): Element | null =>
    document.querySelector(".pq-settings-toggle");
  await waitFor(() => toggle() !== null, "the settings button");
  document.querySelector<HTMLElement>(".pq-settings-toggle")?.click();
  await waitFor(() => panel() !== null, "the settings panel");
  document.querySelector<HTMLElement>(".pq-info-button")?.click();
  await waitFor(() => note() !== null, "the note");
  // Placement runs in an effect, and the Escape listener is in the next one.
  // A note with no style has not run its effects yet, so the key would miss.
  await waitFor(
    () => typeof note()?.getAttribute("style") === "string",
    "the note to be placed",
  );

  escape();
  await waitFor(() => note() === null, "the note to close");
  expect(panel()).not.toBeNull();

  escape();
  await waitFor(() => panel() === null, "the panel to close");
});
