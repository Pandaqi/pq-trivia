/**
 * The player in a real DOM, checked by axe.
 *
 * This is the test that would have caught a screen without a heading, a button
 * without a name, or a type hint that never reached the page.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import axe from "axe-core";
import { Quiz } from "../../src/core/quiz/class";
import { mountQuiz, type MountedQuiz } from "../../src/renderers/preact/mount";
import { installDom, settleDom, type TestDom } from "./dom";

const TEXT = `Title => Screen test
Seed => screen-test

# Round one

Question => Type your answer.
Answers => Something

Question => Pick two.
Answers => One | Two | Three
Correct => One | Two

Question => In which year?
Answers => 1989
Type => Range
`;

/** Colour needs layout, and happy-dom does not lay anything out. */
const AXE_OPTIONS: Parameters<typeof axe.run>[1] = {
  rules: {
    "color-contrast": { enabled: false },
  },
};

async function violations(): Promise<string[]> {
  const results = await axe.run(document.body, AXE_OPTIONS);
  return results.violations.map(
    (violation) => `${violation.id}: ${violation.help}`,
  );
}

/**
 * Preact draws on its own schedule: one tick is enough on one machine and short
 * on the next. Poll for what the test is about to read instead of guessing.
 */
async function waitFor(ready: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (ready()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function screen(kind: string): Promise<void> {
  await waitFor(() => document.querySelector(`.pq-screen-${kind}`) !== null);
  expect(document.querySelector(`.pq-screen-${kind}`)).not.toBeNull();
}

function hintText(): string {
  return document.querySelector(".pq-type-hint")?.textContent ?? "";
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
  // The start screen only appears once the app has subscribed to the quiz, so
  // waiting for it means the controls below act on a live player.
  await screen("start");
});

afterAll(async () => {
  mounted?.destroy();
  await settleDom();
  dom?.uninstall();
});

describe("the player", () => {
  test("the start screen has no axe violations", async () => {
    // A green axe run on an empty page proves nothing. Look first.
    expect(document.querySelector(".pq-screen")?.tagName).toBe("MAIN");
    expect(await violations()).toEqual([]);
  });

  test("an open question says so", async () => {
    quiz.goTo(0);
    await screen("question");
    await waitFor(() => hintText().length > 0);

    expect(hintText()).toBe("This is an open question.");
  });

  test("the question screen has no axe violations", async () => {
    await screen("question");
    expect(await violations()).toEqual([]);
  });

  test("a choice question counts the answers it wants", async () => {
    quiz.goTo(1);
    await waitFor(() => hintText().includes("Pick 2 answers"));

    expect(hintText()).toContain("Pick 2 answers");
  });

  test("the hints can be turned off", async () => {
    quiz.configure({ questionTypeHints: false });
    await waitFor(() => document.querySelector(".pq-type-hint") === null);

    expect(document.querySelector(".pq-type-hint")).toBeNull();
  });

  test("the results screen has no axe violations", async () => {
    quiz.goToEnd();
    quiz.showResults();
    await screen("results");

    expect(await violations()).toEqual([]);
  });

  // A run that never reports anything proves nothing. Give axe a real fault.
  test("axe is awake: an image without alt gets reported", async () => {
    const probe = document.createElement("div");
    probe.innerHTML = '<img src="missing.png" />';
    document.body.append(probe);

    const found = await violations();
    probe.remove();

    expect(found.some((entry) => entry.startsWith("image-alt"))).toBe(true);
  });
});
