/**
 * The keyboard belongs to the field while someone is typing.
 *
 * These tests mount the real player for every text surface: open, range, list,
 * cloze and parts. A stray "a" must not reveal the answer, and a number
 * keystroke must not throw focus back to the question heading.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Quiz } from "../../src/core/quiz/class";
import type { QuizConfig } from "../../src/core/quiz/types";
import { ResponseKind } from "../../src/core/session/responses";
import { keyMap } from "../../src/renderers/preact/keys";
import {
  changeFontScale,
  FONT_MAX,
  FONT_MIN,
} from "../../src/renderers/preact/toolbar";
import { mountQuiz, type MountedQuiz } from "../../src/renderers/preact/mount";
import { isTyping } from "../../src/renderers/preact/keys";
import { installDom, settleDom, type TestDom } from "./dom";

const TEXT = `Title => Key test
Seed => key-test
Policy => permissive

Question => Name the painter.
Answers => Vincent van Gogh
Type => Open

Question => In which year?
Answers => 1989
Type => Range

Question => Name three colours.
Answers => red | green | blue
Type => List

Question => Fill [blank] and [blank].
Answers => red | blue
Type => Cloze

Question => Fill both parts.
Type => Parts
Parts => open: Capital: 1 | number: Year: 1
Answers => Paris || 1789

Question => Click the right spot.
Media => spot.png
Answers => 50,50
Type => Hotspot

Question => Match these.
Answers => Alpha ~ One | Beta ~ Two
Type => Match
`;

const SURFACES: readonly (readonly [number, string])[] = [
  [0, ".pq-input:not(.pq-input-number)"],
  [1, ".pq-input-number"],
  [2, "textarea.pq-input"],
  [3, ".pq-cloze input.pq-input"],
  [4, ".pq-parts input.pq-input"],
];

async function settle(): Promise<void> {
  // Preact flushes effects on a frame; happy-dom's frame is not instant.
  await new Promise((resolve) => setTimeout(resolve, 20));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
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
  quiz.setInteractive(true);
  await settle();
});

afterAll(async () => {
  mounted?.destroy();
  await settleDom();
  dom?.uninstall();
});

function surface(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`the surface is missing: ${selector}`);
  }
  return element;
}

describe("hotkeys and typing", () => {
  test("every typing surface swallows the reveal key", async () => {
    for (const [index, selector] of SURFACES) {
      quiz.goTo(index);
      await settle();
      const input = surface(selector);
      input.focus();
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "a",
          bubbles: true,
          cancelable: true,
        }),
      );
      await settle();
      expect(quiz.state.revealed).toEqual([]);
    }
  });

  test("typing keeps the focus in the field", async () => {
    for (const [index, selector] of SURFACES) {
      quiz.goTo(index);
      await settle();
      const input = surface(selector);
      input.focus();
      expect(document.activeElement).toBe(input);

      (input as HTMLInputElement).value = "42";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await settle();
      expect(document.activeElement).toBe(input);
    }
  });

  test("a hotkey jump lands on the input in interactive mode", async () => {
    quiz.goTo(0);
    await settle();
    document.body.tabIndex = -1;
    document.body.focus();
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle();
    expect(quiz.state.index).toBe(1);
    expect(document.activeElement?.classList.contains("pq-input")).toBe(true);
  });

  test("the reveal key still works when no field owns the focus", async () => {
    quiz.goTo(0);
    await settle();
    const id = quiz.state.plan?.questions[0]?.id;
    if (id === undefined) {
      throw new Error("the fixture lost its first question");
    }
    document.body.tabIndex = -1;
    document.body.focus();
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle();
    expect(quiz.state.revealed).toContain(id);
  });
});

describe("dictation", () => {
  test("off by default, a mic bubble when enabled", async () => {
    const scope = window as unknown as Record<string, unknown>;
    scope["SpeechRecognition"] = class {
      start(): void {}
      stop(): void {}
    };
    quiz.goTo(0);
    await settle();

    quiz.configure({ dictation: false });
    await settle();
    expect(document.querySelector(".pq-mic")).toBeNull();

    quiz.configure({ dictation: true });
    await settle();
    const mic = document.querySelector<HTMLButtonElement>(".pq-mic");
    expect(mic).not.toBeNull();
    expect(mic?.getAttribute("aria-label")).toBe("Speak");
    expect(mic?.textContent?.trim()).toBe("");
    if (mic === null) {
      throw new Error("the mic bubble is missing");
    }

    const input = document.querySelector<HTMLInputElement>(".pq-input");
    if (input === null) {
      throw new Error("the answer input is missing");
    }
    const wrap = input.parentElement;
    mic.click();
    await settle();
    expect(mic.getAttribute("aria-pressed")).toBe("true");
    expect(mic.getAttribute("aria-label")).toBe("Stop listening");
    // The listening state must not rebuild or move the field.
    expect(document.querySelector(".pq-input")).toBe(input);
    expect(input.parentElement).toBe(wrap);
    mic.click();
    await settle();
    expect(mic.getAttribute("aria-pressed")).toBe("false");
    expect(mic.getAttribute("aria-label")).toBe("Speak");
  });
});

describe("match and hotspot", () => {
  test("the map is shown once, with no answer list", async () => {
    quiz.goTo(5);
    await settle();
    expect(document.querySelector(".pq-regions")).toBeNull();
    expect(document.querySelectorAll(".pq-map-surface img")).toHaveLength(1);
    expect(
      document.querySelectorAll(".pq-screen-question .pq-media-list img"),
    ).toHaveLength(0);
  });

  test("the map has a neutral keyboard crosshair", async () => {
    quiz.goTo(5);
    await settle();
    const map = document.querySelector<HTMLButtonElement>(".pq-map-surface");
    if (map === null) {
      throw new Error("the map is missing");
    }
    map.focus();
    map.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle();
    expect(document.querySelector(".pq-map-cursor")).not.toBeNull();
    expect(document.querySelector(".pq-map-status")?.textContent).toContain(
      "52 percent",
    );

    map.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle();
    const id = quiz.state.plan?.questions[5]?.id;
    if (id === undefined) {
      throw new Error("the fixture lost its hotspot question");
    }
    const response = quiz.state.responses[id];
    expect(response?.kind).toBe(ResponseKind.Hotspot);
    if (response?.kind !== ResponseKind.Hotspot || response.point === null) {
      throw new Error("the hotspot response was not stored");
    }
    expect(response.point.x).toBeGreaterThan(50);
    expect(response.point.y).toBe(50);
  });

  test("every chosen pair draws its own colour, line and dots", async () => {
    quiz.goTo(6);
    await settle();
    const id = quiz.state.plan?.questions[6]?.id;
    if (id === undefined) {
      throw new Error("the fixture lost its match question");
    }
    quiz.setResponse(id, {
      kind: ResponseKind.Match,
      pairs: [
        ["Alpha", "One"],
        ["Beta", "Two"],
      ],
    });
    // Preact can need a second frame before the measuring effect runs.
    await settle();
    await settle();
    expect(document.querySelector(".pq-match-hint")).toBeNull();
    expect(document.querySelectorAll(".pq-match-lines line")).toHaveLength(2);
    expect(document.querySelectorAll(".pq-match-lines circle")).toHaveLength(4);
    const colours = [...document.querySelectorAll(".pq-match-line")].map(
      (line) => line.getAttribute("stroke"),
    );
    expect(new Set(colours).size).toBe(2);
  });
});

describe("key mapping", () => {
  test("a custom key replaces the action's default keys", () => {
    const map = keyMap({ hotkeys: { next: "n" } } as QuizConfig);
    expect(map.get("n")).toBe("next");
    expect(map.has("ArrowRight")).toBe(false);
    expect(map.has("ArrowUp")).toBe(false);
  });

  test("V2 action names still bind", () => {
    const map = keyMap({
      hotkeys: {
        "font-size-plus": "x",
        "next-section": "s",
      },
    } as QuizConfig);
    expect(map.get("x")).toBe("fontUp");
    expect(map.get("s")).toBe("nextRound");
  });

  test("a forbidden action keeps no key", () => {
    const map = keyMap({
      hotkeys: { next: "n" },
      hotkeysForbidden: ["next"],
    } as QuizConfig);
    expect(map.has("n")).toBe(false);
    expect(map.has("ArrowRight")).toBe(false);
  });
});

describe("font scale", () => {
  test("the buttons reach the wider ends", () => {
    const root = document.createElement("div");
    changeFontScale(root, -10);
    expect(root.dataset["pqFontScale"]).toBe(String(FONT_MIN));
    changeFontScale(root, 100);
    expect(root.dataset["pqFontScale"]).toBe(String(FONT_MAX));
  });
});

describe("isTyping", () => {
  test("input, textarea, select and editable nodes count", () => {
    expect(isTyping(document.createElement("input"))).toBe(true);
    expect(isTyping(document.createElement("textarea"))).toBe(true);
    expect(isTyping(document.createElement("select"))).toBe(true);

    const editable = document.createElement("div");
    editable.contentEditable = "true";
    expect(isTyping(editable)).toBe(true);

    expect(isTyping(document.createElement("button"))).toBe(false);
    expect(isTyping(null)).toBe(false);
  });
});
