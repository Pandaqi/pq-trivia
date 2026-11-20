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
  if (element === null) {
    return false;
  }
  const field = element.closest?.("input, textarea, select, [contenteditable]");
  return (
    TYPING_TAGS.has(element.tagName) ||
    element.isContentEditable ||
    field != null
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

export interface HotkeyAction {
  readonly id: string;
  readonly labelKey: string;
}

/** The actions a player can bind, in the order the panel lists them. */
export const HOTKEY_ACTIONS: readonly HotkeyAction[] = [
  { id: "next", labelKey: "next" },
  { id: "prev", labelKey: "previous" },
  { id: "nextRound", labelKey: "nextRound" },
  { id: "prevRound", labelKey: "prevRound" },
  { id: "reveal", labelKey: "showAnswer" },
  { id: "hint", labelKey: "hint" },
  { id: "undo", labelKey: "keyUndo" },
  { id: "mode", labelKey: "mode" },
  { id: "start", labelKey: "goToStart" },
  { id: "end", labelKey: "endQuiz" },
  { id: "language", labelKey: "language" },
  { id: "media", labelKey: "mediaWord" },
  { id: "fullscreen", labelKey: "keyFullscreen" },
  { id: "fontUp", labelKey: "fontPlus" },
  { id: "fontDown", labelKey: "fontMinus" },
];

/** V2 names still work in a quiz file and in the settings panel. */
const HOTKEY_ALIASES: Readonly<Record<string, string>> = {
  "font-size-plus": "fontUp",
  "font-size-min": "fontDown",
  "next-section": "nextRound",
  "prev-section": "prevRound",
};

function canonicalAction(raw: string): string | null {
  const name = HOTKEY_ALIASES[raw] ?? raw;
  return name in DEFAULT_KEYS ? name : null;
}

/**
 * The keys each action has now. A custom action replaces the defaults, like
 * V2. Later entries still win when two actions share one key.
 */
export function effectiveKeys(
  config: Quiz["config"],
): Map<string, readonly string[]> {
  const forbidden = new Set(config.hotkeysForbidden ?? []);
  const out = new Map<string, readonly string[]>();
  for (const [name, keys] of Object.entries(DEFAULT_KEYS)) {
    if (!forbidden.has(name)) {
      out.set(name, keys);
    }
  }
  for (const [raw, keys] of Object.entries(config.hotkeys ?? {})) {
    const name = canonicalAction(raw);
    if (name === null || forbidden.has(name) || forbidden.has(raw)) {
      continue;
    }
    const values = (typeof keys === "string" ? [keys] : keys).filter(
      (key) => typeof key === "string" && key.length > 0,
    );
    // An empty list is a deliberate "no keys", just as V2 allowed.
    out.set(name, values);
  }
  return out;
}

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
  for (const [name, keys] of effectiveKeys(config)) {
    for (const key of keys) {
      map.set(key, name);
    }
  }
  return map;
}
