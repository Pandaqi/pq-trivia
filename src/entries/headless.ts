/** Bundle entry for `dist/v3/headless.js`. Core plus `createQuiz`. No DOM. */

export * from "./core";
export {
  createQuiz,
  Quiz,
  type QuizOptions,
  type QuizConfig,
  type LoadInput,
  type QuizEventMap,
  ThemeMode,
} from "../core/quiz";
export { Emitter, type Unsubscribe } from "../core/session/events";
