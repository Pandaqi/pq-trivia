/**
 * The grade report: what the results screen, the CLI and the CSV export read.
 *
 * Plain data, no model objects. A report survives a `JSON.stringify` and comes
 * back the same, which is what an attempt history needs.
 */

import { inlineToPlainText, parseInline } from "../format/inline";
import type { QuestionModel } from "../model/question";
import type { QuizPlan } from "../plan/plan";
import { defaultResponse, type ResponseMap } from "../session/responses";
import {
  GradeKind,
  gradeQuestion,
  type GradeOptions,
  type GradePart,
} from "./grading";

export enum GradeBand {
  Excellent = "excellent",
  Good = "good",
  Fair = "fair",
  Practice = "practice",
  Empty = "empty",
}

export interface QuestionReport {
  readonly id: string;
  readonly index: number;
  readonly round: string | null;
  readonly roundName: string | null;
  readonly type: string;
  readonly title: string;
  readonly categories: readonly string[];
  readonly explanation: string | null;
  readonly sources: readonly string[];
  readonly answered: boolean;
  readonly correct: boolean;
  readonly kind: GradeKind;
  readonly points: number;
  readonly maxPoints: number;
  readonly parts: readonly GradePart[];
}

export interface RoundReport {
  readonly id: string;
  readonly name: string;
  readonly questions: number;
  readonly correct: number;
  readonly points: number;
  readonly maxPoints: number;
  readonly percent: number;
}

export interface CategoryReport {
  readonly name: string;
  readonly questions: number;
  readonly correct: number;
  readonly points: number;
  readonly maxPoints: number;
  readonly percent: number;
}

export interface GradeReport {
  readonly title: string;
  readonly total: number;
  readonly answered: number;
  readonly correct: number;
  readonly wrong: number;
  readonly unanswered: number;
  readonly points: number;
  readonly maxPoints: number;
  readonly percent: number;
  readonly band: GradeBand;
  readonly startedAt: number | null;
  readonly endedAt: number | null;
  readonly durationMs: number | null;
  readonly questions: readonly QuestionReport[];
  readonly rounds: readonly RoundReport[];
  readonly categories: readonly CategoryReport[];
}

export interface ReportOptions extends GradeOptions {
  readonly title?: string;
  readonly startedAt?: number | null;
  readonly endedAt?: number | null;
}

export enum ReportFilter {
  All = "all",
  Wrong = "wrong",
  Unanswered = "unanswered",
}

function percentOf(points: number, maxPoints: number): number {
  if (maxPoints <= 0) {
    return 0;
  }
  return Math.round((points / maxPoints) * 1000) / 10;
}

export function bandOf(percent: number, maxPoints: number): GradeBand {
  if (maxPoints <= 0) {
    return GradeBand.Empty;
  }
  if (percent >= 90) {
    return GradeBand.Excellent;
  }
  if (percent >= 70) {
    return GradeBand.Good;
  }
  if (percent >= 50) {
    return GradeBand.Fair;
  }
  return GradeBand.Practice;
}

function titleOf(question: QuestionModel): string {
  const first = question.text[0]?.text ?? question.id;
  return inlineToPlainText(parseInline(first).nodes).trim() || question.id;
}

/** Grade every playable question in plan order. */
export function gradeAttempt(
  plan: QuizPlan,
  responses: ResponseMap,
  options: ReportOptions = {},
): GradeReport {
  const questions: QuestionReport[] = [];
  const rounds = new Map<string, { name: string; items: QuestionReport[] }>();
  const categories = new Map<string, QuestionReport[]>();

  plan.questions.forEach((question, index) => {
    const response = responses[question.id] ?? defaultResponse(question);
    const result = gradeQuestion(question, response, options);
    const roundId = question.round ?? "";
    const roundName =
      plan.rounds.find((round) => round.id === question.round)?.name ?? null;
    const report: QuestionReport = {
      id: question.id,
      index,
      round: question.round,
      roundName,
      type: question.type,
      title: titleOf(question),
      categories: question.categories,
      explanation: question.explanation,
      sources: question.sources,
      answered: result.answered,
      correct: result.correct,
      kind: result.kind,
      points: result.points,
      maxPoints: result.maxPoints,
      parts: result.parts,
    };
    questions.push(report);

    const bucket = rounds.get(roundId) ?? {
      name: roundName ?? "",
      items: [],
    };
    bucket.items.push(report);
    rounds.set(roundId, bucket);

    for (const category of question.categories) {
      const list = categories.get(category) ?? [];
      list.push(report);
      categories.set(category, list);
    }
  });

  const points = questions.reduce((total, entry) => total + entry.points, 0);
  const maxPoints = plan.maxScore;
  const percent = percentOf(points, maxPoints);
  const correct = questions.filter((entry) => entry.correct).length;
  const answered = questions.filter((entry) => entry.answered).length;
  const startedAt = options.startedAt ?? null;
  const endedAt = options.endedAt ?? null;

  return {
    title: options.title ?? "",
    total: questions.length,
    answered,
    correct,
    wrong: answered - correct,
    unanswered: questions.length - answered,
    points: Math.round(points * 100) / 100,
    maxPoints,
    percent,
    band: bandOf(percent, maxPoints),
    startedAt,
    endedAt,
    durationMs:
      startedAt !== null && endedAt !== null
        ? Math.max(0, endedAt - startedAt)
        : null,
    questions,
    rounds: [...rounds.values()].map((bucket) => {
      const roundPoints = bucket.items.reduce(
        (total, entry) => total + entry.points,
        0,
      );
      const roundMax = bucket.items.reduce(
        (total, entry) => total + entry.maxPoints,
        0,
      );
      return {
        id: bucket.items[0]?.round ?? "",
        name: bucket.name,
        questions: bucket.items.length,
        correct: bucket.items.filter((entry) => entry.correct).length,
        points: Math.round(roundPoints * 100) / 100,
        maxPoints: roundMax,
        percent: percentOf(roundPoints, roundMax),
      };
    }),
    categories: [...categories.entries()].map(([name, items]) => {
      const categoryPoints = items.reduce(
        (total, entry) => total + entry.points,
        0,
      );
      const categoryMax = items.reduce(
        (total, entry) => total + entry.maxPoints,
        0,
      );
      return {
        name,
        questions: items.length,
        correct: items.filter((entry) => entry.correct).length,
        points: Math.round(categoryPoints * 100) / 100,
        maxPoints: categoryMax,
        percent: percentOf(categoryPoints, categoryMax),
      };
    }),
  };
}

export function filterQuestions(
  report: GradeReport,
  filter: ReportFilter,
): QuestionReport[] {
  switch (filter) {
    case ReportFilter.Wrong:
      return report.questions.filter(
        (entry) => entry.answered && !entry.correct,
      );
    case ReportFilter.Unanswered:
      return report.questions.filter((entry) => !entry.answered);
    case ReportFilter.All:
    default:
      return [...report.questions];
  }
}

/** The IDs to clear for "retry wrong only". Unanswered counts as wrong. */
export function retryIds(report: GradeReport): string[] {
  return report.questions
    .filter((entry) => !entry.correct)
    .map((entry) => entry.id);
}

export function formatDuration(durationMs: number | null): string {
  if (durationMs === null) {
    return "";
  }
  const total = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function bandLabel(band: GradeBand): string {
  switch (band) {
    case GradeBand.Excellent:
      return "Excellent";
    case GradeBand.Good:
      return "Good";
    case GradeBand.Fair:
      return "Fair";
    case GradeBand.Practice:
      return "Keep practising";
    case GradeBand.Empty:
    default:
      return "No points";
  }
}
