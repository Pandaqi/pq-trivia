/**
 * The settings panel's buttons: a file, a clipboard, or paper.
 *
 * The handout is the standalone export: no script, no network, opens anywhere.
 */

import { toStandaloneHtml } from "../../core/export/standalone";
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
