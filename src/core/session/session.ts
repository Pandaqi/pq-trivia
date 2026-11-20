/**
 * Session: a pure reducer with an injected clock. No DOM, no storage, no timers
 * of its own. Keyboard, toolbar and custom code all produce the same actions.
 */

import type { QuizPlan } from "../plan/plan";
import type { Diagnostic } from "../syntax/diagnostics";
import type { GradeReport } from "../grading/report";
import {
  defaultResponse,
  isEmptyResponse,
  toggleChoice,
  setResponse,
  type Confidence,
  type Response,
  type ResponseMap,
} from "./responses";
import type { QuestionModel } from "../model/question";
import { reducePlay, type UndoStep } from "../grading/aids";
import type { SessionAction } from "./events";
export type { SessionAction } from "./events";
import { timerFor, type TimerState } from "./timers";

/** A team: a name and its own answers. Solo play has none of these. */
export interface TeamState {
  readonly name: string;
  readonly responses: ResponseMap;
  /** Each team spends its own lifelines. One phone per team means one 50/50. */
  readonly lifelines: Readonly<Record<string, readonly string[]>>;
}

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

/** Where an index sits: before the quiz, inside it, or past its last question. */
function statusAt(index: number, total: number): SessionStatus {
  if (index < 0) {
    return SessionStatus.Ready;
  }
  if (index >= total) {
    return SessionStatus.Finished;
  }
  return SessionStatus.Playing;
}

/** A no-idea mark goes on once. Setting it twice keeps the same list. */
function addOnce(list: readonly string[], id: string): readonly string[] {
  if (list.includes(id)) {
    return list;
  }
  return [...list, id];
}

export interface SessionState {
  readonly status: SessionStatus;
  readonly plan: QuizPlan | null;
  readonly mode: PlayMode;
  /** Interactive play asks for answers in the page. Off means read-aloud. */
  readonly interactive: boolean;
  /** -1 start screen, 0..n-1 questions, n end screen. */
  readonly index: number;
  /** Which staged part of the current question is on screen. */
  readonly step: number;
  readonly responses: ResponseMap;
  /** Low, medium or high, per question. Stored, never scored. */
  readonly confidence: Readonly<Record<string, Confidence>>;
  /** Points put on the line, for `Wager => true`. */
  readonly wagers: Readonly<Record<string, number>>;
  /** Deliberate blanks. Out of the wrong count, visible in the report. */
  readonly noIdea: readonly string[];
  /** Plays per clip, so `PlayLimit` is counted in the attempt. */
  readonly mediaPlays: Readonly<Record<string, number>>;
  readonly revealed: readonly string[];
  readonly hints: Readonly<Record<string, number>>;
  readonly language: string | null;
  readonly diagnostics: readonly Diagnostic[];
  readonly startedAt: number | null;
  readonly endedAt: number | null;
  /** Running question timer. Null when the question has none. */
  readonly timer: TimerState | null;
  /** Questions whose timer ran out. */
  readonly expired: readonly string[];
  /** The report, once grades have been calculated. */
  readonly report: GradeReport | null;
  /** Results are a screen of their own, not a mode on the end screen. */
  readonly showingResults: boolean;
  /** Team play. Empty in solo mode, which is the default. */
  readonly teams: readonly TeamState[];
  /** The team answering now. -1 is solo. */
  readonly team: number;
  /** Lifelines used per question ID, by name. */
  readonly lifelines: Readonly<Record<string, readonly string[]>>;
  /** One step back. The answer this question had before it was filled in. */
  readonly undo: UndoStep | null;
  /** When the current round started. The round timer counts from here. */
  readonly roundStartedAt: number | null;
}

export interface SessionOptions {
  readonly language?: string | null;
  readonly diagnostics?: readonly Diagnostic[];
}

export function createSessionState(options: SessionOptions = {}): SessionState {
  return {
    status: SessionStatus.Idle,
    plan: null,
    mode: PlayMode.Questions,
    interactive: false,
    index: -1,
    step: 0,
    responses: {},
    confidence: {},
    wagers: {},
    noIdea: [],
    mediaPlays: {},
    revealed: [],
    hints: {},
    language: options.language ?? null,
    diagnostics: options.diagnostics ?? [],
    startedAt: null,
    endedAt: null,
    timer: null,
    expired: [],
    report: null,
    showingResults: false,
    teams: [],
    team: -1,
    lifelines: {},
    undo: null,
    roundStartedAt: null,
  };
}

/** The round this question belongs to, or null for a screen with no round. */
function roundOf(state: SessionState, index: number): string | null {
  return state.plan?.questions[index]?.round ?? null;
}

