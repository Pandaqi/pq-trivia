/**
 * `new Quiz({ text })`, the V2 one-liner.
 *
 * It is a thin shell around `createQuiz`. Nothing is copied eagerly: the
 * factory returns an object literal with getters and closures, so its own
 * property descriptors move onto the instance and `quiz.state` stays live.
 *
 * Pass `text` (or any `load` input) and the constructor starts loading right
 * away. `quiz.loading` settles when that load is done. Without input it waits
 * for `quiz.load()`, like before. Give both `text` and `load` and `load` wins.
 *
 * This class has no DOM. The player's `Quiz` extends it and also mounts into
 * `id`, or the body. `createQuiz` remains the plain function.
 */

import { createQuiz } from "./create";
import type {
  CreateQuizOptions,
  LoadInput,
  QuizApi,
  QuizConfig,
} from "./types";

/** Everything `createQuiz({ config })` takes, plus the config keys inline. */
export type QuizOptions = CreateQuizOptions &
  QuizConfig & {
    /** The quiz text, loaded as the instance is built. */
    readonly text?: string;
    /** File name for `text`: language, source label and the .trivia export. */
    readonly file?: string;
    /** Any other input, the same shape `quiz.load()` takes. */
    readonly load?: LoadInput;
  };

/**
 * The instance type. Merged with the class below, like a declaration file.
 *
 * `loading` is spelled out again so the one-liner shows up in its own docs. It
 * is the controller's promise, not a second one: same object, same load.
 */
export interface Quiz extends QuizApi {
  readonly loading: Promise<void>;
}

export class Quiz {
  constructor(options: QuizOptions = {}) {
    const { config, version, parseText, text, file, load, ...inline } = options;
    const api = createQuiz({
      config: { ...(inline as QuizConfig), ...config },
      ...(version === undefined ? {} : { version }),
      ...(parseText === undefined ? {} : { parseText }),
    });
    Object.defineProperties(this, Object.getOwnPropertyDescriptors(api));
    const input = inputOf({ text, file, load });
    if (input !== null) {
      // The promise lands on `api.loading`, which this instance now shares.
      void api.load(input);
    }
  }
}

/** `load` wins over `text`; without either, the quiz waits for `load()`. */
function inputOf(options: {
  readonly text: string | undefined;
  readonly file: string | undefined;
  readonly load: LoadInput | undefined;
}): LoadInput | null {
  if (options.load !== undefined) {
    return options.load;
  }
  if (options.text === undefined) {
    return null;
  }
  return {
    type: "text",
    text: options.text,
    ...(options.file === undefined ? {} : { file: options.file }),
  };
}
