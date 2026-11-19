/**
 * The host. It owns the state, the deadline and the answers.
 *
 * Players only ever receive an allowlisted question. Correct answers leave this
 * file at the reveal, never before it.
 */

import { gradeQuestion } from "../core/grading/grading";
import { round2 } from "../core/grading/parts";
import type { QuestionModel } from "../core/model/question";
import type { QuizPlan } from "../core/plan/plan";
import type { Quiz } from "../core/session/quiz";
import type { Response } from "../core/session/responses";
import {
  describeResponse,
  liveQuestion,
  roundNameOf,
} from "./present";
import {
  createEnvelope,
  createRateLimiter,
  makeId,
  makeToken,
  parseEnvelope,
  readJoin,
  readSubmit,
} from "./protocol";
import type { Room, RoomTransport, Unsubscribe } from "./transport/types";
import {
  MAX_PLAYERS,
  MessageType,
  RoomPhase,
  type ClosePayload,
  type JoinPayload,
  type LeaderRow,
  type LiveQuestion,
  type LivePlayer,
  type PlayerResult,
  type QuestionPayload,
  type ReadyPayload,
  type RevealPayload,
  type RoomStatePayload,
  type ScorePayload,
  type SubmitPayload,
} from "./types";

export interface HostOptions {
  readonly quiz: Quiz;
  readonly transport: RoomTransport;
  readonly code: string;
  /** A player may change an answer until the reveal. Off by default. */
  readonly allowChanges?: boolean;
  readonly maxPlayers?: number;
}

export interface HostRoom {
  readonly code: string;
  state(): RoomStatePayload;
  question(): LiveQuestion | null;
  /** The last reveal, including correct answers. Host screen only. */
  lastReveal(): RevealPayload | null;
  start(): void;
  show(index: number): void;
  close(): void;
  reveal(): void;
  end(): void;
  ping(): void;
  subscribe(listener: () => void): Unsubscribe;
  leave(): void;
}

interface PlayerRecord {
  readonly id: string;
  readonly token: string;
  name: string;
  score: number;
  connected: boolean;
  ready: boolean;
  peer: string | null;
  readonly responses: Map<string, Response>;
  readonly answered: Set<string>;
  readonly late: Set<string>;
}


