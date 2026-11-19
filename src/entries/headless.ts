/** Bundle entry for `dist/v3/headless.js`. Core plus `createQuiz`. No DOM. */

export * from "../core/index";
export {
  createQuiz,
  type Quiz,
  type QuizConfig,
  type LoadInput,
  type QuizEventMap,
} from "../core/session/quiz";
export { Emitter, type Unsubscribe } from "../core/session/events";
export * from "../core/session/viewModel";
