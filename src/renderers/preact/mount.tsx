/**
 * Mount and unmount. Nothing else touches the target element.
 *
 * Printing renders a sheet with every question, because the player only has one
 * screen mounted. The sheet lives outside the app so Preact never eats it.
 */

import { h, render } from "preact";
import { attemptKeyFor } from "../../core/session/attempts";
import type { Quiz } from "../../core/session/quiz";
import {
  applyThemeMode,
  storedThemeMode,
} from "../../platform/browser/colorMode";
import { applyHeadFromQuiz } from "../../platform/browser/head";
import { consumePrintKind, type PrintKind } from "../../platform/browser/print";
import { browserTimerSound } from "../../platform/browser/sound";
import { createBrowserJournal } from "../../platform/browser/storage/local";
import {
  getTheme,
  loadTheme,
  resolveThemeFolder,
  setTheme,
} from "../../platform/browser/theme";
import { QuizApp } from "./QuizApp";
import { mountPrintSheet, type MountedPrintSheet } from "./print/mountPrint";
import type { PrintOptions, PrintVariant } from "./print/PrintSheet";
import type { MountedQuiz } from "./mounted";

export type { MountedQuiz };
export { mountPrintSheet };

export interface MountOptions {
  /** Print the whole quiz on Ctrl+P. On by default. */
  readonly printSheet?: boolean;
  /** What Ctrl+P prints: follows the live mode unless set. */
  readonly printVariant?: PrintVariant;
  /** Slides per page, flash cards, form style. */
  readonly printOptions?: PrintOptions;
  /** Remember answers between reloads. On by default. */
  readonly attempts?: boolean;
  /**
   * Focus each new screen's heading. On for a quiz that owns the page. A
   * preview inside an editor turns it off, so the caret stays where it was.
   */
  readonly focusScreens?: boolean;
}

const PRINT_VARIANTS: Readonly<Record<PrintKind, PrintVariant>> = {
  questions: "questions",
  answers: "answers",
  sheet: "grade",
  form: "form",
  media: "media",
};

export function mountQuiz(
  quiz: Quiz,
  target: Element,
  options: MountOptions = {},
): MountedQuiz {
  render(
    h(QuizApp, {
      quiz,
      timerSound: browserTimerSound,
      focusScreens: options.focusScreens !== false,
    }),
    target,
  );

  // The title, language, charset and viewport come from the quiz, not the page.
  applyHeadFromQuiz(quiz);

  // A saved choice wins over the author's default. The switch writes both.
  const syncChrome = (): void => {
    applyHeadFromQuiz(quiz);
    applyThemeMode(storedThemeMode() ?? quiz.config.themeMode);
  };
  syncChrome();
  const unsubscribeHead = quiz.subscribe(syncChrome);

  // `createQuiz({ config: { theme: "themes/forest/" } })`, the V2 door.
  const requested = quiz.config.theme;
  let loadedTheme = false;
  if (
    quiz.config.themeDisabled !== true &&
    typeof requested === "string" &&
    requested.trim().length > 0
  ) {
    // V2's `subFolderTheme`: a bare name lives under that folder.
    const root = quiz.config.subFolderTheme ?? "themes/";
    const path = requested.includes("/") ? requested : `${root}${requested}/`;
    void loadTheme(resolveThemeFolder(`${quiz.config.url ?? ""}${path}`))
      .then((theme) => {
        // A folder picked while this was loading wins. Late fetches must not
        // snatch the theme back.
        if (getTheme() !== null) {
          theme.destroy();
          return;
        }
        loadedTheme = true;
        setTheme(theme);
      })
      .catch((error: unknown) => {
        console.warn(`[pq-trivia] ${String(error)}`);
      });
  }

  // Attempts need the quiz key, which needs the title, seed and count. So the
  // journal attaches on the first real state, not at create time.
  let journalAttached = false;
  const unsubscribeAttempts = quiz.subscribe((state) => {
    if (journalAttached || options.attempts === false) {
      return;
    }
    const plan = state.plan;
    const meta = quiz.meta;
    if (plan === null || meta === null) {
      return;
    }
    journalAttached = true;
    quiz.attachAttempts(
      createBrowserJournal(attemptKeyFor(meta.title, plan.seed, plan.total)),
    );
  });

  const doc = target.ownerDocument;
  const icon =
    typeof quiz.config.icon === "string" && quiz.config.icon.trim().length > 0
      ? doc.createElement("link")
      : null;
  if (icon !== null) {
    icon.rel = "icon";
    icon.href = new URL(quiz.config.icon as string, doc.baseURI).href;
    doc.head.append(icon);
  }
  const printHost = doc.createElement("div");
  printHost.className = "pq-print-only";
  doc.body.append(printHost);

  let sheet: MountedPrintSheet | null = null;
  const wantsSheet = options.printSheet !== false;

  const onBeforePrint = (): void => {
    sheet?.destroy();
    const requested = consumePrintKind();
    sheet = mountPrintSheet(quiz, printHost, {
      ...options.printOptions,
      variant:
        requested === null
          ? (options.printOptions?.variant ?? options.printVariant ?? "auto")
          : PRINT_VARIANTS[requested],
    });
    for (const problem of sheet.problems) {
      console.warn(`[pq-trivia] ${problem.message}`);
    }
  };
  const onAfterPrint = (): void => {
    sheet?.destroy();
    sheet = null;
  };

  if (wantsSheet) {
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
  }

  return {
    destroy() {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      unsubscribeAttempts();
      unsubscribeHead();
      sheet?.destroy();
      sheet = null;
      printHost.remove();
      icon?.remove();
      render(null, target);
      if (loadedTheme && getTheme() !== null) {
        setTheme(null);
      }
    },
  };
}
