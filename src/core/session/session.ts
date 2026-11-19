/**
 * Session: a pure reducer with an injected clock. No DOM, no storage, no timers
 * of its own. Keyboard, toolbar and custom code all produce the same actions.
 */

import type { QuizPlan } from "../plan/plan";
import type { Diagnostic } from "../syntax/diagnostics";
import {
  defaultResponse,
  isEmptyResponse,
  toggleChoice,
  setResponse,
  type Response,
  type ResponseMap,
} from "./responses";
import type { QuestionModel } from "../model/question";

export enum SessionStatus {
  Idle = "idle",
  Loading = "loading",
  Ready = "ready",
  Playing = "playing",
  Finished = "finished",
  Error = "error",
}

export enum PlayMode {
  Questions = "questions",
  Answers = "answers",
}

export interface SessionState {
  readonly status: SessionStatus;
  readonly plan: QuizPlan | null;
  readonly mode: PlayMode;
  /** -1 start screen, 0..n-1 questions, n end screen. */
  readonly index: number;
  readonly responses: ResponseMap;
  readonly revealed: readonly string[];
  readonly hints: Readonly<Record<string, number>>;
  readonly language: string | null;
  readonly diagnostics: readonly Diagnostic[];
  readonly startedAt: number | null;
  readonly endedAt: number | null;
}

export type SessionAction =
  | { readonly type: "load/start" }
  | { readonly type: "load/success"; readonly plan: QuizPlan }
  | { readonly type: "plan/replace"; readonly plan: QuizPlan }
  | {
      readonly type: "load/failure";
      readonly diagnostics: readonly Diagnostic[];
    }
  | { readonly type: "nav/next" }
  | { readonly type: "nav/prev" }
  | { readonly type: "nav/goTo"; readonly index: number }
  | { readonly type: "nav/restart"; readonly keepResponses?: boolean }
  | { readonly type: "mode/set"; readonly mode: PlayMode }
  | {
      readonly type: "response/set";
      readonly questionId: string;
      readonly response: Response;
    }
  | {
      readonly type: "answer/toggle";
      readonly questionId: string;
      readonly answerId: string;
    }
  | { readonly type: "hint/reveal"; readonly questionId: string }
  | { readonly type: "reveal"; readonly questionId: string }
  | { readonly type: "language/set"; readonly language: string }
  | { readonly type: "finish" };

export interface SessionOptions {
  readonly language?: string | null;
  readonly diagnostics?: readonly Diagnostic[];
}

export function createSessionState(options: SessionOptions = {}): SessionState {
  return {
    status: SessionStatus.Idle,
    plan: null,
    mode: PlayMode.Questions,
    index: -1,
    responses: {},
    revealed: [],
    hints: {},
    language: options.language ?? null,
    diagnostics: options.diagnostics ?? [],
    startedAt: null,
    endedAt: null,
  };
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
  now: number = 0,
): SessionState {
  const total = state.plan?.questions.length ?? 0;

  switch (action.type) {
    case "load/start":
      return { ...state, status: SessionStatus.Loading };

    case "load/success": {
      const responses: Record<string, Response> = {};
      for (const question of action.plan.questions) {
        responses[question.id] = defaultResponse(question);
      }
      return {
        ...state,
        status: SessionStatus.Ready,
        plan: action.plan,
        index: -1,
        responses,
      };
    }

    // Reordering keeps answers; only the order changes underneath the reader.
    case "plan/replace": {
      const responses: Record<string, Response> = {};
      for (const question of action.plan.questions) {
        responses[question.id] =
          state.responses[question.id] ?? defaultResponse(question);
      }
      const index = Math.min(state.index, action.plan.questions.length);
      const status =
        index === action.plan.questions.length
          ? SessionStatus.Finished
          : index >= 0
            ? SessionStatus.Playing
            : SessionStatus.Ready;
      return { ...state, plan: action.plan, responses, index, status };
    }

    case "load/failure":
      return {
        ...state,
        status: SessionStatus.Error,
        diagnostics: action.diagnostics,
      };

    case "nav/next": {
      if (state.plan === null) {
        return state;
      }
      const next = Math.min(state.index + 1, total);
      const playing = next >= 0 ? SessionStatus.Playing : state.status;
      const finished = next === total ? SessionStatus.Finished : playing;
      return {
        ...state,
        index: next,
        status: finished,
        startedAt: state.startedAt ?? now,
        endedAt: next === total ? now : state.endedAt,
      };
    }

    case "nav/prev": {
      if (state.plan === null) {
        return state;
      }
      return { ...state, index: Math.max(state.index - 1, -1) };
    }

    case "nav/goTo": {
      if (state.plan === null) {
        return state;
      }
      return { ...state, index: Math.max(-1, Math.min(action.index, total)) };
    }

    case "nav/restart":
      return {
        ...state,
        index: -1,
        status: SessionStatus.Ready,
        responses: action.keepResponses === true ? state.responses : {},
        revealed: [],
        hints: {},
        startedAt: null,
        endedAt: null,
      };

    case "mode/set":
      return { ...state, mode: action.mode };

    case "response/set":
      return {
        ...state,
        responses: setResponse(
          state.responses,
          action.questionId,
          action.response,
        ),
      };

    case "answer/toggle": {
      const current = state.responses[action.questionId];
      if (current === undefined) {
        return state;
      }
      return {
        ...state,
        responses: setResponse(
          state.responses,
          action.questionId,
          toggleChoice(current, action.answerId),
        ),
      };
    }

    case "hint/reveal": {
      const used = state.hints[action.questionId] ?? 0;
      return {
        ...state,
        hints: { ...state.hints, [action.questionId]: used + 1 },
      };
    }

    case "reveal":
      return state.revealed.includes(action.questionId)
        ? state
        : { ...state, revealed: [...state.revealed, action.questionId] };

    case "language/set":
      return { ...state, language: action.language };

    case "finish":
      return {
        ...state,
        status: SessionStatus.Finished,
        index: total,
        endedAt: now,
      };

    default:
      return state;
  }
}

export function currentQuestion(state: SessionState): QuestionModel | null {
  if (
    state.plan === null ||
    state.index < 0 ||
    state.index >= state.plan.questions.length
  ) {
    return null;
  }
  return state.plan.questions[state.index] ?? null;
}

export interface Progress {
  readonly index: number;
  readonly total: number;
  readonly answered: number;
  readonly percent: number;
}

export function progressOf(state: SessionState): Progress {
  const total = state.plan?.questions.length ?? 0;
  let answered = 0;
  for (const question of state.plan?.questions ?? []) {
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
