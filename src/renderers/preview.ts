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
import type { PreviewPlace } from "../editor/mount";
import { mountQuiz } from "./preact/mount";

export interface MountedPreview {
  /** Same player, new text. Cheaper than a remount and keeps the pane's place. */
  load(text: string): void;
  /** Jump to the slide the author picked in the list. */
  show(place: PreviewPlace): void;
  destroy(): void;
}

/** Where a section screen nobody wrote comes from. */
const SYNTHETIC = "<section-screen>";

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
  /** The slide the wizard last asked for. Survives a reload. */
  let wanted: PreviewPlace | null = null;

  const show = (place: PreviewPlace): void => {
    wanted = place;
    const plan = quiz.state.plan;
    if (plan === null) {
      return;
    }
    if (place.kind === "end") {
      quiz.goToEnd();
      return;
    }
    if (place.kind === "header" || place.kind === "start") {
      quiz.goToStart();
      return;
    }
    // A line survives the player adding screens the author never wrote, so
    // find the question there first and fall back to the block index.
    const at =
      place.line > 0
        ? plan.questions.findIndex(
            (question) =>
              question.location.file !== SYNTHETIC &&
              question.location.line === place.line,
          )
        : -1;
    const index =
      at >= 0
        ? at
        : Math.min(Math.max(place.index, 0), plan.questions.length - 1);
    quiz.goTo(index);
  };

  const load = (next: string): void => {
    // A reload starts at the start screen. The author wants the slide they are
    // on, or the one they picked in the list, not the start.
    const was = quiz.state.index;
    const mode = quiz.state.mode;
    void quiz
      .load({ type: "text", text: next, file })
      .catch(() => undefined)
      .then(() => {
        const plan = quiz.state.plan;
        // Read late: the wizard may have asked for a slide while this loaded.
        const place = wanted;
        if (plan === null) {
          restore();
          return;
        }
        if (place !== null) {
          // After a reload the player is back at the top. Follow the author.
          show(place);
        } else if (was > -1) {
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
    show,
    destroy() {
      unsubscribe?.();
      mounted.destroy();
      quiz.destroy();
      restore();
    },
  };
}
