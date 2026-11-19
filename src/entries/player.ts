/** Bundle entry for `dist/v3/player.js`. Core plus the default Preact view. */

export * from "./core";
export {
  createQuiz,
  type CreateQuizOptions,
  type Quiz,
  type QuizConfig,
  type LoadInput,
  type QuizEventMap,
  type ParseHook,
} from "../core/quiz";
export {
  mountQuiz,
  mountPrintSheet,
  type MountedQuiz,
  type MountOptions,
} from "../renderers/preact/mount";
export { PrintSheet } from "../renderers/preact/print/PrintSheet";
export { PlayMode, SessionStatus } from "../core/session/session";
export { browserAnswerKey, encryptQuiz } from "../platform/answerKey";
export { downloadText, fileSlug } from "../platform/browser/download";
export { QuizApp } from "../renderers/preact/QuizApp";
export { defineQuizElement, QuizElement } from "../renderers/dom/quizElement";
export { VERSION } from "../core/version";

import { defineQuizElement } from "../renderers/dom/quizElement";

// A page that loads the bundle can write `<pq-quiz src="…">` straight away.
if (typeof customElements !== "undefined") {
  defineQuizElement();
}
