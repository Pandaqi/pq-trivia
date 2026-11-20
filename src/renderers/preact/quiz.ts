/**
 * `new Quiz({ text })`, and the quiz is on the page.
 *
 * The core class deliberately knows nothing about a document. This one adds the
 * one thing a player page wants: somewhere to live. `id` names an element;
 * without one the quiz gets a fresh block at the end of the body.
 *
 *   const quiz = new Quiz({ text, id: "quiz" });
 *   const other = new Quiz({ text }); // into the body
 *
 * Import it from `pq-trivia`. `pq-trivia/core` still hands out the DOM-free
 * class, and `mountQuiz` is there for hosts that want to pick the element
 * after creating the quiz.
 */

import { Quiz as CoreQuiz, type QuizOptions } from "../../core/quiz/class";
import { mountQuiz, type MountedQuiz } from "./mount";

export type { QuizOptions, MountedQuiz };

export class Quiz extends CoreQuiz {
  /** The live mount. `destroy()` takes it down again. */
  readonly mounted: MountedQuiz | null;

  constructor(options: QuizOptions = {}) {
    super(options);
    this.mounted = mountInto(this, options.id);
    if (this.mounted !== null) {
      const destroy = this.destroy;
      this.destroy = (): void => {
        this.mounted?.destroy();
        destroy();
      };
    }
  }
}

/** `#quiz` and `[data-quiz]` work too. A plain id with a space does not. */
function selector(name: string): Element | null {
  try {
    return document.querySelector(name);
  } catch {
    return null;
  }
}

/** An existing element by id or selector, else a new block at the body's end. */
function mountInto(quiz: CoreQuiz, id: string | undefined): MountedQuiz | null {
  if (typeof document === "undefined" || document.body === null) {
    return null;
  }
  const named = id?.trim() ?? "";
  const found =
    named.length === 0
      ? null
      : (document.getElementById(named) ?? selector(named));
  if (found !== null) {
    return mountQuiz(quiz, found);
  }
  // A missing element is a typo, not a reason to throw. The body catches it.
  // No class here: the app draws its own `.pq-quiz` inside whatever it gets.
  const host = document.createElement("div");
  if (named.length > 0) {
    host.id = named;
  }
  document.body.append(host);
  return mountQuiz(quiz, host);
}
