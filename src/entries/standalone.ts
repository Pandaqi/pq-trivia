/**
 * One file. `dist/v3/pq-trivia.min.js`.
 *
 * Drop it next to an `index.html`, point a script tag at it, put the quiz in a
 * `<script id="quiz-text" type="text/plain">`, and open the page. The theme is
 * inside the bundle: no stylesheet, no fonts, no second request.
 *
 * Live play is in here too, because "open one file and run a quiz night" is the
 * whole point. The room code is generated when you press the button; nobody
 * types one.
 *
 * Trystero is not inlined (it is a signalling stack, not a button). Load it in
 * the page and call `PQTrivia.registerTrystero(module)`; without it a room is
 * local to this browser, which is still enough to rehearse.
 */

import paperBase from "../themes/paper.base.css" with { type: "text" };
import paperAnswers from "../themes/paper.answers.css" with { type: "text" };
import paperControls from "../themes/paper.controls.css" with { type: "text" };
import paperInteractive from "../themes/paper.interactive.css" with { type: "text" };
import paperLive from "../themes/paper.live.css" with { type: "text" };
import printForms from "../themes/print.forms.css" with { type: "text" };
import printPages from "../themes/print.pages.css" with { type: "text" };
import printQuestions from "../themes/print.questions.css" with { type: "text" };

import { buildQuiz } from "../core/model/quiz";
import { planQuiz } from "../core/plan/plan";
import { parse } from "../core/syntax/parser";
import { format } from "../core/syntax/serialize";
import { Quiz, createQuiz } from "../core/session/quiz";
import { ScreenKind } from "../core/session/viewModel";
import { VERSION } from "../core/version";
import {
  codeFromUrl,
  createRoomCode,
  joinUrl,
  normalizeRoomCode,
} from "../multiplayer/code";
import { createBroadcastTransport } from "../multiplayer/transport/broadcast";
import {
  createTrysteroTransport,
  registerTrysteroModule,
} from "../multiplayer/transport/trystero";
import type { RoomTransport } from "../multiplayer/transport/types";
import { LiveRole } from "../multiplayer/types";
import { mountLive, type MountedLive } from "../multiplayer/ui/mountLive";
import { browserAnswerKey } from "../platform/answerKey";
import {
  loadTheme,
  resolveThemeFolder,
  setTheme,
  themeFromFiles,
} from "../platform/browser/theme";
import { mountQuiz } from "../renderers/preact/mount";
import { defineQuizElement } from "../renderers/dom/quizElement";

const PAPER = [
  paperBase,
  paperAnswers,
  paperControls,
  paperInteractive,
  paperLive,
].join("\n\n");

const PRINT = [printPages, printQuestions, printForms].join("\n\n");

/** One namespace for every one-file room. Codes keep quizzes apart. */
const APP_ID = "pq-trivia";

/** The quiz mount and the live mount, so a host can go back and forth. */
let quizHost: HTMLElement | null = null;
let liveHost: HTMLElement | null = null;
let transport: RoomTransport | null = null;

/** Trystero when the page handed it over, a local room otherwise. */
async function transportFor(): Promise<RoomTransport> {
  if (transport !== null) {
    return transport;
  }
  try {
    transport = await createTrysteroTransport({ appId: APP_ID });
  } catch {
    transport = createBroadcastTransport();
  }
  return transport;
}

/** The one place the bundle writes to the page before mounting. */
function injectStyles(): void {
  if (typeof document === "undefined") {
    return;
  }
  // A one-file quiz owns the page. No body margin, or 100dvh grows a scrollbar.
  if (document.getElementById("pq-page") === null) {
    const page = document.createElement("style");
    page.id = "pq-page";
    page.textContent = "html, body { margin: 0; height: 100%; }";
    document.head.append(page);
  }
  if (document.getElementById("pq-theme")) {
    return;
  }
  const screen = document.createElement("style");
  screen.id = "pq-theme";
  screen.textContent = PAPER;
  document.head.append(screen);

  const print = document.createElement("style");
  print.id = "pq-theme-print";
  print.media = "print";
  print.textContent = PRINT;
  document.head.append(print);
}

