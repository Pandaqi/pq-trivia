/**
 * The people in the room: joining, coming back, answering, leaving.
 *
 * The host owns the quiz; this owns the guest list. Everything that arrives
 * from a phone is checked here before it becomes state.
 */

import type { QuestionModel } from "../core/model/question";
import type { Response } from "../core/session/responses";
import {
  createRateLimiter,
  makeId,
  makeToken,
  parseEnvelope,
  readJoin,
  readSubmit,
} from "./protocol";
import type { Room } from "./transport/types";
import {
  MessageType,
  RoomPhase,
  type LeaderRow,
  type LivePlayer,
  type ReadyPayload,
} from "./types";

export interface PlayerRecord {
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

/** What the roster may ask the host, and nothing else. */
export interface RosterContext {
  readonly room: Room;
  readonly maxPlayers: number;
  readonly allowChanges: boolean;
  /** Lobby: a new face may come in. Question: an answer may land. */
  readonly phase: () => RoomPhase;
  readonly current: () => QuestionModel | null;
  readonly closed: () => boolean;
  readonly deadline: () => number | null;
  readonly sendState: (peer: string, playerId: string | null) => void;
  readonly publishState: () => void;
  /** The current question and reveal, for a phone that came back. */
  readonly replay: (peer: string) => void;
}

export interface Roster {
  readonly players: Map<string, PlayerRecord>;
  leaderboard(): LeaderRow[];
  live(): LivePlayer[];
  handle(envelope: unknown, from: string): void;
  peerLeft(peer: string): void;
}

export function createRoster(context: RosterContext): Roster {
  const players = new Map<string, PlayerRecord>();
  const byPeer = new Map<string, string>();
  const seen = new Set<string>();
  const joinLimit = createRateLimiter();
  const submitLimit = createRateLimiter();

  function playerOf(peer: string): PlayerRecord | undefined {
    const id = byPeer.get(peer);
    return id === undefined ? undefined : players.get(id);
  }

  function leaderboard(): LeaderRow[] {
    return [...players.values()]
      .map((player) => ({
        id: player.id,
        name: player.name,
        score: player.score,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  function live(): LivePlayer[] {
    const question = context.current();
    return [...players.values()].map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      connected: player.connected,
      ready: player.ready,
      answered: question !== null && player.answered.has(question.id),
      late: player.late.size,
    }));
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
    if (
      context.phase() !== RoomPhase.Lobby ||
      players.size >= context.maxPlayers
    ) {
      context.sendState(peer, null);
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
    context.sendState(peer, player.id);
    context.publishState();
  }

  function reconnect(player: PlayerRecord, peer: string, name: string): void {
    if (player.peer !== null) {
      byPeer.delete(player.peer);
    }
    player.peer = peer;
    player.connected = true;
    player.name = name;
    byPeer.set(peer, player.id);
    context.sendState(peer, player.id);
    context.replay(peer);
    context.publishState();
  }

  function submit(peer: string, payload: unknown): void {
    const player = playerOf(peer);
    const question = context.current();
    if (player === undefined || question === null) {
      return;
    }
    if (!submitLimit.allow(player.id)) {
      return;
    }
    const request = readSubmit(payload);
    if (request === null || request.questionId !== question.id) {
      return;
    }
    if (context.phase() !== RoomPhase.Question) {
      return;
    }
    if (!context.allowChanges && player.answered.has(question.id)) {
      return;
    }
    const deadline = context.deadline();
    player.responses.set(question.id, request.response);
    player.answered.add(question.id);
    const late =
      context.closed() || (deadline !== null && Date.now() > deadline);
    if (late) {
      player.late.add(question.id);
    }
    context.publishState();
  }

  function setReady(peer: string, payload: unknown): void {
    const player = playerOf(peer);
    if (player === undefined) {
      return;
    }
    const entry =
      typeof payload === "object" && payload !== null
        ? (payload as Partial<ReadyPayload>)
        : {};
    player.ready = entry.ready === true;
    context.publishState();
  }

  /** One message per peer, once. A replay of the same id changes nothing. */
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

  return {
    players,
    leaderboard,
    live,
    handle,
    peerLeft(peer) {
      const id = byPeer.get(peer);
      if (id === undefined) {
        return;
      }
      byPeer.delete(peer);
      const player = players.get(id);
      if (player !== undefined) {
        player.peer = null;
        player.connected = false;
        context.publishState();
      }
    },
  };
}
