/** The toolbar. V2's row of buttons, now a list you can pin in Settings. */

import type { Quiz } from "../../core/session/quiz";

/** Start-screen `Buttons`: an empty list means every default button. */
export function showsButton(buttons: readonly string[], id: string): boolean {
  return buttons.length === 0 || buttons.includes(id);
}

/** `toolbar` unset means the default row. An empty list means no toolbar. */
export function showsAction(quiz: Quiz, id: string): boolean {
  const list = quiz.config.toolbar;
  return list === undefined || list.includes(id);
}

export interface ToolbarAction {
  readonly id: string;
  readonly labelKey: string;
  readonly icon: string;
}

export const TOOLBAR_ACTIONS: readonly ToolbarAction[] = [
  { id: "prev", labelKey: "previous", icon: "←" },
  { id: "prev-round", labelKey: "prevRound", icon: "⇤" },
  { id: "next-round", labelKey: "nextRound", icon: "⇥" },
  { id: "next", labelKey: "next", icon: "→" },
  { id: "font-minus", labelKey: "fontMinus", icon: "A−" },
  { id: "font-plus", labelKey: "fontPlus", icon: "A+" },
  { id: "reveal", labelKey: "showAnswer", icon: "✓" },
  { id: "hint", labelKey: "hint", icon: "?" },
  { id: "mode", labelKey: "mode", icon: "◐" },
  { id: "start", labelKey: "goToStart", icon: "⌂" },
  { id: "end", labelKey: "endQuiz", icon: "⏭" },
];

export const DEFAULT_TOOLBAR_ACTIONS: readonly string[] = [
  "prev",
  "prev-round",
  "next-round",
  "next",
  "font-minus",
  "font-plus",
  "reveal",
  "hint",
  "mode",
];

export function pinnedActions(quiz: Quiz): readonly string[] {
  return quiz.config.toolbar ?? DEFAULT_TOOLBAR_ACTIONS;
}

export const FONT_MIN = 0.7;
export const FONT_MAX = 1.6;
export const FONT_STEP = 0.1;

/** The font buttons change the quiz root, so the whole slide scales. */
export function changeFontScale(root: HTMLElement | null, delta: number): void {
  if (root === null) {
    return;
  }
  const current = Number(root.dataset["pqFontScale"] ?? "1");
  const next = Math.min(
    FONT_MAX,
    Math.max(FONT_MIN, Math.round((current + delta) * 10) / 10),
  );
  root.dataset["pqFontScale"] = String(next);
  root.style.fontSize = `${Math.round(next * 100)}%`;
}
