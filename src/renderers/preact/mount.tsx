/**
 * Mount and unmount. Nothing else touches the target element.
 *
 * Printing renders a sheet with every question, because the player only has one
 * screen mounted. The sheet lives outside the app so Preact never eats it.
 */

import { h, render } from "preact";
import type { Quiz } from "../../core/session/quiz";
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
}

export function mountQuiz(
  quiz: Quiz,
  target: Element,
  options: MountOptions = {},
): MountedQuiz {
  render(h(QuizApp, { quiz }), target);

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
      sheet?.destroy();
      sheet = null;
      printHost.remove();
      render(null, target);
    },
  };
}
