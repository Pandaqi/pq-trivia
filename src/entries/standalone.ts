/**
 * Standalone IIFE. `window.PQTrivia`, for `file://` pages.
 *
 * The CSS is a separate file on purpose. Inlining it would fight author themes.
 */

import { buildQuiz } from "../core/model/quiz";
import { planQuiz } from "../core/plan/plan";
import { parse } from "../core/syntax/parser";
import { format } from "../core/syntax/serialize";
import { createQuiz } from "../core/session/quiz";
import { VERSION } from "../core/version";
import { mountQuiz } from "../renderers/preact/mount";
import { defineQuizElement } from "../renderers/dom/quizElement";

const api = {
  VERSION,
  createQuiz,
  mountQuiz,
  defineQuizElement,
  parse,
  format,
  buildQuiz,
  planQuiz,
};

(globalThis as unknown as Record<string, unknown>)["PQTrivia"] = api;

if (typeof customElements !== "undefined") {
  defineQuizElement();
}

export { api };
