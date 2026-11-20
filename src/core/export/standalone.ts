/**
 * Standalone HTML. One file, no JavaScript, opens from a USB stick.
 *
 * It is a handout, not a player: questions and, if asked, the answers. Good for
 * classrooms, substitutes and the folder you keep for Wi-Fi-less nights.
 */

import {
  InlineKind,
  isSafeHref,
  parseInline,
  type InlineNode,
} from "../format/inline";
import type { QuizMeta } from "../model/quiz";
import type { QuizPlan } from "../plan/plan";
import type { MediaOptions } from "../values/media";
import {
  buildPrintModel,
  PrintPageKind,
  type PrintDocument,
  type PrintQuestion,
} from "./printModel";

export interface StandaloneOptions {
  readonly answers?: boolean;
  readonly explanations?: boolean;
  /** Media folder, link prefixes and formats. The same rules as the player. */
  readonly media?: MediaOptions;
  /** `QuestionNumbers => false` leaves the headline bare. On when unset. */
  readonly numbers?: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const EMPHASIS: Readonly<Record<string, string>> = {
  [InlineKind.Strong]: "strong",
  [InlineKind.Em]: "em",
  [InlineKind.Underline]: "u",
  [InlineKind.Strike]: "s",
  [InlineKind.Mark]: "mark",
  [InlineKind.Kbd]: "kbd",
  [InlineKind.Fn]: "small",
  [InlineKind.Spoiler]: "span",
  [InlineKind.Sup]: "sup",
  [InlineKind.Sub]: "sub",
};

/** The same inline AST the player uses, as safe HTML. No raw input. */
export function inlineToHtml(nodes: readonly InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case InlineKind.Text:
          return escapeHtml(node.text);
        case InlineKind.Code:
          return `<code>${escapeHtml(node.text)}</code>`;
        case InlineKind.CodeBlock:
          return `<pre class="code-block"><code>${escapeHtml(node.code)}</code></pre>`;
        case InlineKind.Blank:
          return `<span class="blank">____</span>`;
        case InlineKind.Break:
          return "<br />";
        case InlineKind.Link:
          return isSafeHref(node.href)
            ? `<a href="${escapeHtml(node.href)}" rel="noopener noreferrer">${inlineToHtml(node.children)}</a>`
            : inlineToHtml(node.children);
        case InlineKind.Image:
          return isSafeHref(node.src)
            ? `<img class="inline-media" src="${escapeHtml(node.src)}" alt="${escapeHtml(node.alt)}" loading="lazy" />`
            : escapeHtml(node.alt);
        case InlineKind.Abbr:
          return `<abbr title="${escapeHtml(node.title)}">${inlineToHtml(node.children)}</abbr>`;
        case InlineKind.Span: {
          const className = node.attributes["class"];
          const style = node.attributes["style"];
          const attributes = [
            className === undefined
              ? ""
              : ` class="pq-${escapeHtml(className)}"`,
            style === undefined ? "" : ` style="${escapeHtml(style)}"`,
          ].join("");
          return `<span${attributes}>${inlineToHtml(node.children)}</span>`;
        }
        default: {
          const tag = EMPHASIS[node.kind] ?? "span";
          return `<${tag}>${inlineToHtml(node.children)}</${tag}>`;
        }
      }
    })
    .join("");
}

function renderText(text: string): string {
  return inlineToHtml(parseInline(text).nodes);
}

