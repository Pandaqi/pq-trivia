/**
 * The page's head belongs to the quiz.
 *
 * The template ships as `<html><body>`. Everything a page normally hardcodes —
 * charset, viewport, title, language — comes from the quiz once it is loaded.
 * A host that already set one of them keeps it: this only fills gaps.
 */

import type { Quiz } from "../../core/session/quiz";

function ensureMeta(doc: Document): void {
  if (doc.head.querySelector("meta[charset]") === null) {
    const tag = doc.createElement("meta");
    tag.setAttribute("charset", "utf-8");
    doc.head.prepend(tag);
  }
  if (doc.head.querySelector('meta[name="viewport"]') === null) {
    const tag = doc.createElement("meta");
    tag.name = "viewport";
    tag.content = "width=device-width, initial-scale=1";
    doc.head.append(tag);
  }
}

export interface HeadInfo {
  readonly title?: string;
  readonly language?: string | null;
}

/** Sets the title and language, and adds the two meta tags a page needs. */
export function applyHead(info: HeadInfo, doc: Document = document): void {
  ensureMeta(doc);
  const title = info.title?.trim() ?? "";
  if (title.length > 0) {
    doc.title = title;
  }
  const language = info.language?.trim() ?? "";
  if (language.length > 0) {
    doc.documentElement.lang = language;
  }
}

/** The quiz knows its own title and language. Ask it. */
export function applyHeadFromQuiz(quiz: Quiz, doc: Document = document): void {
  const meta = quiz.meta;
  if (meta === null) {
    return;
  }
  applyHead(
    {
      title: meta.title,
      language: quiz.state.language ?? meta.language,
    },
    doc,
  );
}
