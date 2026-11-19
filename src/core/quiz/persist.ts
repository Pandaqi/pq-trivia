/** Saving an attempt, kept out of the controller's already long body. */

import type { QuizModel } from "../model/quiz";
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
