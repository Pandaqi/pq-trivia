/** `HiddenAtExport` means exactly that: not in any export, still in play. */

import type { QuizModel } from "../model/quiz";
import { createRound } from "../model/round";
import type { QuizPlan } from "../plan/plan";
import { questionMaxScore } from "../model/question";

export function visibleModel(model: QuizModel): QuizModel {
  const ids = new Set(
    model.questions
      .filter((question) => !question.hiddenAtExport)
      .map((question) => question.id),
  );
  return {
    ...model,
    rounds: model.rounds
      .map((round) =>
        createRound(
          round.id,
          round.name,
          round.secret,
          round.questions.filter((question) => ids.has(question.id)),
        ),
      )
      .filter((round) => round.questions.length > 0),
    questions: model.questions.filter((question) => ids.has(question.id)),
    start:
      model.start === null || model.start.hiddenAtExport ? null : model.start,
    end: model.end === null || model.end.hiddenAtExport ? null : model.end,
  };
}

export function visiblePlan(plan: QuizPlan): QuizPlan {
  const questions = plan.questions.filter(
    (question) => !question.hiddenAtExport,
  );
  const rounds = plan.rounds
    .map((round) => ({
      ...round,
      count: questions.filter((question) => question.round === round.id).length,
    }))
    .filter((round) => round.count > 0);
  let offset = 0;
  const placed = rounds.map((round) => {
    const next = { ...round, index: offset };
    offset += round.count;
    return next;
  });
  return {
    ...plan,
    questions,
    rounds: placed,
    maxScore: questions.reduce(
      (total, question) => total + questionMaxScore(question),
      0,
    ),
    total: questions.length,
  };
}