/** A new question means a fresh timer, or none at all. */
export function withTimer(state: SessionState, now: number): SessionState {
  const question = currentQuestion(state);
  const round = roundOf(state, state.index);
  // A new round starts its clock. Stepping back inside one does not.
  const entered = round !== null && round !== roundOf(state, state.index - 1);
  return {
    ...state,
    timer: question === null ? null : timerFor(question, now),
    roundStartedAt: entered ? now : state.roundStartedAt,
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
        step: 0,
        responses,
        confidence: {},
        wagers: {},
        noIdea: [],
        mediaPlays: {},
        timer: null,
        expired: [],
        report: null,
        showingResults: false,
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
      const status = statusAt(index, action.plan.questions.length);
      const next = { ...state, plan: action.plan, responses, index, status };
      return withTimer(next, now);
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
      return withTimer(
        {
          ...state,
          index: next,
          step: 0,
          status: finished,
          startedAt: state.startedAt ?? now,
          endedAt: next === total ? now : state.endedAt,
          showingResults: false,
        },
        now,
      );
    }

    case "nav/prev": {
      if (state.plan === null) {
        return state;
      }
      return withTimer(
        { ...state, index: Math.max(state.index - 1, -1), step: 0 },
        now,
      );
    }

    case "nav/goTo": {
      if (state.plan === null) {
        return state;
      }
      return withTimer(
        {
          ...state,
          index: Math.max(-1, Math.min(action.index, total)),
          step: 0,
        },
        now,
      );
    }

    case "step/next":
      return { ...state, step: state.step + 1 };

    case "nav/restart":
      return {
        ...state,
        index: -1,
        step: 0,
        status: SessionStatus.Ready,
        responses: action.keepResponses === true ? state.responses : {},
        confidence: action.keepResponses === true ? state.confidence : {},
        wagers: action.keepResponses === true ? state.wagers : {},
        noIdea: action.keepResponses === true ? state.noIdea : [],
        mediaPlays: action.keepResponses === true ? state.mediaPlays : {},
        revealed: [],
        hints: {},
        startedAt: null,
        endedAt: null,
        timer: null,
        expired: [],
        report: null,
        showingResults: false,
        lifelines: {},
        undo: null,
        roundStartedAt: null,
      };

    case "mode/set":
      return { ...state, mode: action.mode };

    case "interactive/set":
      return { ...state, interactive: action.interactive };

    case "response/set": {
      const question = state.plan?.questions.find(
        (entry) => entry.id === action.questionId,
      );
      const previous =
        state.responses[action.questionId] ??
        (question === undefined ? undefined : defaultResponse(question));
      // One step back, and only the useful one: the empty answer a question
      // started with. Undoing every keystroke is not an undo button.
      const undo =
        previous !== undefined &&
        isEmptyResponse(previous) &&
        !isEmptyResponse(action.response)
          ? { questionId: action.questionId, response: previous }
          : state.undo;
      return {
        ...state,
        undo,
        responses: setResponse(
          state.responses,
          action.questionId,
          action.response,
        ),
      };
    }

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

    case "confidence/set": {
      const confidence = { ...state.confidence };
      if (action.level === null) {
        delete confidence[action.questionId];
      } else {
        confidence[action.questionId] = action.level;
      }
      return { ...state, confidence };
    }

    case "wager/set":
      return {
        ...state,
        wagers: {
          ...state.wagers,
          [action.questionId]: Math.max(0, action.value),
        },
      };

    case "noidea/set":
      return {
        ...state,
        noIdea: action.value
          ? addOnce(state.noIdea, action.questionId)
          : state.noIdea.filter((id) => id !== action.questionId),
      };

    case "media/play":
      return {
        ...state,
        mediaPlays: {
          ...state.mediaPlays,
          [action.questionId]: (state.mediaPlays[action.questionId] ?? 0) + 1,
        },
      };

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

    // Hiding again. V2's `a` toggles both ways and a host notices when it does
    // not.
    case "hide":
      return state.revealed.includes(action.questionId)
        ? {
            ...state,
            revealed: state.revealed.filter((id) => id !== action.questionId),
          }
        : state;

    case "language/set":
      return { ...state, language: action.language };

    // Extra time buys the clock, not the answer. Elapsed time is untouched.
    case "timer/extend": {
      const timer = state.timer;
      return timer === null
        ? state
        : { ...state, timer: { ...timer, totalMs: timer.totalMs + action.ms } };
    }

    case "timer/expire":
      return {
        ...state,
        timer: null,
        expired: state.expired.includes(action.questionId)
          ? state.expired
          : [...state.expired, action.questionId],
      };

    case "results/show":
      return { ...state, report: action.report, showingResults: true };

    case "results/hide":
      return { ...state, showingResults: false };

    case "attempt/restore": {
      const index = Math.max(-1, Math.min(action.index, total));
      const restored: SessionState = {
        ...state,
        responses: { ...state.responses, ...action.responses },
        confidence: action.confidence ?? state.confidence,
        wagers: action.wagers ?? state.wagers,
        noIdea: action.noIdea ?? state.noIdea,
        mediaPlays: action.mediaPlays ?? state.mediaPlays,
        index,
        step: 0,
        status: statusAt(index, total),
        startedAt: action.startedAt,
        endedAt: action.endedAt,
        // Only an interactive play is ever saved, so resuming one keeps typing
        // and keeps saving.
        interactive: true,
        showingResults: false,
        report: null,
      };
      return withTimer(restored, now);
    }

    case "finish":
      return {
        ...state,
        status: SessionStatus.Finished,
        index: total,
        step: 0,
        endedAt: now,
        timer: null,
        showingResults: false,
      };

    default:
      // Teams, lifelines and undo live in their own module.
      return reducePlay(state, action);
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

export {
  countsAsQuestion,
  EMPTY_PROGRESS,
  isLastQuestion,
  progressOf,
  type Progress,
} from "../plan/progress";
