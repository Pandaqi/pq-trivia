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
  readBuzz,
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
  /** Points each player put on each question. The host pays or takes them. */
  readonly stakes: Map<string, number>;
  readonly answered: Set<string>;
  readonly late: Set<string>;
  /** Here to watch. Never on the board, never counted as a seat. */
  readonly watching: boolean;
  /** The group this phone answers for. Null in a room of individuals. */
  team: string | null;
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
  /** A phone pressed the buzzer. The host decides who was first. */
  readonly onBuzz: (playerId: string, name: string, questionId: string) => void;
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
  const buzzLimit = createRateLimiter();

  function playerOf(peer: string): PlayerRecord | undefined {
    const id = byPeer.get(peer);
    return id === undefined ? undefined : players.get(id);
  }

  function leaderboard(): LeaderRow[] {
    return [...players.values()]
      .filter((player) => !player.watching)
      .map((player) => ({
        id: player.id,
        // A group of five sharing one phone is a team, and the board says so.
        name: player.team ?? player.name,
        score: player.score,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  function live(): LivePlayer[] {
    const question = context.current();
    const wagerQuestion = question !== null && question.wager;
    return [...players.values()].map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      connected: player.connected,
      ready: player.ready,
      answered: question !== null && player.answered.has(question.id),
      late: player.late.size,
      ...(player.team === null ? {} : { team: player.team }),
      stake:
        question === null || !wagerQuestion
          ? null
          : (player.stakes.get(question.id) ?? null),
      ...(player.watching ? { watching: true } : {}),
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
    // (A team is set on join only: a phone does not change group mid-quiz.)
    // A watcher takes no seat: the room is still full for players.
    const seated = [...players.values()].filter((player) => !player.watching);
    if (
      context.phase() !== RoomPhase.Lobby ||
      (!request.watch && seated.length >= context.maxPlayers)
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
      stakes: new Map(),
      answered: new Set(),
      late: new Set(),
      watching: request.watch,
      team: request.team,
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
    if (player === undefined || player.watching || question === null) {
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
    if (request.stake !== null) {
      player.stakes.set(question.id, request.stake);
    }
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
      return;
    }
    if (message.type === MessageType.Buzz) {
      const player = playerOf(from);
      const request = readBuzz(message.payload);
      if (player === undefined || request === null) {
        return;
      }
      if (!buzzLimit.allow(player.id)) {
        return;
      }
      context.onBuzz(player.id, player.name, request.questionId);
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
