/**
 * Warm the next question's first image while the room reads this one.
 *
 * One image, at idle, and only if the next question has one. Audio and video
 * wait: nobody wants a preview of the next round's sound.
 */

import type { QuestionModel } from "../../core/model/question";
import type { Quiz } from "../../core/session/quiz";
import { MediaKind } from "../../core/values/media";

export function preloadQuestionMedia(question: QuestionModel | null): void {
  if (question === null || typeof Image === "undefined") {
    return;
  }
  const image = question.media.find((item) => item.kind === MediaKind.Image);
  if (image === undefined) {
    return;
  }
  const loader = new Image();
  loader.decoding = "async";
  loader.src = image.path;
}

export function preloadNextQuestion(quiz: Quiz): void {
  const plan = quiz.state.plan;
  if (plan === null) {
    return;
  }
  preloadQuestionMedia(plan.questions[quiz.state.index + 1] ?? null);
}
