/**
 * Staged reveals: which part of a question is on screen, and the button that
 * brings the rest.
 *
 * A question without `Steps` returns the same answer for everything, so the
 * screens that ignore this module behave exactly as before.
 */

import type { JSX } from "preact";
import type { Quiz } from "../../../core/session/quiz";
import { StepPart } from "../../../core/model/steps";
import type { QuestionViewModel } from "../../../core/session/viewModel";
import { useT } from "../i18n";

/** True while the question is still arriving part by part. */
export function isStaged(screen: QuestionViewModel): boolean {
  return screen.steps.total > 1;
}

/** A part shows when nothing is staged, or when its step has come. */
export function showsStep(
  screen: QuestionViewModel,
  part: StepPart,
): boolean {
  return !isStaged(screen) || screen.steps.visible.includes(part);
}

/**
 * The animation a part arrived with. Undefined when nothing is staged, so an
 * ordinary question gets no extra attribute.
 *
 * `Steps => media | fade | question | slide-up | answers` gives the question
 * and the answers their own entrance; anything unnamed uses the default.
 */
export function stepEnter(
  screen: QuestionViewModel,
  part: StepPart,
): string | undefined {
  if (!isStaged(screen)) {
    return undefined;
  }
  const found = screen.steps.entered.find((entry) => entry.part === part);
  return found?.transition ?? screen.steps.transition ?? "fade";
}

/** One click between the video and the question. Also the count, for nerves. */
export function StepBar({
  quiz,
  screen,
}: {
  readonly quiz: Quiz;
  readonly screen: QuestionViewModel;
}): JSX.Element | null {
  const t = useT();
  if (!screen.steps.more) {
    return null;
  }
  return (
    <div class="pq-step-bar" role="group" aria-label={t("nextStep")}>
      <p class="pq-step-count" role="status">
        {t("stepOf", {
          index: screen.steps.index + 1,
          total: screen.steps.total,
        })}
      </p>
      <button
        type="button"
        class="pq-primary"
        data-pq-action="step"
        onClick={() => quiz.nextStep()}
      >
        {t("nextStep")}
      </button>
    </div>
  );
}
