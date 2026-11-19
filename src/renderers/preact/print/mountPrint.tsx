/**
 * Mount the print sheet into any element and keep it in step with the quiz.
 *
 * After every draw the pages are measured and shrunk to fit. Anything that still
 * does not fit comes back in `problems`, so a host can warn before printing.
 */

import { h, render } from "preact";
import type { Quiz } from "../../../core/session/quiz";
import type { MountedQuiz } from "../mounted";
import { UiContext } from "../i18n";
import { fitPrintPages, type FitSummary } from "./fit";
import { PrintSheet, type PrintOptions, type PrintProblem } from "./PrintSheet";

export interface MountedPrintSheet extends MountedQuiz {
  /** Problems from the last draw. Empty when every page fits. */
  readonly problems: readonly PrintProblem[];
  /** Measure again and report: page count, how many were shrunk, what failed. */
  fit(): FitSummary;
}

export function mountPrintSheet(
  quiz: Quiz,
  target: Element,
  options: PrintOptions = {},
): MountedPrintSheet {
  let summary: FitSummary = { pages: 0, zoomed: 0, problems: [] };

  const draw = (): void => {
    render(
      h(
        UiContext.Provider,
        { value: quiz.t },
        h(PrintSheet, { quiz, options }),
      ),
      target,
    );
    summary = fitPrintPages(target, options.onProblem);
  };

  draw();
  const unsubscribe = quiz.subscribe(draw);

  return {
    destroy() {
      unsubscribe();
      render(null, target);
    },
    get problems() {
      return summary.problems;
    },
    fit() {
      summary = fitPrintPages(target, options.onProblem);
      return summary;
    },
  };
}
