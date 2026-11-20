/**
 * The settings panel's buttons: a file, a clipboard, or paper.
 *
 * The handout is the standalone export: no script, no network, opens anywhere.
 */

import { toStandaloneHtml } from "../../core/export/standalone";
import { analyticsCsv } from "../../core/export/analytics";
import { orderFromQuery, shareQuery } from "../../core/plan/share";
import type { Quiz } from "../../core/session/quiz";
import { downloadText, fileSlug } from "./download";
import { requestPrint, type PrintKind } from "./print";

function title(quiz: Quiz): string {
  return quiz.meta?.title ?? "quiz";
}

export function downloadQuizJson(quiz: Quiz): void {
  const embedded = quiz.export.embedded();
  downloadText(
    `${fileSlug(title(quiz))}.json`,
    `${JSON.stringify(embedded, null, 2)}\n`,
    "application/json",
  );
}

export function downloadQuizTrivia(quiz: Quiz): void {
  const text = quiz.sourceText();
  if (text === null) {
    return;
  }
  downloadText(`${fileSlug(title(quiz))}.trivia`, text, "text/plain");
}

export function downloadQuizCsv(quiz: Quiz): void {
  downloadText(
    `${fileSlug(title(quiz))}-questions.csv`,
    quiz.export.csv(),
    "text/csv",
  );
}

export function downloadQuizGift(quiz: Quiz): void {
  downloadText(
    `${fileSlug(title(quiz))}.gift.txt`,
    quiz.export.gift(),
    "text/plain",
  );
}

export function downloadQuizQti(quiz: Quiz): void {
  downloadText(
    `${fileSlug(title(quiz))}.qti.xml`,
    quiz.export.qti(),
    "application/xml",
  );
}

/** Results so far. A half-played quiz exports what has been answered. */
export function downloadQuizGrades(quiz: Quiz): void {
  const text = quiz.export.grades();
  if (text === null) {
    return;
  }
  downloadText(`${fileSlug(title(quiz))}-results.csv`, text, "text/csv");
}

/**
 * A link to this quiz with the seed and the order in it. Never an answer.
 * Null without a page, so a Worker can import this file and not explode.
 */
export function shareQuizUrl(quiz: Quiz): string | null {
  if (typeof location === "undefined") {
    return null;
  }
  const url = new URL(location.href);
  url.search = shareQuery({
    seed: quiz.config.seed ?? "",
    shuffleQuestions: quiz.config.shuffleQuestions === true,
    shuffleRounds: quiz.config.shuffleRounds === true,
  });
  url.hash = "";
  return url.toString();
}

export function copyQuizShareLink(quiz: Quiz): Promise<boolean> {
  const url = shareQuizUrl(quiz);
  return url === null ? Promise.resolve(false) : copyText(url);
}

/** Read `?seed=` and the order flags after loading. Same quiz, same plan. */
export function applyShareOrder(quiz: Quiz): void {
  if (typeof location === "undefined") {
    return;
  }
  const order = orderFromQuery(location.search);
  if (Object.keys(order).length > 0) {
    quiz.setOrder(order);
  }
}

/** Every saved attempt on this device, one row per question. */
export async function downloadQuizAttempts(quiz: Quiz): Promise<boolean> {
  const attempts = await quiz.history();
  if (attempts.length === 0) {
    return false;
  }
  downloadText(
    `${fileSlug(title(quiz))}-analytics.csv`,
    analyticsCsv(attempts),
    "text/csv",
  );
  return true;
}

export function downloadQuizHandout(quiz: Quiz): void {
  const plan = quiz.state.plan;
  const meta = quiz.meta;
  if (plan === null || meta === null) {
    return;
  }
  downloadText(
    `${fileSlug(meta.title)}-handout.html`,
    toStandaloneHtml(plan, meta, {
      answers: true,
      explanations: true,
      media: quiz.config,
      numbers: quiz.config.questionNumbers !== false,
    }),
    "text/html",
  );
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
      return false;
    }
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function copyQuizJson(quiz: Quiz): Promise<boolean> {
  return copyText(`${JSON.stringify(quiz.export.embedded(), null, 2)}\n`);
}

export function copyQuizTrivia(quiz: Quiz): Promise<boolean> {
  const text = quiz.sourceText();
  return text === null ? Promise.resolve(false) : copyText(text);
}

export function printQuiz(kind: PrintKind): void {
  requestPrint(kind);
}
