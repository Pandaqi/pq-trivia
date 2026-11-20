/**
 * A quiz in a box: text in, player mounted, one teardown.
 *
 * `mountQuiz` wants a quiz that already has a plan. This is the short door for
 * a host that only has text — the wizard's preview pane, a docs demo, a test.
 * It lives here rather than in the wizard so the wizard never imports the
 * renderer: the entry asks for this module, lazily, and the player arrives in
 * its own chunk.
 */

import { createQuiz } from "../core/quiz/create";
import { mountQuiz } from "./preact/mount";

export interface MountedPreview {
  /** Same player, new text. Cheaper than a remount and keeps the pane's place. */
  load(text: string): void;
  destroy(): void;
}

export interface PreviewOptions {
  /** Name for diagnostics and the export path. */
  readonly file?: string;
  /**
   * Leave the page's title and language alone. A preview inside another page
   * should not rename the tab.
   */
  readonly keepHead?: boolean;
}

const PREVIEW_FILE = "preview.trivia";

export function mountPreview(
  text: string,
  host: HTMLElement,
  options: PreviewOptions = {},
): MountedPreview {
  const keepHead = options.keepHead === true && typeof document !== "undefined";
  const title = keepHead ? document.title : "";
  const language = keepHead ? document.documentElement.lang : "";
  const restore = (): void => {
    if (!keepHead) {
      return;
    }
    document.title = title;
    document.documentElement.lang = language;
  };

  const quiz = createQuiz({
    config: {
      // A preview of text, not of a folder: no probing for files next to the
      // page, no theme picker. Both would only produce 404s and clutter.
      fileExtensions: [],
      themeUpload: false,
    },
  });
  const file = options.file ?? PREVIEW_FILE;
  const load = (next: string): void => {
    // A reload starts at the start screen. An author editing the question they
    // are looking at wants to stay there, so the same question is reopened.
    const was = quiz.state.index;
    const mode = quiz.state.mode;
    void quiz
      .load({ type: "text", text: next, file })
      .catch(() => undefined)
      .then(() => {
        const plan = quiz.state.plan;
        if (was > -1 && plan !== null) {
          quiz.setMode(mode);
          quiz.goTo(Math.min(was, plan.questions.length - 1));
        }
        restore();
      });
  };
  load(text);

  const mounted = mountQuiz(quiz, host, {
    attempts: false,
    printSheet: false,
    // The editor around this box owns the caret.
    focusScreens: false,
  });
  // The player owns the head once it loads, so put it back after every change.
  const unsubscribe = keepHead ? quiz.subscribe(restore) : null;

  return {
    load,
    destroy() {
      unsubscribe?.();
      mounted.destroy();
      quiz.destroy();
      restore();
    },
  };
}
