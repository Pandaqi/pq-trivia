/** CSV. Grades for the gradebook, questions for the spreadsheet people. */

import { inlineToPlainText, parseInline } from "../format/inline";
import type { GradeReport } from "../grading/report";
import type { QuestionModel } from "../model/question";
import type { QuizMeta } from "../model/quiz";
import type { QuizPlan } from "../plan/plan";

export interface CsvOptions {
  readonly delimiter?: string;
}

const NEEDS_QUOTES = /[",\n\r]/;

export function escapeCsv(value: string, delimiter = ","): string {
  const text = value.replaceAll("\r\n", "\n").replaceAll("\n", " ");
  if (NEEDS_QUOTES.test(text) || text.includes(delimiter)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function row(cells: readonly string[], delimiter: string): string {
  return cells.map((cell) => escapeCsv(cell, delimiter)).join(delimiter);
}

function plain(text: string): string {
  return inlineToPlainText(parseInline(text).nodes).trim();
}

/** One row per question, with the player's answer next to the right one. */
export function gradesCsv(
  report: GradeReport,
  options: CsvOptions = {},
): string {
  const delimiter = options.delimiter ?? ",";
  const rows: string[] = [
    row(
      [
        "Question",
        "Number",
        "Round",
        "Type",
        "Points",
        "Max",
        "Status",
        "Your answer",
        "Correct answer",
      ],
      delimiter,
    ),
  ];
  for (const question of report.questions) {
    rows.push(
      row(
        [
          question.title,
          String(question.index + 1),
          question.roundName ?? "",
          question.type,
          String(question.points),
          String(question.maxPoints),
          question.correct
            ? "correct"
            : question.answered
              ? "wrong"
              : "skipped",
          question.parts.map((part) => part.given).join(" | "),
          question.parts.map((part) => part.expected).join(" | "),
        ],
        delimiter,
      ),
    );
  }
  rows.push(
    row(
      [
        "Total",
        "",
        "",
        "",
        String(report.points),
        String(report.maxPoints),
        `${report.percent}%`,
        "",
        "",
      ],
      delimiter,
    ),
  );
  return rows.join("\r\n");
}

function answerText(question: QuestionModel): string {
  return question.answers.map((value) => plain(value.text)).join(" | ");
}

/** A content sheet: every question, its answers and where it came from. */
export function questionsCsv(
  plan: QuizPlan,
  meta: QuizMeta,
  options: CsvOptions = {},
): string {
  const delimiter = options.delimiter ?? ",";
  const rows: string[] = [
    row(
      [
        "Number",
        "Round",
        "Type",
        "Question",
        "Answers",
        "Correct",
        "Points",
        "Categories",
        "Sources",
      ],
      delimiter,
    ),
  ];
  plan.questions.forEach((question, index) => {
    rows.push(
      row(
        [
          String(index + 1),
          plan.rounds.find((round) => round.id === question.round)?.name ?? "",
          question.type,
          question.text.map((value) => plain(value.text)).join(" "),
          answerText(question),
          question.correct.map((value) => plain(value.text)).join(" | "),
          String(question.score),
          question.categories.join(" | "),
          question.sources.join(" | "),
        ],
        delimiter,
      ),
    );
  });
  rows.push(
    row(
      ["", "", "", meta.title, "", "", String(plan.maxScore), "", ""],
      delimiter,
    ),
  );
  return rows.join("\r\n");
}
