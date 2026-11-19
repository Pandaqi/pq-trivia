/**
 * The player. It sends joins and answers, and trusts nothing the host says
 * about a question until it has checked the shape.
 */

import { createEnvelope, parseEnvelope } from "./protocol";
import type { Room, RoomTransport, Unsubscribe } from "./transport/types";
import {
  MessageType,
  RoomPhase,
  type JoinPayload,
  type LeaderRow,
  type LivePlayer,
  type LiveQuestion,
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
}

export interface PlayerState {
  readonly code: string;
  readonly id: string | null;
  readonly joined: boolean;
  readonly error: string | null;
  readonly phase: RoomPhase;
  readonly players: readonly LivePlayer[];
  readonly question: LiveQuestion | null;
  readonly closed: boolean;
  readonly allowChanges: boolean;
  readonly submitted: boolean;
  readonly reveal: RevealPayload | null;
  readonly leaderboard: readonly LeaderRow[];
}

export interface PlayerRoom {
  readonly code: string;
  readonly token: string | null;
  state(): PlayerState;
  join(): Promise<void>;
  submit(response: Response): void;
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

function readQuestion(payload: unknown): {
  question: LiveQuestion;
  closed: boolean;
  allowChanges: boolean;
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

function readLeaderboard(payload: unknown): LeaderRow[] | null {
  const entry = record(payload);
  return entry !== null && Array.isArray(entry["leaderboard"])
    ? (entry["leaderboard"] as LeaderRow[])
    : null;
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
    players: [],
    question: null,
    closed: false,
    allowChanges: false,
    submitted: false,
    reveal: null,
    leaderboard: [],
  };

  function update(next: Partial<PlayerState>): void {
    state = { ...state, ...next };
    for (const listener of [...listeners]) {
      listener();
    }
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
    });
    settleJoin(null);
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
        update({
          question: shown.question,
          closed: shown.closed,
          allowChanges: shown.allowChanges,
          submitted: false,
          reveal: null,
          phase: RoomPhase.Question,
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
        update({
          reveal,
          phase: RoomPhase.Reveal,
          closed: true,
          leaderboard: reveal.leaderboard,
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
          update({ error: "No host answered. Check the code." });
          reject(new Error("No host answered. Check the code."));
        }, timeoutMs);
        pending = { resolve, reject, timer };
        room.send(
          createEnvelope(
            MessageType.Join,
            { name: options.name, token } satisfies JoinPayload,
            room.selfId,
          ),
        );
      });
    },
    submit(response) {
      const question = state.question;
      if (question === null || state.submitted) {
        return;
      }
      room.send(
        createEnvelope(
          MessageType.AnswerSubmit,
          {
            questionId: question.id,
            response,
            token,
          } satisfies SubmitPayload,
          room.selfId,
        ),
      );
      update({ submitted: true });
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
