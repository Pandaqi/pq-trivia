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

/** Preact draws effects on a microtask, so state changes need one tick. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
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
    await settle();

    const hint = document.querySelector(".pq-type-hint");
    expect(hint?.textContent).toBe("This is an open question.");
  });

  test("the question screen has no axe violations", async () => {
    expect(document.querySelector(".pq-screen-question")).not.toBeNull();
    expect(await violations()).toEqual([]);
  });

  test("a choice question counts the answers it wants", async () => {
    quiz.goTo(1);
    await settle();

    const hint = document.querySelector(".pq-type-hint");
    expect(hint?.textContent).toContain("Pick 2 answers");
  });

  test("the hints can be turned off", async () => {
    quiz.configure({ questionTypeHints: false });
    await settle();

    expect(document.querySelector(".pq-type-hint")).toBeNull();
  });

  test("the results screen has no axe violations", async () => {
    quiz.goToEnd();
    quiz.showResults();
    await settle();

    expect(document.querySelector(".pq-screen-results")).not.toBeNull();
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
