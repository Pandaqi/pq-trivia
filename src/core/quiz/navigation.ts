/**
 * Moving through a quiz: next, back, jump, restart, mode and answers.
 *
 * Every method is a reducer call plus an event. Kept out of `create.ts` so the
 * factory stays about wiring, and so one file owns "where am I".
 */

import type { Emitter } from "../session/events";
import type { Response } from "../session/responses";
import {
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
>;

export function createNavigation(deps: NavigationDeps): Navigation {
  const policy = () => deps.config().policy ?? InteractivePolicy.Required;

  const goToIndex = (index: number): NavResult => {
    const state = deps.state();
    if (state.plan === null) {
      return { ok: false, reason: "blocked" };
    }
    if (index < 0 || index > state.plan.questions.length) {
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
  };
}
