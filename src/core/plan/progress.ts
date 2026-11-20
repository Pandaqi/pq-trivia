/**
 * How far in the player is. Counted from the state, never stored, so a restore
 * and a live play-through always agree.
 */

import { QuestionType } from "../model/question";
import { isEmptyResponse } from "../session/responses";
import type { SessionState } from "../session/session";

export interface Progress {
  readonly index: number;
  readonly total: number;
  readonly answered: number;
  readonly percent: number;
}

export const EMPTY_PROGRESS: Progress = {
  index: 0,
  total: 0,
  answered: 0,
  percent: 0,
};

/** A section screen opens a round. It is not a question, so it never counts. */
export function countsAsQuestion(question: {
  readonly type: QuestionType;
}): boolean {
  return question.type !== QuestionType.Section;
}

export function progressOf(state: SessionState): Progress {
  const questions = (state.plan?.questions ?? []).filter(countsAsQuestion);
  const total = questions.length;
  let answered = 0;
  for (const question of questions) {
    const response = state.responses[question.id];
    if (response !== undefined && !isEmptyResponse(response)) {
      answered += 1;
    }
  }
  return {
    index: Math.max(state.index, 0),
    total,
    answered,
    percent: total === 0 ? 0 : Math.round((answered / total) * 100),
  };
}

export function isLastQuestion(state: SessionState): boolean {
  return state.plan !== null && state.index === state.plan.questions.length - 1;
}
