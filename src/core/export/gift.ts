/**
 * GIFT export. Moodle reads it. It is 1990s text, but so is Trivia Syntax.
 *
 * Special characters get a backslash. One question per block. Explanations
 * become general feedback.
 */

import { inlineToPlainText, parseInline } from "../format/inline";
import { QuestionType, type QuestionModel } from "../model/question";
import type { QuizMeta } from "../model/quiz";
import type { QuizPlan } from "../plan/plan";
import { visiblePlan } from "./visible";

function escapeGift(text: string): string {
  return text
    .replace(/([~=#{}:])/g, "\\$1")
    .replaceAll("\r\n", " ")
    .replaceAll("\n", " ")
    .trim();
}

function plain(text: string): string {
  return inlineToPlainText(parseInline(text).nodes).trim();
}

function stem(question: QuestionModel): string {
  return question.text.map((value) => escapeGift(plain(value.text))).join(" ");
}

function feedback(question: QuestionModel): string {
  return question.explanation === null
    ? ""
    : `\n#### ${escapeGift(plain(question.explanation))}`;
}

function pairOf(text: string): [string, string] | null {
  const index = text.indexOf("~");
  return index < 0
    ? null
    : [text.slice(0, index).trim(), text.slice(index + 1).trim()];
}

function choices(question: QuestionModel): string {
  const correct = new Set(question.correct.map((value) => value.text));
  return question.answers
    .map(
      (value) =>
        `${correct.has(value.text) ? "=" : "~"}${escapeGift(plain(value.text))}`,
    )
    .join("\n");
}

function body(question: QuestionModel): string {
  switch (question.type) {
    case QuestionType.Choice:
    case QuestionType.Sort:
      return `{\n${choices(question)}\n}`;
    case QuestionType.Match: {
      const pairs = question.answers
        .map((value) => pairOf(value.text))
        .filter((pair): pair is [string, string] => pair !== null)
        .map(
          ([left, right]) =>
            `=${escapeGift(plain(left))} -> ${escapeGift(plain(right))}`,
        );
      return `{\n${pairs.join("\n")}\n}`;
    }
    case QuestionType.Cloze: {
      const answers = question.correct.map(
        (value) => `=${escapeGift(plain(value.text))}`,
      );
      return `{ ${answers.join(" ")} }`;
    }
    case QuestionType.Range: {
      const target = plain(question.correct[0]?.text ?? "");
      const margin = question.range ?? 0;
      return `{#${escapeGift(target)}:${margin}}`;
    }
    case QuestionType.List: {
      const answers = question.correct.map(
        (value) => `=${escapeGift(plain(value.text))}`,
      );
      return `{\n${answers.join("\n")}\n}`;
    }
    case QuestionType.Open:
    default: {
      const accepted = [
        ...question.correct.map((value) => plain(value.text)),
        ...question.alsoAccept,
      ];
      const answers = accepted.map((value) => `=${escapeGift(value)}`);
      return `{ ${[...new Set(answers)].join(" ")} }`;
    }
  }
}

export function toGift(plan: QuizPlan, meta: QuizMeta): string {
  plan = visiblePlan(plan);
  const head =
    meta.title.length > 0
      ? `// ${meta.title}\n// Exported from PQ-Trivia\n\n`
      : "";
  const blocks = plan.questions.map((question, index) => {
    const name = `Q${index + 1}`;
    const sortNote =
      question.type === QuestionType.Sort
        ? `\n// Sort order: ${question.correct.map((value) => plain(value.text)).join(" > ")}`
        : "";
    return `::${name}:: ${stem(question)} ${body(question)}${feedback(question)}${sortNote}`;
  });
  return `${head}${blocks.join("\n\n")}\n`;
}
