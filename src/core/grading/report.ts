/**
 * The grade report: what the results screen, the CLI and the CSV export read.
 *
 * Plain data, no model objects. A report survives a `JSON.stringify` and comes
 * back the same, which is what an attempt history needs.
 */

import { inlineToPlainText, parseInline } from "../format/inline";
import type { QuestionModel } from "../model/question";
import { QuestionType } from "../model/question";
import type { QuizPlan } from "../plan/plan";
import {
  defaultResponse,
  type Confidence,
  type ResponseMap,
} from "../session/responses";
import {
  GradeKind,
  gradeQuestion,
  type GradeOptions,
  type GradePart,
} from "./grading";
import { round2 } from "./parts";
import { settleWager } from "./wager";
import { allowedLifelines, lifelineCost, type Lifeline } from "./aids";
import {
  applyPointRules,
  DEFAULT_NEGATIVE_MARK,
  ScoringPreset,
  type PointRules,
} from "./points";

export enum GradeBand {
  Excellent = "excellent",
  Good = "good",
  Fair = "fair",
  Practice = "practice",
  Empty = "empty",
}

/** How much of the question's score a wager put on the line. */
export enum WagerRisk {
  Low = "low",
  Medium = "medium",
  High = "high",
}

/** A wager at or above this share of the question is a high risk. */
const WAGER_HIGH_SHARE = 0.75;
/** Between medium and high. Below it, the stake is small. */
const WAGER_MEDIUM_SHARE = 0.4;

/** A wager at or above this share of the question is a high risk. */
export function wagerRiskOf(wager: number, maxPoints: number): WagerRisk {
  if (maxPoints <= 0 || wager <= 0) {
    return WagerRisk.Low;
  }
  const share = wager / maxPoints;
  if (share >= WAGER_HIGH_SHARE) {
    return WagerRisk.High;
  }
  if (share >= WAGER_MEDIUM_SHARE) {
    return WagerRisk.Medium;
  }
  return WagerRisk.Low;
}

export interface QuestionReport {
  readonly id: string;
  /** Position among the questions that count. A section screen is skipped. */
  readonly index: number;
  /** Position in the plan, for jumping back to the question. */
  readonly planIndex: number;
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
  /** A deliberate blank. Not wrong, just unanswered on purpose. */
  readonly noIdea: boolean;
  readonly confidence: Confidence | null;
  readonly wager: number | null;
  readonly wagerRisk: WagerRisk | null;
  /** Correct answers in a row up to and including this one. */
  readonly run: number;
  /** The streak bonus this question earned. 1 when there was none. */
  readonly multiplier: number;
  /** Lifelines used here, by name. Empty when none were. */
  readonly lifelines: readonly Lifeline[];
  /** What those lifelines took off. Zero when none were used. */
  readonly lifelineCost: number;
}

export interface RoundReport {
  readonly id: string;
  readonly name: string;
  readonly questions: number;
  readonly correct: number;
  readonly points: number;
  readonly maxPoints: number;
  readonly percent: number;
  /** Questions this round drew through `Pool`. Empty when it drew none. */
  readonly drawn: readonly string[];
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
  /** How many of those unanswered were a deliberate blank. */
  readonly noIdea: number;
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
  /** Longest run of correct answers in this attempt. */
  readonly bestStreak: number;
  /** Lifeline uses across the attempt, and what they cost. */
  readonly lifelinesUsed: number;
  readonly lifelineCost: number;
}

