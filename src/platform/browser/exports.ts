/**
 * Two buttons, two files. JSON for a tool, HTML for a handout.
 *
 * The handout is the standalone export: no script, no network, opens anywhere.
 */

import { toStandaloneHtml } from "../../core/export/standalone";
import type { Quiz } from "../../core/session/quiz";
import { downloadText, fileSlug } from "./download";

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

export function downloadQuizHandout(quiz: Quiz): void {
  const plan = quiz.state.plan;
  const meta = quiz.meta;
  if (plan === null || meta === null) {
    return;
  }
  downloadText(
    `${fileSlug(meta.title)}-handout.html`,
    toStandaloneHtml(plan, meta, { answers: true, explanations: true }),
    "text/html",
  );
}