function renderQuestion(question: PrintQuestion, answers: boolean): string {
  const media =
    question.media.length === 0
      ? ""
      : `<p class="media">${question.media
          .map((item) => `${escapeHtml(item.path)} (${item.kind})`)
          .join(" · ")}</p>`;
  const choices = question.answers
    .map((answer) => {
      const mark = answers && answer.correct ? " is-correct" : "";
      const points =
        answers && answer.points !== null
          ? ` <span class="points">+${answer.points}</span>`
          : "";
      return `<li class="answer${mark}">${renderText(answer.text)}${points}</li>`;
    })
    .join("");
  const hints =
    question.hints.length === 0
      ? ""
      : `<div class="hints"><strong>Hints</strong><ul>${question.hints
          .map((hint) => `<li>${renderText(hint)}</li>`)
          .join("")}</ul></div>`;
  const explanation =
    answers && question.explanation !== null
      ? `<p class="explanation">${renderText(question.explanation)}</p>`
      : "";
  const listClass = answers ? "answers with-answers" : "answers";
  const answerList =
    choices.length === 0 ? "" : `<ol class="${listClass}">${choices}</ol>`;
  return `<article class="question">
  <p class="qmeta">Question ${question.index + 1}${question.roundName === null ? "" : ` · ${escapeHtml(question.roundName)}`} · ${question.points} ${question.points === 1 ? "point" : "points"}</p>
  <h2>${renderText(question.title)}</h2>
  ${question.body.map((line) => `<p>${renderText(line)}</p>`).join("")}
  ${media}
  ${answerList}
  ${hints}
  ${explanation}
</article>`;
}

function renderDocument(doc: PrintDocument, answers: boolean): string {
  return doc.pages
    .map((page) => {
      if (page.kind === PrintPageKind.Cover) {
        return `<section class="page cover">
  <h1>${escapeHtml(page.title)}</h1>
  ${page.subtitle === null ? "" : `<p class="subtitle">${escapeHtml(page.subtitle)}</p>`}
  <p class="meta">Seed ${escapeHtml(doc.seed)} · ${doc.maxScore} points${answers ? " · with answers" : ""}</p>
</section>`;
      }
      if (page.kind === PrintPageKind.Round) {
        return `<section class="page round">
  <p class="kicker">Round</p>
  <h1>${escapeHtml(page.title)}</h1>
  ${page.subtitle === null ? "" : `<p class="secret">Theme: ${escapeHtml(page.subtitle)}</p>`}
</section>`;
      }
      return `<section class="page">
  ${page.questions.map((question) => renderQuestion(question, answers)).join("")}
</section>`;
    })
    .join("\n");
}

const STYLE = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0 auto; max-width: 46rem; padding: 2rem 1.25rem;
  font: 16px/1.55 "Segoe UI", system-ui, sans-serif; color: #2f2a33; background: #faf5ea; }
h1, h2 { font-family: Georgia, "Times New Roman", serif; line-height: 1.15; }
h1 { font-size: 2.2rem; margin: 0.2rem 0 0.6rem; }
h2 { font-size: 1.35rem; margin: 0.2rem 0 0.5rem; }
.page { padding: 1.5rem 0 2rem; border-bottom: 1px solid #d9d0be; }
.cover { text-align: center; padding-top: 5rem; }
.subtitle { font-style: italic; color: #5f585e; }
.meta, .qmeta, .kicker { font-size: 0.82rem; letter-spacing: 0.06em;
  text-transform: uppercase; color: #5f585e; margin: 0.2rem 0; }
.question { margin: 0 0 1.4rem; }
.answers { margin: 0.4rem 0 0; padding-left: 1.4rem; }
.answer.is-correct { font-weight: 700; color: #2f7a4f; }
.points { font-size: 0.8rem; color: #5f585e; }
.explanation { color: #5f585e; font-style: italic; }
.hints ul { margin: 0.2rem 0; }
.blank { letter-spacing: 0.1em; }
code, kbd { font-family: ui-monospace, Consolas, monospace; background: #f2e9d9;
  padding: 0 0.25rem; border-radius: 4px; }
@media print {
  body { max-width: none; background: #fff; padding: 0; }
  .page { break-after: page; border: 0; padding: 1rem 0; }
  .page:last-child { break-after: auto; }
}
`;

export function toStandaloneHtml(
  plan: QuizPlan,
  meta: QuizMeta,
  options: StandaloneOptions = {},
): string {
  const answers = options.answers === true;
  const doc = buildPrintModel(plan, meta, {
    variant: answers ? "answers" : "questions",
    includeExplanations: answers || options.explanations === true,
    ...(options.media === undefined ? {} : { media: options.media }),
    ...(options.numbers === undefined ? {} : { numbers: options.numbers }),
  });
  const title = escapeHtml(doc.title);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>${STYLE}</style>
</head>
<body>
${renderDocument(doc, answers)}
</body>
</html>
`;
}
