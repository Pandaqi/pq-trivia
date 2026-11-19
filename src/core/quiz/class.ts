/**
 * `new Quiz({ seed: "friday" })`, the V2 one-liner.
 *
 * It is a thin shell around `createQuiz`. Nothing is copied eagerly: the
 * factory returns an object literal with getters and closures, so its own
 * property descriptors move onto the instance and `quiz.state` stays live.
 *
 * `createQuiz` remains the plain function. Use whichever reads better.
 */

import { createQuiz } from "./create";
import type { CreateQuizOptions, QuizApi, QuizConfig } from "./types";

/** Everything `createQuiz({ config })` takes, plus the config keys inline. */
export type QuizOptions = CreateQuizOptions & QuizConfig;

/** The instance type. Merged with the class below, like a declaration file. */
export interface Quiz extends QuizApi {}

export class Quiz {
  constructor(options: QuizOptions = {}) {
    const { config, version, parseText, ...inline } = options;
    const api = createQuiz({
      config: { ...(inline as QuizConfig), ...config },
      ...(version === undefined ? {} : { version }),
      ...(parseText === undefined ? {} : { parseText }),
    });
    Object.defineProperties(this, Object.getOwnPropertyDescriptors(api));
  }
}