function liveTarget(): HTMLElement | null {
  if (typeof document === "undefined" || quizHost === null) {
    return null;
  }
  if (liveHost === null) {
    liveHost = document.createElement("div");
    liveHost.className = "pq-quiz";
    quizHost.after(liveHost);
  }
  quizHost.hidden = true;
  liveHost.hidden = false;
  return liveHost;
}

function backToQuiz(button: HTMLElement, mounted: MountedLive): void {
  mounted.destroy();
  button.remove();
  if (quizHost !== null) {
    quizHost.hidden = false;
  }
  if (liveHost !== null) {
    liveHost.hidden = true;
  }
}

/**
 * Open a room and show the host screen. No code asked for, none remembered:
 * every night gets a fresh one.
 */
export async function startLive(options: {
  readonly quiz: Quiz;
  readonly code?: string;
}): Promise<MountedLive | null> {
  const target = liveTarget();
  if (target === null || typeof document === "undefined") {
    return null;
  }
  const code = normalizeRoomCode(options.code ?? createRoomCode());
  const mounted = mountLive({
    target,
    role: LiveRole.Host,
    code,
    quiz: options.quiz,
    transport: await transportFor(),
    joinLink: joinUrl(code),
  });
  const exit = document.createElement("button");
  exit.type = "button";
  exit.className = "pq-link";
  exit.textContent = "Back to the quiz";
  exit.addEventListener("click", () => backToQuiz(exit, mounted));
  target.after(exit);
  return mounted;
}

/** A shared link lands here: `?pq-live=ABCD` is a seat in the room. */
export async function joinLive(
  code: string,
  target: HTMLElement | null = quizHost,
): Promise<MountedLive | null> {
  if (target === null) {
    return null;
  }
  return mountLive({
    target,
    role: LiveRole.Player,
    code: normalizeRoomCode(code),
    transport: await transportFor(),
    joinLink: joinUrl(code),
  });
}

/**
 * The live button belongs on the start screen. A question slide is for
 * questions, not for re-opening a room halfway through the quiz.
 */
function attachLiveAction(quiz: Quiz): void {
  let remove: (() => void) | null = null;
  const sync = (): void => {
    const onStart = quiz.currentScreen()?.kind === ScreenKind.Start;
    if (onStart && remove === null) {
      remove = quiz.actions.add({
        id: "live",
        label: quiz.t("goLive"),
        run: () => void startLive({ quiz }),
      });
      return;
    }
    if (!onStart && remove !== null) {
      remove();
      remove = null;
    }
  };
  sync();
  quiz.subscribe(sync);
}

/** `<script id="quiz-text" type="text/plain">` is the whole quiz. */
function boot(): void {
  if (typeof document === "undefined") {
    return;
  }
  const source = document.getElementById("quiz-text");
  const text = source?.textContent ?? "";
  const join = codeFromUrl(location.search);
  if (join === null && (source === null || text.trim().length === 0)) {
    return;
  }
  if (document.querySelector("pq-quiz") !== null) {
    return;
  }
  const host = document.createElement("div");
  quizHost = host;
  if (source === null) {
    document.body.append(host);
  } else {
    source.after(host);
  }
  // A phone that opened the join link needs no questions of its own.
  if (join !== null) {
    void joinLive(join, host);
    return;
  }
  const quiz = new Quiz({ config: { answersKey: browserAnswerKey } });
  mountQuiz(quiz, host);
  attachLiveAction(quiz);
  void quiz.load({ type: "text", text, file: "inline" }).then(() => {
    const name = quiz.meta?.theme;
    if (name === null || name === undefined || name.trim().length === 0) {
      return;
    }
    const folder = name.includes("/") ? name : `themes/${name}/`;
    void loadTheme(resolveThemeFolder(folder))
      .then(setTheme)
      .catch(() => undefined);
  });
}

const api = {
  VERSION,
  Quiz,
  createQuiz,
  mountQuiz,
  mountLive,
  startLive,
  joinLive,
  createRoomCode,
  registerTrystero: registerTrysteroModule,
  defineQuizElement,
  parse,
  format,
  buildQuiz,
  planQuiz,
  loadTheme,
  themeFromFiles,
  setTheme,
  boot,
};

(globalThis as unknown as Record<string, unknown>)["PQTrivia"] = api;

injectStyles();

if (typeof customElements !== "undefined") {
  defineQuizElement();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}

export { api };
