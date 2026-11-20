/** Results and saving: everything that reads the state after a change. */

import {
  gradeAttempt,
  type GradeReport,
  type ReportOptions,
} from "../grading/report";
import { DEFAULT_NEGATIVE_MARK, ScoringPreset } from "../grading/points";
import { fiftyFifty, Lifeline } from "../grading/aids";
import { leaderboard, teamStandings, type Standing } from "../grading/teams";
import type { QuestionTypeRegistry } from "../grading/plugins";
import { currentQuestion } from "../session/session";
import type { QuizModel } from "../model/quiz";
import type { QuizPlan } from "../plan/plan";
import { saveAttempt, type AttemptJournal } from "../session/attempts";
import { SessionStatus, type SessionState } from "../session/session";
import type { QuizConfig } from "./types";

export function persistState(
  journal: AttemptJournal | null,
  quiz: QuizModel | null,
  state: SessionState,
  config: QuizConfig,
): void {
  if (journal === null || quiz === null) {
    return;
  }
  saveAttempt(journal, quiz.meta.title, state, {
    seed: state.plan?.seed ?? "",
    shuffleQuestions: config.shuffleQuestions === true,
    shuffleRounds: config.shuffleRounds === true,
    mode: state.mode,
    restricted: config.restricted === true,
  });
  if (state.status === SessionStatus.Finished || state.showingResults) {
    journal.flush();
  }
}

/** Milliseconds since the first question. Null before the quiz starts. */
export function elapsedOf(
  state: SessionState,
  now: number = Date.now(),
): number | null {
  return state.startedAt === null ? null : Math.max(0, now - state.startedAt);
}

/** Milliseconds left on the whole-quiz limit. Null means count up. */
export function quizRemainingOf(
  state: SessionState,
  limit: number | undefined,
  now: number = Date.now(),
): number | null {
  if (limit === undefined || limit <= 0 || state.startedAt === null) {
    return null;
  }
  return Math.max(0, limit - (now - state.startedAt));
}

/** Milliseconds left in this round. Null when the round has no timer. */
export function roundRemainingOf(
  plan: QuizPlan | null,
  state: SessionState,
  now: number = Date.now(),
): number | null {
  if (plan === null || state.roundStartedAt === null) {
    return null;
  }
  const round = plan.rounds.find(
    (entry) =>
      state.index >= entry.index && state.index < entry.index + entry.count,
  );
  const total = round?.roundTimerMs ?? null;
  if (total === null || total <= 0) {
    return null;
  }
  return Math.max(0, total - (now - state.roundStartedAt));
}

/** Host-only notes for one question, or for the one on screen. */
export function presenterNotesOf(
  plan: QuizPlan | null,
  state: SessionState,
  questionId?: string,
): readonly string[] {
  const id = questionId ?? currentQuestion(state)?.id;
  const question =
    plan === null || id === undefined
      ? undefined
      : plan.questions.find((entry) => entry.id === id);
  return question === undefined ? [] : question.notes.map((note) => note.text);
}

/** Options a 50/50 took away, for the current question or a named one. */
export function eliminatedOf(
  state: SessionState,
  plan: QuizPlan | null,
  questionId?: string,
): readonly string[] {
  const id = questionId ?? currentQuestion(state)?.id;
  if (id === undefined || plan === null) {
    return [];
  }
  if (!(state.lifelines[id] ?? []).includes(Lifeline.FiftyFifty)) {
    return [];
  }
  const question = plan.questions.find((entry) => entry.id === id);
  return question === undefined ? [] : fiftyFifty(question, plan.seed);
}

/** Every team's score, highest first. Empty in solo play. */
export function standingsOf(
  plan: QuizPlan | null,
  state: SessionState,
  options: ReportOptions = {},
): readonly Standing[] {
  if (plan === null || state.teams.length === 0) {
    return [];
  }
  // The active team's typing is not stashed until the page moves on.
  const teams = state.teams.map((team, at) =>
    at === state.team
      ? { ...team, responses: state.responses, lifelines: state.lifelines }
      : team,
  );
  return leaderboard(teamStandings(plan, teams, options));
}

/** The rules an attempt is graded under. One place, two callers. */
export function reportOptionsFrom(
  state: SessionState,
  config: QuizConfig,
  plugins?: QuestionTypeRegistry,
): ReportOptions {
  const grading = config.grading;
  return {
    startedAt: state.startedAt,
    endedAt: state.endedAt,
    noIdea: state.noIdea,
    confidence: state.confidence,
    wagers: state.wagers,
    lifelines: state.lifelines,
    preset: config.scoringPreset ?? ScoringPreset.Standard,
    negativeMarking: config.negativeMarking ?? DEFAULT_NEGATIVE_MARK,
    streaks: config.streaks === true,
    restricted: config.restricted === true,
    ...(grading === undefined ? {} : { grading }),
    ...(plugins === undefined ? {} : { plugins }),
  };
}

/** The report the results screen, the CSV and the CLI all read. */
export function reportFor(
  plan: QuizPlan | null,
  state: SessionState,
  title: string,
  config: QuizConfig = {},
  plugins?: QuestionTypeRegistry,
): GradeReport | null {
  if (plan === null) {
    return null;
  }
  return gradeAttempt(plan, state.responses, {
    ...reportOptionsFrom(state, config, plugins),
    title,
  });
}
