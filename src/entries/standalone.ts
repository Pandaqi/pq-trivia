/**
 * One file. `dist/v3/pq-trivia.min.js`.
 *
 * Drop it next to an `index.html`, point a script tag at it, put the quiz in a
 * `<script id="quiz-text" type="text/plain">`, and open the page. The theme is
 * inside the bundle: no stylesheet, no fonts, no second request.
 *
 * Themes with their own folder can still be added with `theme="…"` when the
 * page is served, or picked from disk when the quiz allows it.
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
import { VERSION } from "../core/version";
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

/** `<script id="quiz-text" type="text/plain">` is the whole quiz. */
function boot(): void {
  if (typeof document === "undefined") {
    return;
  }
  const source = document.getElementById("quiz-text");
  const text = source?.textContent ?? "";
  if (source === null || text.trim().length === 0) {
    return;
  }
  if (document.querySelector("pq-quiz") !== null) {
    return;
  }
  const host = document.createElement("div");
  source.after(host);
  const quiz = createQuiz({ config: { answersKey: browserAnswerKey } });
  mountQuiz(quiz, host);
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
