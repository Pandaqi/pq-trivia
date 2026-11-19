/**
 * Which screen to show. A pure read of the session state, so the player, the
 * print sheet and the tests all agree on where they are.
 */

import type { QuizMeta, QuizModel } from "../model/quiz";
import { SessionStatus, type SessionState } from "./session";
import { progressOf } from "./session";
import { isEmptyResponse } from "./responses";
import type { AttemptRecord } from "./attempts";
import {
  endScreen,
  questionScreen,
  resultsScreen,
  startScreen,
  ScreenKind,
  type ResumeViewModel,
  type ScreenViewModel,
} from "./viewModel";

function resumeOf(
  saved: AttemptRecord | null,
  total: number,
): ResumeViewModel | null {
  if (saved === null || saved.status === "finished") {
    return null;
  }
  const answered = Object.values(saved.responses).filter(
    (response) => !isEmptyResponse(response),
  ).length;
  return { savedAt: saved.savedAt, answered, total };
}

export function screenFor(
  quiz: QuizModel | null,
  state: SessionState,
  saved: AttemptRecord | null,
): ScreenViewModel | null {
  if (
    quiz === null ||
    (state.status === SessionStatus.Error && state.plan === null)
  ) {
    return null;
  }
  if (state.showingResults && state.report !== null) {
    return resultsScreen(quiz.meta, state.report);
  }
  const progress = progressOf(state);
  if (state.plan === null || state.index < 0) {
    return startScreen(
      quiz.meta,
      state.plan,
      state.language,
      resumeOf(saved, state.plan?.total ?? 0),
      quiz.start,
    );
  }
  if (state.index >= state.plan.questions.length) {
    return endScreen(quiz.meta, progress, quiz.end);
  }
  const question = state.plan.questions[state.index];
  if (question === undefined) {
    return null;
  }
  const rounds = state.plan.rounds;
  const roundIndex = rounds.findIndex((round) => round.id === question.round);
  const round = roundIndex < 0 ? null : (rounds[roundIndex] ?? null);
  const previous =
    state.index > 0 ? state.plan.questions[state.index - 1] : null;
  return questionScreen(question, state, {
    index: state.index,
    total: state.plan.questions.length,
    progress,
    roundName: round?.name ?? null,
    roundSecret: round?.secret ?? null,
    roundNumber: roundIndex < 0 ? null : roundIndex + 1,
    isRoundStart: round !== null && previous?.round !== question.round,
  });
}

export function titleOf(meta: QuizMeta): string {
  return meta.title.length > 0 ? meta.title : "Untitled quiz";
}

export { ScreenKind };
