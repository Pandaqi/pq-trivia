/**
 * The player. It sends joins and answers, and trusts nothing the host says
 * about a question until it has checked the shape.
 */

import { createEnvelope, parseEnvelope } from "./protocol";
import type { Room, RoomTransport, Unsubscribe } from "./transport/types";
import {
  DEFAULT_REVEAL_MODE,
  MessageType,
  RevealMode,
  RoomPhase,
  type BuzzPayload,
  type BuzzState,
  type JoinPayload,
  type LeaderRow,
  type LivePlayer,
  type LiveQuestion,
  type RevealItem,
  type RevealPayload,
  type RoomStatePayload,
  type SubmitPayload,
} from "./types";
import type { Response } from "../core/session/responses";

export interface PlayerOptions {
  readonly transport: RoomTransport;
  readonly code: string;
  readonly name: string;
  /** From an earlier session. Restores the score and the current question. */
  readonly token?: string | null;
  readonly joinTimeoutMs?: number;
  /** Watch only: join the room, take the questions, send nothing back. */
  readonly watching?: boolean;
  /** The group this phone answers for. One phone per group. */
  readonly team?: string;
}

/** One line of the quiz this phone just played. The end screen's memory. */
export interface HistoryRow {
  readonly questionId: string;
  readonly title: string;
  readonly correct: readonly string[];
  readonly given: string;
  readonly answeredCorrectly: boolean;
  readonly points: number;
}

export interface PlayerState {
  readonly code: string;
  readonly id: string | null;
  readonly joined: boolean;
  readonly error: string | null;
  readonly phase: RoomPhase;
  readonly revealMode: RevealMode;
  readonly players: readonly LivePlayer[];
  readonly question: LiveQuestion | null;
  readonly closed: boolean;
  readonly allowChanges: boolean;
  readonly submitted: boolean;
  readonly reveal: RevealPayload | null;
  readonly leaderboard: readonly LeaderRow[];
  /** Every question this phone has seen the answer to, in play order. */
  readonly history: readonly HistoryRow[];
  /** First buzz on this question, if anyone has pressed it. */
  readonly buzz: BuzzState | null;
  /** This screen is here to watch. */
  readonly watching: boolean;
  /** The team this phone answers for, if the room plays in teams. */
  readonly team: string | null;
}

export interface PlayerRoom {
  readonly code: string;
  readonly token: string | null;
  state(): PlayerState;
  join(): Promise<void>;
  /** `stake` only counts when the question asks for a wager. */
  submit(response: Response, stake?: number): void;
  /** Press the buzzer. A no-op unless the question asks for one. */
  buzz(): void;
  ready(value?: boolean): void;
  subscribe(listener: () => void): Unsubscribe;
  leave(): void;
}

const DEFAULT_JOIN_TIMEOUT_MS = 8000;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function readRoomState(payload: unknown): RoomStatePayload | null {
  const entry = record(payload);
  if (entry === null || !Array.isArray(entry["players"])) {
    return null;
  }
  if (typeof entry["phase"] !== "string") {
    return null;
  }
  return payload as RoomStatePayload;
}

function readRevealMode(value: unknown): RevealMode {
  return Object.values(RevealMode).includes(value as RevealMode)
    ? (value as RevealMode)
    : DEFAULT_REVEAL_MODE;
}

function readQuestion(payload: unknown): {
  question: LiveQuestion;
  closed: boolean;
  allowChanges: boolean;
  phase: RoomPhase;
} | null {
  const entry = record(payload);
  const question = entry === null ? null : record(entry["question"]);
  if (entry === null || question === null) {
    return null;
  }
  if (
    typeof question["id"] !== "string" ||
    typeof question["title"] !== "string" ||
    !Array.isArray(question["answers"])
  ) {
    return null;
  }
  return {
    question: entry["question"] as LiveQuestion,
    closed: entry["closed"] === true,
    allowChanges: entry["allowChanges"] === true,
    phase:
      entry["phase"] === RoomPhase.Answers
        ? RoomPhase.Answers
        : RoomPhase.Question,
  };
}

function readReveal(payload: unknown): RevealPayload | null {
  const entry = record(payload);
  if (
    entry === null ||
    typeof entry["questionId"] !== "string" ||
    !Array.isArray(entry["correct"]) ||
    !Array.isArray(entry["leaderboard"])
  ) {
    return null;
  }
  return payload as RevealPayload;
}

