/** Bundle entry for `dist/v3/player.js`. Core plus the default Preact view. */

export * from "../core/index";
export {
  createQuiz,
  type Quiz,
  type QuizConfig,
  type LoadInput,
  type QuizEventMap,
} from "../core/session/quiz";
export * from "../core/session/viewModel";
export {
  mountQuiz,
  mountPrintSheet,
  type MountedQuiz,
  type MountOptions,
} from "../renderers/preact/mount";
export { PrintSheet } from "../renderers/preact/print/PrintSheet";
export { PlayMode, SessionStatus } from "../core/session/session";
export { QuizApp } from "../renderers/preact/QuizApp";
export { defineQuizElement, QuizElement } from "../renderers/dom/quizElement";
export { VERSION } from "../core/version";

import { defineQuizElement } from "../renderers/dom/quizElement";

// A page that loads the bundle can write `<pq-quiz src="…">` straight away.
if (typeof customElements !== "undefined") {
  defineQuizElement();
}
