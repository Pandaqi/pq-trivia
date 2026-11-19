/**
 * Mount and unmount. Nothing else touches the target element.
 *
 * Printing renders a sheet with every question, because the player only has one
 * screen mounted. The sheet lives outside the app so Preact never eats it.
 */

import { h, render } from "preact";
import { attemptKeyFor } from "../../core/session/attempts";
import type { Quiz } from "../../core/session/quiz";
import { browserTimerSound } from "../../platform/browser/sound";
import { createBrowserJournal } from "../../platform/browser/storage/local";
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
}

export function mountQuiz(
  quiz: Quiz,
  target: Element,
  options: MountOptions = {},
): MountedQuiz {
  render(h(QuizApp, { quiz, timerSound: browserTimerSound }), target);

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
  const printHost = doc.createElement("div");
  printHost.className = "pq-print-only";
  doc.body.append(printHost);

  let sheet: MountedPrintSheet | null = null;
  const wantsSheet = options.printSheet !== false;

  const onBeforePrint = (): void => {
    sheet?.destroy();
    sheet = mountPrintSheet(quiz, printHost, {
      ...options.printOptions,
      variant: options.printOptions?.variant ?? options.printVariant ?? "auto",
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
      sheet?.destroy();
      sheet = null;
      printHost.remove();
      render(null, target);
    },
  };
}
