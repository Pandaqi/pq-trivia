/**
 * Moving through a quiz: next, back, jump, restart, mode and answers.
 *
 * Every method is a reducer call plus an event. Kept out of `create.ts` so the
 * factory stays about wiring, and so one file owns "where am I".
 */

import { questionMaxScore } from "../model/question";
import type { Emitter } from "../session/events";
import {
  defaultResponse,
  type Confidence,
  type Response,
} from "../session/responses";
import {
  currentQuestion,
  PlayMode,
  sessionReducer,
  type SessionState,
} from "../session/session";
import { InteractivePolicy, nextCheck } from "../session/policies";
import type { NavResult, QuizApi, QuizConfig, QuizEventMap } from "./types";

export interface NavigationDeps {
  readonly state: () => SessionState;
  readonly config: () => QuizConfig;
  readonly apply: (state: SessionState) => void;
  readonly emitter: Emitter<QuizEventMap>;
  readonly autoReveal: () => void;
  readonly replan: () => void;
}

export type Navigation = Pick<
  QuizApi,
  | "next"
  | "prev"
  | "nextRound"
  | "prevRound"
  | "goTo"
  | "goToStart"
  | "goToEnd"
  | "restart"
  | "setMode"
  | "setInteractive"
  | "setResponse"
  | "setConfidence"
  | "setNoIdea"
  | "setWager"
  | "noteMediaPlay"
>;

export function createNavigation(deps: NavigationDeps): Navigation {
  const policy = () => deps.config().policy ?? InteractivePolicy.Required;

  const goToIndex = (index: number): NavResult => {
    const state = deps.state();
    if (state.plan === null) {
      return { ok: false, reason: "blocked" };
    }
    // -1 is the start screen, so it is a real destination.
    if (index < -1 || index > state.plan.questions.length) {
      return { ok: false, reason: "blocked" };
    }
    if (deps.config().restricted === true && index < state.index) {
      return { ok: false, reason: "blocked" };
    }
    deps.apply(sessionReducer(state, { type: "nav/goTo", index }, Date.now()));
    deps.autoReveal();
    return { ok: true };
  };

  return {
    next(): NavResult {
      const state = deps.state();
      if (state.plan === null) {
        return { ok: false, reason: "blocked" };
      }
      if (state.index >= state.plan.questions.length) {
        return { ok: false, reason: "end" };
      }
      const check = nextCheck(state, policy());
      if (check.issues.length > 0) {
        return { ok: false, reason: "invalid", issues: check.issues };
      }
      if (check.blocked) {
        return { ok: false, reason: "blocked" };
      }
      deps.apply(sessionReducer(state, { type: "nav/next" }, Date.now()));
      deps.autoReveal();
      return { ok: true };
    },

    prev(): NavResult {
      const state = deps.state();
      if (state.plan === null || state.index < 0) {
        return { ok: false, reason: "blocked" };
      }
      if (deps.config().restricted === true) {
        return { ok: false, reason: "blocked" };
      }
      deps.apply(sessionReducer(state, { type: "nav/prev" }, Date.now()));
      deps.autoReveal();
      return { ok: true };
    },

    goTo: goToIndex,

    goToStart(): NavResult {
      return goToIndex(-1);
    },

    goToEnd(): NavResult {
      return goToIndex(deps.state().plan?.questions.length ?? 0);
    },

    nextRound(): NavResult {
      const state = deps.state();
      if (state.plan === null) {
        return { ok: false, reason: "blocked" };
      }
      if (state.index >= state.plan.questions.length) {
        return { ok: false, reason: "end" };
      }
      const rounds = state.plan.rounds;
      const current = rounds.find(
        (round) =>
          state.index >= round.index && state.index < round.index + round.count,
      );
      if (current === undefined) {
        return goToIndex(rounds[0]?.index ?? 0);
      }
      const target = current.index + current.count;
      return target >= state.plan.questions.length
        ? goToIndex(state.plan.questions.length)
        : goToIndex(target);
    },

    prevRound(): NavResult {
      const state = deps.state();
      if (state.plan === null) {
        return { ok: false, reason: "blocked" };
      }
      const rounds = state.plan.rounds;
      if (rounds.length === 0) {
        return goToIndex(-1);
      }
      const currentIndex = rounds.findIndex(
        (round) =>
          state.index >= round.index && state.index < round.index + round.count,
      );
      if (currentIndex < 0) {
        return goToIndex(
          state.index >= state.plan.questions.length
            ? (rounds[rounds.length - 1]?.index ?? -1)
            : -1,
        );
      }
      const current = rounds[currentIndex];
      if (current !== undefined && state.index > current.index) {
        return goToIndex(current.index);
      }
      return goToIndex(rounds[currentIndex - 1]?.index ?? -1);
    },

    restart(restartOptions: { readonly keepResponses?: boolean } = {}): void {
      deps.apply(
        sessionReducer(
          deps.state(),
          {
            type: "nav/restart",
            ...(restartOptions.keepResponses === true
              ? { keepResponses: true }
              : {}),
          },
          Date.now(),
        ),
      );
    },

    setMode(mode: PlayMode): boolean {
      if (deps.config().restricted === true && mode === PlayMode.Answers) {
        return false;
      }
      deps.apply(
        sessionReducer(deps.state(), { type: "mode/set", mode }, Date.now()),
      );
      deps.emitter.emit("mode:change", { mode });
      return true;
    },

    setInteractive(interactive: boolean): void {
      deps.apply(
        sessionReducer(
          deps.state(),
          { type: "interactive/set", interactive },
          Date.now(),
        ),
      );
    },

    setResponse(questionId: string, response: Response): void {
      deps.apply(
        sessionReducer(
          deps.state(),
          { type: "response/set", questionId, response },
          Date.now(),
        ),
      );
      deps.emitter.emit("response:change", { id: questionId, response });
      deps.replan();
      deps.autoReveal();
    },

    setConfidence(questionId: string, level: Confidence | null): void {
      deps.apply(
        sessionReducer(
          deps.state(),
          { type: "confidence/set", questionId, level },
          Date.now(),
        ),
      );
    },

    setNoIdea(questionId: string, value: boolean): void {
      const question = deps
        .state()
        .plan?.questions.find((entry) => entry.id === questionId);
      // A deliberate blank is blank. Keeping the old text would grade it.
      if (value && question !== undefined) {
        deps.apply(
          sessionReducer(
            deps.state(),
            {
              type: "response/set",
              questionId,
              response: defaultResponse(question),
            },
            Date.now(),
          ),
        );
      }
      deps.apply(
        sessionReducer(
          deps.state(),
          { type: "noidea/set", questionId, value },
          Date.now(),
        ),
      );
    },

    setWager(questionId: string, value: number): void {
      const question = deps
        .state()
        .plan?.questions.find((entry) => entry.id === questionId);
      // Only a question with `Wager => true` takes a stake. Anything else
      // records nothing, so the report cannot show a bet that never happened.
      const max =
        question === undefined || !question.wager
          ? 0
          : questionMaxScore(question);
      deps.apply(
        sessionReducer(
          deps.state(),
          { type: "wager/set", questionId, value: Math.min(value, max) },
          Date.now(),
        ),
      );
    },

    noteMediaPlay(questionId?: string): void {
      const id = questionId ?? currentQuestion(deps.state())?.id;
      if (id === undefined) {
        return;
      }
      deps.apply(
        sessionReducer(deps.state(), { type: "media/play", questionId: id }, 0),
      );
    },
  };
}
