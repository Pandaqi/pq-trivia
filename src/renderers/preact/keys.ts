/** The keyboard: which key means what, and what that does to the quiz. */

import type { Quiz } from "../../core/session/quiz";
import { PlayMode } from "../../core/session/session";

const TYPING_TAGS: ReadonlySet<string> = new Set([
  "INPUT",
  "TEXTAREA",
  "SELECT",
]);

export function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return (
    element !== null &&
    (TYPING_TAGS.has(element.tagName) || element.isContentEditable)
  );
}

export type Action = (quiz: Quiz) => void;

/** V2's keys, with `hotkeys` and `hotkeysForbidden` on top. */
export const DEFAULT_KEYS: Readonly<Record<string, readonly string[]>> = {
  // Exactly V2's keys. Hands already know them.
  next: ["ArrowRight", "ArrowUp"],
  prev: ["ArrowLeft", "ArrowDown"],
  nextRound: [".", ">"],
  prevRound: [",", "<"],
  reveal: ["r", "a"],
  hint: ["h"],
  undo: ["u"],
  mode: ["m"],
  end: ["Escape"],
  start: ["Home"],
  language: ["l"],
  media: ["Enter", " "],
  fullscreen: ["f"],
  fontUp: ["+", "="],
  fontDown: ["-", "_"],
};

export function actionFor(name: string): Action | null {
  switch (name) {
    case "next":
      return (target) => void target.next();
    case "prev":
      return (target) => void target.prev();
    case "nextRound":
      return (target) => void target.nextRound();
    case "prevRound":
      return (target) => void target.prevRound();
    case "reveal":
      return (target) => void target.toggleReveal();
    case "hint":
      return (target) => void target.revealHint();
    case "undo":
      return (target) => void target.undo();
    case "mode":
      return (target) =>
        void target.setMode(
          target.state.mode === PlayMode.Answers
            ? PlayMode.Questions
            : PlayMode.Answers,
        );
    case "end":
      return (target) => {
        const plan = target.state.plan;
        if (plan !== null) {
          target.goTo(plan.questions.length);
        }
      };
    case "start":
      return (target) => target.goTo(-1);
    case "language":
      return (target) => {
        const languages = target.languages();
        if (languages.length < 2) {
          return;
        }
        const index = languages.indexOf(target.state.language ?? "");
        target.setLanguage(languages[(index + 1) % languages.length] ?? "");
      };
    case "media":
      return () => undefined;
    default:
      return null;
  }
}

export function keyMap(config: Quiz["config"]): Map<string, string> {
  const map = new Map<string, string>();
  const forbidden = new Set(config.hotkeysForbidden ?? []);
  for (const [name, keys] of Object.entries(DEFAULT_KEYS)) {
    if (forbidden.has(name)) {
      continue;
    }
    for (const key of keys) {
      map.set(key, name);
    }
  }
  const aliases: Readonly<Record<string, string>> = {
    "font-size-plus": "fontUp",
    "font-size-min": "fontDown",
    "next-section": "nextRound",
    "prev-section": "prevRound",
  };
  for (const [raw, keys] of Object.entries(config.hotkeys ?? {})) {
    const name = aliases[raw] ?? raw;
    if (forbidden.has(name) || forbidden.has(raw)) {
      continue;
    }
    for (const key of typeof keys === "string" ? [keys] : keys) {
      map.set(key, name);
    }
  }
  return map;
}
