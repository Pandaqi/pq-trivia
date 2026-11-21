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
AllowHotkeyMapping => true

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

test("key mapping applies at once and is saved", async () => {
  localStorage.removeItem("pq-hotkeys");
  quiz.goTo(0);
  await settle();

  document.querySelector<HTMLElement>(".pq-settings-toggle")?.click();
  await waitFor(() => panel() !== null, "the settings panel");
  const change = document.querySelector<HTMLButtonElement>(
    '[data-pq-key-action="next"]',
  );
  expect(change).not.toBeNull();
  change?.click();
  await waitFor(
    () => document.querySelector(".pq-key-capture") !== null,
    "the key recorder",
  );

  const capture = document.querySelector<HTMLInputElement>(".pq-key-capture");
  if (capture === null) {
    throw new Error("the key recorder is missing");
  }
  capture.focus();
  capture.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "n",
      bubbles: true,
      cancelable: true,
    }),
  );
  await settle();
  expect(quiz.config.hotkeys?.["next"]).toEqual(["n"]);
  expect(localStorage.getItem("pq-hotkeys")).not.toBeNull();

  document
    .querySelector<HTMLButtonElement>(".pq-settings-panel .pq-primary")
    ?.click();
  await waitFor(() => panel() === null, "the panel to close");
  document.body.tabIndex = -1;
  document.body.focus();
  document.body.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "n",
      bubbles: true,
      cancelable: true,
    }),
  );
  await settle();
  expect(quiz.state.index).toBe(1);
});

test("both language dropdowns work, and the interface choice survives a reload", async () => {
  mounted.destroy();
  await settle();
  localStorage.removeItem("pq-ui-language");

  const files = [
    {
      name: "quiz.en.trivia",
      text: "Title => Two\n\n## Round\n\nQuestion => One\nAnswers => 1\n",
    },
    {
      name: "quiz.nl.trivia",
      text: "Title => Twee\n\n## Round\n\nQuestion => Een\nAnswers => 1\n",
    },
  ];
  const selectors = (): HTMLSelectElement[] => [
    ...document.querySelectorAll<HTMLSelectElement>(
      ".pq-settings-panel select",
    ),
  ];
  const open = async (quiz: Quiz): Promise<MountedQuiz> => {
    const host = document.createElement("div");
    document.body.append(host);
    const instance = mountQuiz(quiz, host, {
      attempts: false,
      printSheet: false,
    });
    await quiz.loading;
    await settle();
    document.querySelector<HTMLElement>(".pq-settings-toggle")?.click();
    await waitFor(() => panel() !== null, "the settings panel");
    return instance;
  };

  const first = new Quiz({
    load: { type: "files", files },
    languageDefault: "EN",
    seed: "lang",
  });
  mounted = await open(first);
  expect(first.languages()).toEqual(["EN", "NL"]);
  // The language group is first: quiz, then interface, on "same as quiz".
  expect(selectors()[0]?.value).toBe("EN");
  expect(selectors()[1]?.value).toBe("");

  const quizSelect = selectors()[0];
  if (quizSelect === undefined) {
    throw new Error("the quiz language select is missing");
  }
  quizSelect.value = "NL";
  quizSelect.dispatchEvent(new Event("change", { bubbles: true }));
  await settle();
  expect(first.state.language).toBe("NL");
  // Auto followed the quiz, so the panel itself is Dutch now.
  expect(panel()?.querySelector(".pq-settings-title")?.textContent).toBe(
    "Instellingen",
  );

  const uiSelect = selectors()[1];
  if (uiSelect === undefined) {
    throw new Error("the interface language select is missing");
  }
  uiSelect.value = "de";
  uiSelect.dispatchEvent(new Event("change", { bubbles: true }));
  await settle();
  expect(localStorage.getItem("pq-ui-language")).toBe("de");
  expect(panel()?.querySelector(".pq-settings-title")?.textContent).toBe(
    "Einstellungen",
  );

  mounted.destroy();
  await settle();

  // A reload: new quiz, same files. The saved interface language wins.
  const second = new Quiz({
    load: { type: "files", files },
    languageDefault: "EN",
    seed: "lang",
  });
  mounted = await open(second);
  expect(second.state.language).toBe("EN");
  expect(selectors()[1]?.value).toBe("de");
  expect(panel()?.querySelector(".pq-settings-title")?.textContent).toBe(
    "Einstellungen",
  );

  localStorage.removeItem("pq-ui-language");
});

test("a saved interface language beats the host default", async () => {
  mounted.destroy();
  await settle();
  localStorage.setItem("pq-ui-language", "de");

  const host = document.createElement("div");
  document.body.append(host);
  const quiz = new Quiz({
    load: {
      type: "text",
      text: "Question => Een\nAnswers => 1\n",
      file: "quiz.nl.trivia",
    },
    languageDefault: "NL",
    config: { uiLanguage: "fr", seed: "precedence" },
  });
  mounted = mountQuiz(quiz, host, { attempts: false, printSheet: false });
  await quiz.loading;
  await settle();

  // The reader picked German before; the page's French default must not win.
  expect(quiz.config.uiLanguage).toBe("de");
  expect(quiz.t("next")).toBe("Weiter");
  expect(localStorage.getItem("pq-ui-language")).toBe("de");

  // "Same as quiz" is a choice too, so it is remembered as well.
  mounted.destroy();
  await settle();
  localStorage.setItem("pq-ui-language", "auto");
  const followHost = document.createElement("div");
  document.body.append(followHost);
  const follow = new Quiz({
    load: {
      type: "text",
      text: "Question => Een\nAnswers => 1\n",
      file: "quiz.nl.trivia",
    },
    languageDefault: "NL",
    config: { uiLanguage: "fr", seed: "auto" },
  });
  mounted = mountQuiz(follow, followHost, {
    attempts: false,
    printSheet: false,
  });
  await follow.loading;
  await settle();
  expect(follow.config.uiLanguage).toBeNull();
  expect(follow.t("next")).toBe("Volgende");
  localStorage.removeItem("pq-ui-language");
});

test("a saved key map is restored on the next mount", async () => {
  // One page owns one quiz. Unmount the first one before "reloading", or its
  // window listener eats the key and the new quiz never sees it.
  mounted.destroy();
  await settle();
  localStorage.setItem("pq-hotkeys", JSON.stringify({ next: ["n"] }));
  const host = document.createElement("div");
  document.body.append(host);
  const fresh = new Quiz({ text: TEXT });
  const freshMounted = mountQuiz(fresh, host, {
    attempts: false,
    printSheet: false,
  });
  mounted = freshMounted;
  await fresh.loading;
  await settle();
  fresh.goTo(0);
  await settle();

  document.body.tabIndex = -1;
  document.body.focus();
  document.body.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "n",
      bubbles: true,
      cancelable: true,
    }),
  );
  await settle();
  expect(fresh.state.index).toBe(1);
});