export interface ReportOptions extends GradeOptions {
  readonly title?: string;
  readonly startedAt?: number | null;
  readonly endedAt?: number | null;
  readonly noIdea?: readonly string[];
  readonly confidence?: Readonly<Record<string, Confidence>>;
  readonly wagers?: Readonly<Record<string, number>>;
  /** Negative marking, all-or-nothing, partial, or nothing special. */
  readonly preset?: ScoringPreset;
  /** The slice of a question a wrong answer costs, with the negative preset. */
  readonly negativeMarking?: number;
  /** Three in a row, and it starts paying. Off unless the host says so. */
  readonly streaks?: boolean;
  /** Lifelines used per question ID. */
  readonly lifelines?: Readonly<Record<string, readonly string[]>>;
  /** Restricted mode allows none. */
  readonly restricted?: boolean;
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

/** Where each band starts, as a percentage of the maximum. */
const EXCELLENT_FROM = 90;
const GOOD_FROM = 70;
const FAIR_FROM = 50;

export function bandOf(percent: number, maxPoints: number): GradeBand {
  if (maxPoints <= 0) {
    return GradeBand.Empty;
  }
  if (percent >= EXCELLENT_FROM) {
    return GradeBand.Excellent;
  }
  if (percent >= GOOD_FROM) {
    return GradeBand.Good;
  }
  if (percent >= FAIR_FROM) {
    return GradeBand.Fair;
  }
  return GradeBand.Practice;
}

function titleOf(question: QuestionModel): string {
  const first = question.text[0]?.text ?? question.id;
  return inlineToPlainText(parseInline(first).nodes).trim() || question.id;
}

/**
 * What the player holds before the question at `planIndex`.
 *
 * The wager picker needs it: you can only stake what you already earned. It
 * walks the same rule as the report, so the two cannot disagree.
 */
export function bankAt(
  plan: QuizPlan,
  responses: ResponseMap,
  planIndex: number,
  options: ReportOptions = {},
): number {
  let bank = 0;
  for (const question of plan.questions.slice(0, Math.max(planIndex, 0))) {
    if (question.type === QuestionType.Section) {
      continue;
    }
    const response = responses[question.id] ?? defaultResponse(question);
    const result = gradeQuestion(question, response, options);
    const settled = settleWager({
      offered: options.wagers?.[question.id],
      allowed: question.wager,
      answered: result.answered,
      points: result.points,
      maxPoints: result.maxPoints,
      bank,
      correct: result.correct,
    });
    bank = round2(bank + settled.points);
  }
  return bank;
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
  let number = 0;
  /** Points earned so far. The floor for a lost stake. */
  let bank = 0;
  let run = 0;
  let bestStreak = 0;
  let lifelinesUsed = 0;
  let lifelineSpent = 0;
  let possible = 0;
  const rules: PointRules = {
    preset: options.preset ?? ScoringPreset.Standard,
    negativeMarking: options.negativeMarking ?? DEFAULT_NEGATIVE_MARK,
    streaks: options.streaks === true,
  };

  plan.questions.forEach((question, planIndex) => {
    // A section screen has no answer. It must not appear as a skipped question.
    if (question.type === QuestionType.Section) {
      return;
    }
    const response = responses[question.id] ?? defaultResponse(question);
    const result = gradeQuestion(question, response, options);
    const roundId = question.round ?? "";
    const roundName =
      plan.rounds.find((round) => round.id === question.round)?.name ?? null;
    // One rule for the whole app: right pays the stake, wrong or skipped does
    // not, and a score never goes below zero.
    const settled = settleWager({
      offered: options.wagers?.[question.id],
      allowed: question.wager,
      answered: result.answered,
      points: result.points,
      maxPoints: result.maxPoints,
      bank,
      correct: result.correct,
    });
    bank = round2(bank + settled.points);
    const used = allowedLifelines(
      options.lifelines?.[question.id] ?? [],
      options.restricted === true,
    );
    const spent = lifelineCost(used);
    const pointed = applyPointRules(
      {
        points: settled.points,
        maxPoints: settled.maxPoints,
        correct: result.correct,
        answered: result.answered,
        parts: result.parts,
      },
      rules,
      run,
    );
    run = pointed.run;
    bestStreak = Math.max(bestStreak, run);
    lifelinesUsed += used.length;
    lifelineSpent += spent;
    possible = round2(possible + pointed.maxPoints);
    const wager = settled.stake > 0 ? settled.stake : null;
    // A lifeline may eat this question. It may not push the question below
    // zero, and it never turns a penalty into a bigger one.
    const paid =
      pointed.points <= 0
        ? pointed.points
        : Math.max(0, round2(pointed.points - spent));
    const report: QuestionReport = {
      id: question.id,
      index: number,
      planIndex,
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
      points: paid,
      maxPoints: pointed.maxPoints,
      parts: result.parts,
      noIdea: options.noIdea?.includes(question.id) === true,
      confidence: options.confidence?.[question.id] ?? null,
      wager,
      wagerRisk: wager === null ? null : wagerRiskOf(wager, result.maxPoints),
      run: pointed.run,
      multiplier: pointed.multiplier,
      lifelines: used,
      lifelineCost: spent,
    };
    questions.push(report);
    number += 1;

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

  // A stake and a streak raise what this attempt could have earned, so a
  // perfect run still tops out at 100 percent. A score never goes below zero.
  const sum = questions.reduce((total, entry) => total + entry.points, 0);
  const points = Math.max(0, round2(sum));
  const maxPoints = possible;
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
    noIdea: questions.filter((entry) => entry.noIdea).length,
    points,
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
    bestStreak,
    lifelinesUsed,
    lifelineCost: lifelineSpent,
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
        drawn:
          plan.rounds.find((round) => round.id === bucket.items[0]?.round)
            ?.drawn ?? [],
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