/** One reveal becomes one line per question, the newest answer winning. */
function mergeHistory(
  current: readonly HistoryRow[],
  items: readonly RevealItem[],
  selfId: string | null,
): readonly HistoryRow[] {
  if (selfId === null) {
    return current;
  }
  const rows = [...current];
  const at = new Map(rows.map((row, index) => [row.questionId, index]));
  for (const item of items) {
    const result = item.results[selfId];
    const row: HistoryRow = {
      questionId: item.questionId,
      title: item.title,
      correct: item.correct,
      given: result?.given ?? "",
      answeredCorrectly: result?.correct === true,
      points: result?.points ?? 0,
    };
    const index = at.get(item.questionId);
    if (index === undefined) {
      at.set(item.questionId, rows.length);
      rows.push(row);
    } else {
      rows[index] = row;
    }
  }
  return rows;
}

function readItems(payload: unknown): readonly RevealItem[] {
  const entry = record(payload);
  return entry !== null && Array.isArray(entry["items"])
    ? (entry["items"] as RevealItem[])
    : [];
}

function readLeaderboard(payload: unknown): LeaderRow[] | null {
  const entry = record(payload);
  return entry !== null && Array.isArray(entry["leaderboard"])
    ? (entry["leaderboard"] as LeaderRow[])
    : null;
}

/** Phases where a phone without a question is missing exactly that. */
function roomHasQuestion(phase: RoomPhase): boolean {
  return (
    phase === RoomPhase.Question ||
    phase === RoomPhase.Answers ||
    phase === RoomPhase.Reveal
  );
}