export async function createHost(options: HostOptions): Promise<HostRoom> {
  const quiz = options.quiz;
  const loadedPlan = quiz.state.plan;
  if (loadedPlan === null || loadedPlan.total === 0) {
    throw new Error("Load a quiz before opening a room.");
  }
  const plan: QuizPlan = loadedPlan;
  const maxPlayers = Math.min(options.maxPlayers ?? MAX_PLAYERS, MAX_PLAYERS);
  const allowChanges = options.allowChanges === true;
  const room: Room = await options.transport.create(options.code);
  const joinLimit = createRateLimiter();
  const submitLimit = createRateLimiter();

  const players = new Map<string, PlayerRecord>();
  const byPeer = new Map<string, string>();
  const listeners = new Set<() => void>();
  const seen = new Set<string>();

  let phase = RoomPhase.Lobby;
  let index = -1;
  let current: QuestionModel | null = null;
  let currentQuestion: LiveQuestion | null = null;
  let closed = false;
  let deadline: number | null = null;
  let seq = 0;
  let lastQuestion: QuestionPayload | null = null;
  let lastReveal: RevealPayload | null = null;
  let snapshot = stateOf(null);

  function leaderboard(): LeaderRow[] {
    return [...players.values()]
      .map((player) => ({
        id: player.id,
        name: player.name,
        score: player.score,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  function livePlayers(): LivePlayer[] {
    return [...players.values()].map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      connected: player.connected,
      ready: player.ready,
      answered: current !== null && player.answered.has(current.id),
      late: player.late.size,
    }));
  }

  function stateOf(
    you: string | null,
    token: string | null = null,
  ): RoomStatePayload {
    return {
      code: options.code,
      phase,
      players: livePlayers(),
      index,
      total: plan.total,
      seq,
      you,
      token,
    };
  }

  function notify(): void {
    snapshot = stateOf(null);
    for (const listener of [...listeners]) {
      listener();
    }
  }

  function sendTo(peer: string, type: MessageType, payload: unknown): void {
    room.send(createEnvelope(type, payload, room.selfId), peer);
  }

  function sendState(peer: string, playerId: string | null): void {
    const token =
      playerId === null ? null : (players.get(playerId)?.token ?? null);
    sendTo(peer, MessageType.RoomState, stateOf(playerId, token));
  }

  function broadcast(type: MessageType, payload: unknown): void {
    for (const player of players.values()) {
      if (player.peer !== null) {
        sendTo(player.peer, type, payload);
      }
    }
  }

  function publishState(): void {
    for (const player of players.values()) {
      if (player.peer !== null) {
        sendState(player.peer, player.id);
      }
    }
    notify();
  }

  function findPeer(playerId: string): PlayerRecord | undefined {
    return players.get(playerId);
  }

  function joinPeer(peer: string, payload: unknown): void {
    if (!joinLimit.allow(peer)) {
      return;
    }
    const request = readJoin(payload);
    if (request === null) {
      return;
    }
    const existing =
      request.token === null
        ? undefined
        : [...players.values()].find(
            (player) => player.token === request.token,
          );

    if (existing !== undefined) {
      reconnect(existing, peer, request.name);
      return;
    }
    if (phase !== RoomPhase.Lobby || players.size >= maxPlayers) {
      sendState(peer, null);
      return;
    }

    const player: PlayerRecord = {
      id: `p-${makeId()}`,
      token: makeToken(),
      name: request.name,
      score: 0,
      connected: true,
      ready: false,
      peer,
      responses: new Map(),
      answered: new Set(),
      late: new Set(),
    };
    players.set(player.id, player);
    byPeer.set(peer, player.id);
    sendState(peer, player.id);
    publishState();
  }

  function reconnect(
    player: PlayerRecord,
    peer: string,
    name: string,
  ): void {
    if (player.peer !== null) {
      byPeer.delete(player.peer);
    }
    player.peer = peer;
    player.connected = true;
    player.name = name;
    byPeer.set(peer, player.id);
    sendState(peer, player.id);
    if (lastQuestion !== null) {
      seq += 1;
      sendTo(peer, MessageType.QuestionShow, {
        ...lastQuestion,
        seq,
        closed,
      } satisfies QuestionPayload);
    }
    if (lastReveal !== null) {
      seq += 1;
      sendTo(peer, MessageType.AnswerReveal, {
        ...lastReveal,
        seq,
      } satisfies RevealPayload);
    }
    publishState();
  }

  function submit(peer: string, payload: unknown): void {
    const playerId = byPeer.get(peer);
    const player = playerId === undefined ? undefined : findPeer(playerId);
    if (player === undefined || current === null) {
      return;
    }
    if (!submitLimit.allow(player.id)) {
      return;
    }
    const request = readSubmit(payload);
    if (request === null || request.questionId !== current.id) {
      return;
    }
    if (phase !== RoomPhase.Question) {
      return;
    }
    if (!allowChanges && player.answered.has(current.id)) {
      return;
    }
    player.responses.set(current.id, request.response);
    player.answered.add(current.id);
    const late = closed || (deadline !== null && Date.now() > deadline);
    if (late) {
      player.late.add(current.id);
    }
    publishState();
  }

  function setReady(peer: string, payload: unknown): void {
    const playerId = byPeer.get(peer);
    const player = playerId === undefined ? undefined : findPeer(playerId);
    if (player === undefined) {
      return;
    }
    const entry =
      typeof payload === "object" && payload !== null
        ? (payload as Partial<ReadyPayload>)
        : {};
    player.ready = entry.ready === true;
    publishState();
  }

  function handle(envelope: unknown, from: string): void {
    const message = parseEnvelope(envelope);
    if (message === null || seen.has(message.id)) {
      return;
    }
    seen.add(message.id);
    if (seen.size > 2048) {
      seen.clear();
    }
    if (message.type === MessageType.Join) {
      joinPeer(from, message.payload);
      return;
    }
    if (message.type === MessageType.AnswerSubmit) {
      submit(from, message.payload);
      return;
    }
    if (message.type === MessageType.Ready) {
      setReady(from, message.payload);
    }
  }

  const offMessage = room.onMessage((message) =>
    handle(message.envelope, message.from),
  );
  const offLeave = room.onPeerLeave((peer) => {
    const playerId = byPeer.get(peer);
    if (playerId === undefined) {
      return;
    }
    byPeer.delete(peer);
    const player = players.get(playerId);
    if (player !== undefined) {
      player.peer = null;
      player.connected = false;
      publishState();
    }
  });

  function show(nextIndex: number): void {
    const question = plan.questions[nextIndex];
    if (question === undefined) {
      return;
    }
    index = nextIndex;
    current = question;
    phase = RoomPhase.Question;
    closed = false;
    lastReveal = null;
    deadline = question.timerMs === null ? null : Date.now() + question.timerMs;
    currentQuestion = liveQuestion(
      question,
      nextIndex,
      plan.total,
      roundNameOf(plan, nextIndex),
      deadline,
    );
    seq += 1;
    lastQuestion = {
      question: currentQuestion,
      seq,
      allowChanges,
      closed,
    };
    broadcast(MessageType.QuestionShow, lastQuestion);
    publishState();
  }

  function reveal(): void {
    const question = current;
    if (question === null || phase !== RoomPhase.Question) {
      return;
    }
    const results: Record<string, PlayerResult> = {};
    for (const player of players.values()) {
      const response = player.responses.get(question.id);
      if (response === undefined) {
        continue;
      }
      const grade = gradeQuestion(question, response);
      const late = player.late.has(question.id);
      const points = late ? 0 : grade.points;
      player.score = round2(player.score + points);
      results[player.id] = {
        given: describeResponse(question, response),
        correct: grade.correct && !late,
        points,
        late,
      };
    }
    phase = RoomPhase.Reveal;
    closed = true;
    seq += 1;
    lastReveal = {
      questionId: question.id,
      index,
      correct: question.correct.map((value) => value.text),
      explanation: question.explanation,
      results,
      leaderboard: leaderboard(),
      seq,
    };
    broadcast(MessageType.AnswerReveal, lastReveal);
    broadcast(MessageType.ScoreUpdate, {
      leaderboard: lastReveal.leaderboard,
    } satisfies ScorePayload);
    publishState();
  }

  return {
    code: options.code,
    state() {
      return snapshot;
    },
    question() {
      return currentQuestion;
    },
    lastReveal() {
      return lastReveal;
    },
    start() {
      if (phase === RoomPhase.Lobby) {
        show(0);
      }
    },
    show,
    close() {
      if (current === null || phase !== RoomPhase.Question) {
        return;
      }
      closed = true;
      broadcast(MessageType.QuestionClose, {
        questionId: current.id,
      } satisfies ClosePayload);
      publishState();
    },
    reveal,
    end() {
      phase = RoomPhase.Ended;
      broadcast(MessageType.QuizEnd, { leaderboard: leaderboard() });
      publishState();
    },
    ping() {
      broadcast(MessageType.Ping, { now: Date.now() });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    leave() {
      offMessage();
      offLeave();
      listeners.clear();
      room.leave();
    },
  };
}

export type { JoinPayload, SubmitPayload };
