/** Results and saving: everything that reads the state after a change. */

import { gradeAttempt, type GradeReport } from "../grading/report";
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

/** The report the results screen, the CSV and the CLI all read. */
export function reportFor(
  plan: QuizPlan | null,
  state: SessionState,
  title: string,
  grading: QuizConfig["grading"],
): GradeReport | null {
  if (plan === null) {
    return null;
  }
  return gradeAttempt(plan, state.responses, {
    title,
    startedAt: state.startedAt,
    endedAt: state.endedAt,
    noIdea: state.noIdea,
    confidence: state.confidence,
    wagers: state.wagers,
    ...(grading === undefined ? {} : { grading }),
  });
}