export async function createPlayer(
  options: PlayerOptions,
): Promise<PlayerRoom> {
  const room: Room = await options.transport.join(options.code);
  const listeners = new Set<() => void>();
  const timeoutMs = options.joinTimeoutMs ?? DEFAULT_JOIN_TIMEOUT_MS;
  let token = options.token ?? null;
  let pending: {
    readonly resolve: () => void;
    readonly reject: (error: Error) => void;
    readonly timer: ReturnType<typeof setTimeout>;
  } | null = null;

  let state: PlayerState = {
    code: options.code,
    id: null,
    joined: false,
    error: null,
    phase: RoomPhase.Lobby,
    revealMode: DEFAULT_REVEAL_MODE,
    players: [],
    question: null,
    closed: false,
    allowChanges: false,
    submitted: false,
    reveal: null,
    leaderboard: [],
    history: [],
    buzz: null,
    watching: options.watching === true,
    team: options.team ?? null,
  };

  function update(next: Partial<PlayerState>): void {
    state = { ...state, ...next };
    for (const listener of [...listeners]) {
      listener();
    }
  }

  let resyncTries = 0;

  /** Ask the host for the current question. Only worth a few tries. */
  function requestResync(): void {
    if (resyncTries >= 3) {
      return;
    }
    resyncTries += 1;
    room.send(createEnvelope(MessageType.Resync, {}, room.selfId));
  }

  function settleJoin(error: string | null): void {
    if (pending === null) {
      if (error !== null) {
        update({ error });
      }
      return;
    }
    clearTimeout(pending.timer);
    if (error === null) {
      pending.resolve();
    } else {
      pending.reject(new Error(error));
    }
    pending = null;
  }

  function applyState(payload: RoomStatePayload): void {
    if (payload.you === null) {
      update({
        players: payload.players,
        phase: payload.phase,
        revealMode: readRevealMode(payload.revealMode),
        error: state.joined
          ? null
          : "The host did not let you in. The room may be full, or the quiz has started.",
      });
      settleJoin("The host did not let you in.");
      return;
    }
    if (payload.token !== null) {
      token = payload.token;
    }
    update({
      id: payload.you,
      joined: true,
      error: null,
      players: payload.players,
      phase: payload.phase,
      revealMode: readRevealMode(payload.revealMode),
      buzz: payload.buzz ?? null,
    });
    settleJoin(null);
    // The room says a question is up but this phone has none. That is a lost
    // first message, not a game state: ask again, a few times at most.
    if (state.question === null && roomHasQuestion(payload.phase)) {
      requestResync();
    }
  }

  function handle(payload: unknown, type: MessageType, from: string): void {
    if (type === MessageType.RoomState) {
      const roomState = readRoomState(payload);
      if (roomState !== null) {
        applyState(roomState);
      }
      return;
    }
    if (type === MessageType.QuestionShow) {
      const shown = readQuestion(payload);
      if (shown !== null) {
        resyncTries = 0;
        update({
          question: shown.question,
          closed: shown.closed,
          allowChanges: shown.allowChanges,
          submitted: false,
          reveal: null,
          buzz: null,
          phase: shown.phase,
        });
      }
      return;
    }
    if (type === MessageType.QuestionClose) {
      update({ closed: true });
      return;
    }
    if (type === MessageType.AnswerReveal) {
      const reveal = readReveal(payload);
      if (reveal !== null) {
        // The reveal carries the board, so a reconnect needs no second message.
        // In the answer pass it is content, and the pass goes on.
        update({
          reveal,
          phase:
            state.phase === RoomPhase.Answers
              ? RoomPhase.Answers
              : RoomPhase.Reveal,
          closed: true,
          leaderboard: reveal.leaderboard,
          history: mergeHistory(state.history, reveal.items, state.id),
        });
      }
      return;
    }
    if (type === MessageType.Buzz) {
      const entry = record(payload);
      if (
        entry !== null &&
        typeof entry["playerId"] === "string" &&
        typeof entry["name"] === "string" &&
        typeof entry["at"] === "number" &&
        (state.question === null || entry["questionId"] === state.question.id)
      ) {
        update({
          buzz: entry as unknown as BuzzPayload,
        });
      }
      return;
    }
    if (type === MessageType.ScoreUpdate) {
      const leaderboard = readLeaderboard(payload);
      if (leaderboard !== null) {
        update({ leaderboard });
      }
      return;
    }
    if (type === MessageType.QuizEnd) {
      const leaderboard = readLeaderboard(payload);
      update({
        phase: RoomPhase.Ended,
        ...(leaderboard === null ? {} : { leaderboard }),
        history: mergeHistory(state.history, readItems(payload), state.id),
      });
      return;
    }
    if (type === MessageType.Ping) {
      room.send(
        createEnvelope(MessageType.Pong, { now: Date.now() }, room.selfId),
        from,
      );
    }
  }

  const offMessage = room.onMessage((message) => {
    const envelope = parseEnvelope(message.envelope);
    if (envelope !== null) {
      handle(envelope.payload, envelope.type, message.from);
    }
  });

  return {
    code: options.code,
    get token() {
      return token;
    },
    state() {
      return state;
    },
    join() {
      if (state.joined) {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending = null;
          update({ error: "liveNoHost" });
          reject(new Error("No host answered. Check the code."));
        }, timeoutMs);
        pending = { resolve, reject, timer };
        room.send(
          createEnvelope(
            MessageType.Join,
            {
              name: options.name,
              token,
              watch: state.watching,
              ...(state.team === null ? {} : { team: state.team }),
            } satisfies JoinPayload,
            room.selfId,
          ),
        );
      });
    },
    submit(response, stake) {
      const question = state.question;
      if (
        state.watching ||
        question === null ||
        state.submitted ||
        state.phase !== RoomPhase.Question
      ) {
        return;
      }
      const bet =
        question.wager && stake !== undefined && Number.isFinite(stake)
          ? Math.max(0, Math.min(Math.floor(stake), question.wagerMax))
          : null;
      room.send(
        createEnvelope(
          MessageType.AnswerSubmit,
          {
            questionId: question.id,
            response,
            stake: bet,
            token,
          } satisfies SubmitPayload,
          room.selfId,
        ),
      );
      update({ submitted: true });
    },
    buzz() {
      const question = state.question;
      if (
        state.watching ||
        question === null ||
        !question.buzzer ||
        state.buzz !== null ||
        state.closed ||
        state.phase !== RoomPhase.Question
      ) {
        return;
      }
      room.send(
        createEnvelope(
          MessageType.Buzz,
          { questionId: question.id },
          room.selfId,
        ),
      );
    },
    ready(value = true) {
      room.send(
        createEnvelope(MessageType.Ready, { ready: value }, room.selfId),
      );
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    leave() {
      offMessage();
      listeners.clear();
      room.leave();
    },
  };
}
