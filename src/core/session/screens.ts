/**
 * Which screen to show. A pure read of the session state, so the player, the
 * print sheet and the tests all agree on where they are.
 */

import type { QuizMeta, QuizModel } from "../model/quiz";
import { questionMaxScore } from "../model/question";
import { SessionStatus, countsAsQuestion, type SessionState } from "./session";
import { progressOf } from "./session";
import { isEmptyResponse } from "./responses";
import type { StepDefaults } from "../model/steps";
import type { AttemptRecord } from "./attempts";
import type { MediaOptions } from "../values/media";
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
  media: MediaOptions = {},
  numbers = true,
  steps: StepDefaults = {},
  showSources = false,
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
      media,
    );
  }
  if (state.index >= state.plan.questions.length) {
    return endScreen(quiz.meta, progress, quiz.end, media);
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
  const playable = state.plan.questions.filter(countsAsQuestion);
  const number = countsAsQuestion(question)
    ? state.plan.questions.slice(0, state.index + 1).filter(countsAsQuestion)
        .length
    : 0;
  // The round's own numbers: what the section page shows and what picks the
  // colour shade for each question in it.
  const roundQuestions = countsAsQuestion(question)
    ? state.plan.questions.filter(
        (item) => item.round === question.round && countsAsQuestion(item),
      )
    : [];
  const roundPosition = roundQuestions.findIndex(
    (item) => item.id === question.id,
  );
  return questionScreen(
    question,
    state,
    {
      index: state.index,
      total: playable.length,
      number,
      numbers,
      progress,
      roundName: round?.name ?? null,
      roundSecret: round?.secret ?? null,
      roundNumber: roundIndex < 0 ? null : roundIndex + 1,
      roundPosition: roundPosition < 0 ? 0 : roundPosition + 1,
      roundQuestionCount: round?.questionCount ?? roundQuestions.length,
      roundPoints:
        round?.points ??
        roundQuestions.reduce((sum, item) => sum + questionMaxScore(item), 0),
      seed: state.plan.seed,
      isRoundStart: round !== null && previous?.round !== question.round,
      showSources,
      ...(steps.defaultSteps === undefined
        ? {}
        : { defaultSteps: steps.defaultSteps }),
      ...(steps.defaultStepTransition === undefined ||
      steps.defaultStepTransition === null
        ? {}
        : { defaultStepTransition: steps.defaultStepTransition }),
      authorsDiverse:
        new Set(state.plan.questions.flatMap((item) => item.authors)).size > 1,
      categoriesDiverse:
        new Set(state.plan.questions.flatMap((item) => item.categories)).size >
        1,
    },
    media,
  );
}

export function titleOf(meta: QuizMeta): string {
  return meta.title;
}

export { ScreenKind };
