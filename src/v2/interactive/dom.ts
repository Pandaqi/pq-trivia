import { createFullscreenOverlay } from "../nodes/nodes";
import type { Quiz } from "../quiz";

export enum QuizAction {
  NEXT = "next",
  NEXT_SECTION = "next-section",
  PREV = "prev",
  PREV_SECTION = "prev-section",
  REVEAL = "reveal",
  MEDIA = "media",
  MEDIA_FULLSCREEN = "fullscreen",
  MODE = "mode",
  START = "start",
  END = "end",
  FONT_SIZE_PLUS = "font-size-plus",
  FONT_SIZE_MIN = "font-size-min",
  HINT = "hint",
  LANGUAGE = "language",
}

export const DEFAULT_HOTKEYS: Record<QuizAction, string[]> = {
  [QuizAction.NEXT]: ["ArrowUp", "ArrowRight"], // removed spacebar because easy to accidentally touch + useful for playing media
  [QuizAction.NEXT_SECTION]: [".", ">"],
  [QuizAction.PREV]: ["ArrowDown", "ArrowLeft"],
  [QuizAction.PREV_SECTION]: [",", "<"],
  [QuizAction.REVEAL]: ["a"],
  [QuizAction.MODE]: ["m"],
  [QuizAction.END]: ["Escape"],
  [QuizAction.START]: [],
  [QuizAction.MEDIA]: ["Enter", " "], // Spacebar ... is an empty space as KEY string :/
  [QuizAction.MEDIA_FULLSCREEN]: ["f"],
  [QuizAction.FONT_SIZE_PLUS]: ["+", "="],
  [QuizAction.FONT_SIZE_MIN]: ["-", "_"],
  [QuizAction.HINT]: ["h"],
  [QuizAction.LANGUAGE]: ["l"],
};

export const mouseEventIsNearEdge = (ev: MouseEvent, ratio = 0.175) => {
  const posX = ev.clientX;
  const sizeX = window.innerWidth;
  //const posY = ev.clientY;
  //const sizeY = window.innerHeight;
  const xRatio = posX / sizeX;
  return xRatio < ratio || xRatio > 1.0 - ratio;
};

export const cancelEvent = (ev) => {
  ev.stopPropagation();
  ev.preventDefault();
  return false;
};

export const signal = (what: string, detail = {}) => {
  const ev = new CustomEvent(what, { detail: detail });
  document.body.dispatchEvent(ev);
};

export const listenForAction = (eventName: QuizAction, callback) => {
  document.body.addEventListener(eventName, callback);
};

export const connectActionsToQuiz = (quiz: Quiz) => {
  listenForAction(QuizAction.NEXT, () => quiz.gotoNext());
  listenForAction(QuizAction.NEXT_SECTION, () => quiz.gotoNextSection());
  listenForAction(QuizAction.PREV, () => quiz.gotoPrevious());
  listenForAction(QuizAction.PREV_SECTION, () => quiz.gotoPreviousSection());
  listenForAction(QuizAction.REVEAL, () => quiz.toggleAnswer());
  listenForAction(QuizAction.MEDIA, () => quiz.nodes.toggleMedia());
  listenForAction(QuizAction.MODE, () => quiz.toggleMode());
  listenForAction(QuizAction.END, () => quiz.gotoEnd());
  listenForAction(QuizAction.START, () => quiz.gotoStart());
  listenForAction(QuizAction.FONT_SIZE_PLUS, () =>
    quiz.nodes.changeFontSize(+1),
  );
  listenForAction(QuizAction.FONT_SIZE_MIN, () =>
    quiz.nodes.changeFontSize(-1),
  );
  listenForAction(QuizAction.HINT, () => quiz.nodes.revealNextHint());
  listenForAction(QuizAction.LANGUAGE, () => quiz.gotoNextLanguage());
};

export const enableSwipeActions = () => {
  let touchStartX = 0;
  let touchEndX = 0;
  const minDistanceForSwipe = 25; // pixels

  document.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  document.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;

    const dist = Math.abs(touchEndX - touchStartX);
    if (dist < minDistanceForSwipe) {
      return;
    }

    if (touchEndX < touchStartX) {
      signal(QuizAction.PREV);
    }
    if (touchEndX > touchStartX) {
      signal(QuizAction.NEXT);
    }
  });
};

export class DOM {
  fakeElement: HTMLElement;
  hotkeys: Record<string, string[]>;

  constructor(quiz: Quiz) {
    this.fakeElement = document.createElement("div");

    if (quiz.params.enableMouse) {
      document.body.addEventListener("click", this.onMouseClick.bind(this));
    }

    if (!quiz.params.disableKeys) {
      document.body.addEventListener("keyup", this.onKeyPress.bind(this));
    }

    if (!quiz.params.disableTouch) {
      enableSwipeActions();
    }

    // load custom hotkeys if set, otherwise defaults
    this.hotkeys = {};
    for (const [key, value] of Object.entries(DEFAULT_HOTKEYS)) {
      if (quiz.params.hotkeysForbidden.includes(key)) {
        continue;
      }
      const customValue = quiz.params.hotkeys[key];
      this.hotkeys[key] = customValue ? [customValue].flat() : value;
    }

    connectActionsToQuiz(quiz);
  }

  onMouseClick(ev: MouseEvent) {
    if (!mouseEventIsNearEdge(ev)) {
      return;
    }
    signal(QuizAction.NEXT);
  }

  onKeyPress(ev: KeyboardEvent) {
    // do NOT listen to hotkeys if we're typing something into input fields
    if (document.activeElement) {
      const tagName = document.activeElement.tagName.toLowerCase(); // why the fuck does this return all uppercase?
      if (["input", "textarea"].includes(tagName)) {
        return;
      }
    }

    // otherwise, check what was pressed and send all connected signals
    this.fakeElement.focus();

    const key = ev.key;
    let reacted = false;

    for (const [actionType, hotkeyStrings] of Object.entries(this.hotkeys)) {
      if (!hotkeyStrings.includes(key)) {
        continue;
      }
      signal(actionType as QuizAction);
      reacted = true;
    }

    // if succeeded, make sure the hotkey doesn't dispatch any further events
    if (reacted) {
      cancelEvent(ev);
    }
  }

  onScreenChanged(screen: HTMLElement) {
    // make all images interactive
    const images = Array.from(screen.querySelectorAll("img"));
    for (const img of images) {
      img.addEventListener("click", (ev) => createFullscreenOverlay(img));
    }
  }
}
