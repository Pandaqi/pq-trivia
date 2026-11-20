/**
 * Lifelines and undo: the two things a stuck player gets.
 *
 * A lifeline costs points, so it is a trade, not a free pass. Restricted mode
 * turns them all off: a test with a 50/50 is not a test.
 */

import { answerRefs } from "../model/answers";
import type { QuestionModel } from "../model/question";
import {
  defaultResponse,
  setResponse,
  type Response,
  type ResponseMap,
} from "../session/responses";
import type {
  SessionAction,
  SessionState,
  TeamState,
} from "../session/session";
import { derivedRng, shuffleWith } from "../plan/shuffle";

export enum Lifeline {
  FiftyFifty = "50-50",
  ExtraTime = "extra-time",
  AskRoom = "ask-room",
}

export const LIFELINE_IDS: readonly Lifeline[] = [
  Lifeline.FiftyFifty,
  Lifeline.ExtraTime,
  Lifeline.AskRoom,
];

/** What each one costs. Points, from the question it was used on. */
export const LIFELINE_COST: Readonly<Record<Lifeline, number>> = {
  [Lifeline.FiftyFifty]: 1,
  [Lifeline.ExtraTime]: 1,
  [Lifeline.AskRoom]: 2,
};

/** Thirty more seconds on the question's own timer. */
export const EXTRA_TIME_MS = 30_000;
/** How many wrong options 50/50 takes away. */
export const FIFTY_FIFTY_REMOVES = 2;
/** One step back. More than that is a rewind, and a rewind is cheating. */
export const UNDO_DEPTH = 1;

/** Punctuation and case are not part of the name. */
const LIFELINE_ALIASES: Readonly<Record<string, Lifeline>> = {
  "5050": Lifeline.FiftyFifty,
  fiftyfifty: Lifeline.FiftyFifty,
  extratime: Lifeline.ExtraTime,
  time: Lifeline.ExtraTime,
  asktheroom: Lifeline.AskRoom,
  askroom: Lifeline.AskRoom,
  ask: Lifeline.AskRoom,
};

/** `ask-the-room`, `ask room` and `askroom` are the same lifeline. */
export function parseLifeline(raw: string): Lifeline | null {
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  return LIFELINE_ALIASES[key] ?? null;
}

/** What the host allows. Restricted mode allows nothing. */
export function allowedLifelines(
  values: readonly string[],
  restricted: boolean,
): readonly Lifeline[] {
  if (restricted) {
    return [];
  }
  const out: Lifeline[] = [];
  for (const value of values) {
    const lifeline = parseLifeline(value);
    if (lifeline !== null && !out.includes(lifeline)) {
      out.push(lifeline);
    }
  }
  return out;
}

/** The price of the lifelines used on one question. Zero when none were. */
export function lifelineCost(used: readonly Lifeline[]): number {
  return used.reduce((total, lifeline) => total + LIFELINE_COST[lifeline], 0);
}

/**
 * Two wrong options to grey out, picked by the seed so a replay of the same
 * seed hides the same two. Fewer than two wrong options hides what it can.
 */
export function fiftyFifty(
  question: QuestionModel,
  seed: string,
): readonly string[] {
  const correct = new Set(question.correct.map((value) => value.text));
  const wrong = answerRefs(question)
    .filter((ref) =>
      question.negate
        ? correct.has(ref.value.text)
        : !correct.has(ref.value.text),
    )
    .map((ref) => ref.id);
  return shuffleWith(wrong, derivedRng(seed, `fifty:${question.id}`)).slice(
    0,
    FIFTY_FIFTY_REMOVES,
  );
}

/** One answer's earlier state, so a player can take one step back. */
export interface UndoStep {
  readonly questionId: string;
  readonly response: Response;
}

/** Every question gets its empty answer, the way a solo attempt starts. */
function filled(state: SessionState, responses: ResponseMap): ResponseMap {
  if (state.plan === null) {
    return responses;
  }
  const out: Record<string, Response> = {};
  for (const question of state.plan.questions) {
    out[question.id] = responses[question.id] ?? defaultResponse(question);
  }
  return out;
}

/**
 * The play half of the reducer: teams, lifelines and undo.
 *
 * Split out of `session.ts` so the reducer reads as navigation, answers and
 * then a call down here. Anything that is not a play action is left alone.
 */
export function reducePlay(
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case "undo": {
      const step = state.undo;
      if (step === null) {
        return state;
      }
      return {
        ...state,
        undo: null,
        responses: setResponse(state.responses, step.questionId, step.response),
      };
    }

    case "undo/clear":
      return state.undo === null ||
        (action.questionId !== undefined &&
          state.undo.questionId !== action.questionId)
        ? state
        : { ...state, undo: null };

    case "lifeline/use": {
      const used = state.lifelines[action.questionId] ?? [];
      if (used.includes(action.lifeline)) {
        return state;
      }
      return {
        ...state,
        lifelines: {
          ...state.lifelines,
          [action.questionId]: [...used, action.lifeline],
        },
      };
    }

    // Team mode. Every team keeps its own answers; the plan is shared.
    case "team/start": {
      const teams: TeamState[] = action.names.map((name) => ({
        name,
        responses: filled(state, {}),
        lifelines: {},
      }));
      const first = teams[0];
      if (first === undefined) {
        return state;
      }
      return {
        ...state,
        teams,
        team: 0,
        responses: first.responses,
        lifelines: first.lifelines,
        undo: null,
      };
    }

    case "team/switch": {
      if (state.teams.length === 0) {
        return state;
      }
      const index = Math.max(0, Math.min(action.index, state.teams.length - 1));
      // Answers and lifelines travel together: the team that walks away keeps
      // both, and the team that sits down gets its own.
      const teams = state.teams.map((team, at) =>
        at === state.team
          ? { ...team, responses: state.responses, lifelines: state.lifelines }
          : team,
      );
      const next = teams[index];
      if (next === undefined) {
        return state;
      }
      return {
        ...state,
        teams,
        team: index,
        responses: filled(state, next.responses),
        lifelines: next.lifelines,
        undo: null,
      };
    }

    case "team/stop": {
      if (state.team < 0) {
        return state;
      }
      // Back to solo means the teams are gone. Leaving the list behind kept
      // the badge up and the next switch revived a team nobody asked for.
      // Lifelines went with the teams, so solo starts with them all again.
      return { ...state, teams: [], team: -1, lifelines: {} };
    }

    default:
      return state;
  }
}
