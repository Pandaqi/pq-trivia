/**
 * A class in one spreadsheet: every question, how often it was answered and
 * how often it was right.
 *
 * Reads saved attempt records, which already hold a `GradeReport`. No quiz
 * model and no live session, so a teacher can export last week's lesson.
 */

import type { AttemptRecord } from "../session/attempts";
import { escapeCsv } from "./csv";

export interface AttemptQuestionStat {
  readonly id: string;
  readonly title: string;
  readonly number: number;
  readonly round: string;
  readonly type: string;
  readonly attempts: number;
  readonly answered: number;
  readonly correct: number;
  readonly points: number;
  readonly maxPoints: number;
  readonly averagePoints: number;
  readonly correctPercent: number;
}

export interface AttemptSummary {
  readonly attempts: number;
  readonly finished: number;
  readonly questions: number;
  readonly averagePercent: number;
  readonly bestPercent: number;
}

interface MutableStat {
  id: string;
  title: string;
  number: number;
  round: string;
  type: string;
  attempts: number;
  answered: number;
  correct: number;
  points: number;
  maxPoints: number;
}

function percent(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 1000) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** One row per question, summed over every graded attempt. */
export function questionStats(
  attempts: readonly AttemptRecord[],
): AttemptQuestionStat[] {
  const stats = new Map<string, MutableStat>();
  for (const attempt of attempts) {
    const report = attempt.report;
    if (report === null) {
      continue;
    }
    for (const question of report.questions) {
      const entry = stats.get(question.id) ?? {
        id: question.id,
        title: question.title,
        number: question.index + 1,
        round: question.roundName ?? "",
        type: question.type,
        attempts: 0,
        answered: 0,
        correct: 0,
        points: 0,
        maxPoints: 0,
      };
      entry.attempts += 1;
      entry.answered += question.answered ? 1 : 0;
      entry.correct += question.correct ? 1 : 0;
      entry.points = round2(entry.points + question.points);
      entry.maxPoints += question.maxPoints;
      stats.set(question.id, entry);
    }
  }
  return [...stats.values()]
    .map((entry) => ({
      ...entry,
      averagePoints: round2(entry.points / Math.max(entry.attempts, 1)),
      correctPercent: percent(entry.correct, entry.attempts),
    }))
    .sort((a, b) => a.number - b.number);
}

export function attemptSummary(
  attempts: readonly AttemptRecord[],
): AttemptSummary {
  const reports = attempts.flatMap((attempt) =>
    attempt.report === null ? [] : [attempt.report],
  );
  const percentages = reports.map((report) => report.percent);
  return {
    attempts: attempts.length,
    finished: reports.length,
    questions: reports[0]?.total ?? 0,
    averagePercent: percent(
      percentages.reduce((total, value) => total + value, 0),
      Math.max(percentages.length, 1),
    ),
    bestPercent: percentages.length === 0 ? 0 : Math.max(...percentages),
  };
}

export interface AnalyticsCsvOptions {
  readonly delimiter?: string;
}

/**
 * The summary first, then the questions. One file, two tables, which is what a
 * spreadsheet wants and a person can still read.
 */
export function analyticsCsv(
  attempts: readonly AttemptRecord[],
  options: AnalyticsCsvOptions = {},
): string {
  const delimiter = options.delimiter ?? ",";
  const line = (cells: readonly (string | number)[]): string =>
    cells.map((cell) => escapeCsv(String(cell), delimiter)).join(delimiter);
  const summary = attemptSummary(attempts);
  const rows: string[] = [
    line(["Attempts", "Graded", "Questions", "Average %", "Best %"]),
    line([
      summary.attempts,
      summary.finished,
      summary.questions,
      summary.averagePercent,
      summary.bestPercent,
    ]),
    "",
    line([
      "Question",
      "Number",
      "Round",
      "Type",
      "Attempts",
      "Answered",
      "Correct",
      "Correct %",
      "Points",
      "Max",
      "Average points",
    ]),
  ];
  for (const stat of questionStats(attempts)) {
    rows.push(
      line([
        stat.title,
        stat.number,
        stat.round,
        stat.type,
        stat.attempts,
        stat.answered,
        stat.correct,
        stat.correctPercent,
        stat.points,
        stat.maxPoints,
        stat.averagePoints,
      ]),
    );
  }
  return rows.join("\r\n");
}
