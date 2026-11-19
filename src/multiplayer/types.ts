/**
 * The live protocol, v1.
 *
 * The host owns the game. Players get a small, allowlisted copy of a question:
 * no correct answers, no explanations until the reveal, no plan.
 */

import type { QuestionType } from "../core/model/question";
import type { Response } from "../core/session/responses";
import type { MediaKind } from "../core/values/media";

export const PROTOCOL_VERSION = 1;
export const MAX_PLAYERS = 32;
export const MAX_NAME_LENGTH = 24;

export enum LiveRole {
  Host = "host",
  Player = "player",
}

export enum RoomPhase {
  Lobby = "lobby",
  Question = "question",
  Reveal = "reveal",
  Ended = "ended",
}

export enum MessageType {
  RoomState = "room:state",
  QuestionShow = "question:show",
  QuestionClose = "question:close",
  AnswerReveal = "answer:reveal",
  ScoreUpdate = "score:update",
  QuizEnd = "quiz:end",
  Ping = "ping",
  Join = "join",
  AnswerSubmit = "answer:submit",
  Ready = "ready",
  Pong = "pong",
}

export interface Envelope<T = unknown> {
  readonly v: number;
  readonly type: MessageType;
  readonly id: string;
  readonly ts: number;
  readonly from: string;
  readonly payload: T;
}

export interface LiveAnswer {
  readonly id: string;
  readonly text: string;
}

export interface LiveMedia {
  readonly path: string;
  readonly kind: MediaKind;
  readonly alt: string | null;
  readonly credit: string | null;
}

/** Everything a phone may know before the reveal. Nothing more. */
export interface LiveQuestion {
  readonly id: string;
  readonly index: number;
  readonly total: number;
  readonly type: QuestionType;
  readonly title: string;
  readonly body: readonly string[];
  readonly answers: readonly LiveAnswer[];
  readonly media: readonly LiveMedia[];
  readonly points: number;
  readonly timerMs: number | null;
  /** Host time. Players compare with their own clock, loosely. */
  readonly deadline: number | null;
  /** Blanks in a cloze question. */
  readonly blanks: number;
  readonly roundName: string | null;
}

export interface LivePlayer {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly connected: boolean;
  readonly ready: boolean;
  readonly answered: boolean;
  readonly late: number;
}

export interface LeaderRow {
  readonly id: string;
  readonly name: string;
  readonly score: number;
}

export interface RoomStatePayload {
  readonly code: string;
  readonly phase: RoomPhase;
  readonly players: readonly LivePlayer[];
  readonly index: number;
  readonly total: number;
  readonly seq: number;
  /** The player this copy is for. Null means "not in this room". */
  readonly you: string | null;
  /** Reconnect token. Only ever sent to that player's own peer. */
  readonly token: string | null;
}

export interface QuestionPayload {
  readonly question: LiveQuestion;
  readonly seq: number;
  readonly allowChanges: boolean;
  readonly closed: boolean;
}

export interface ClosePayload {
  readonly questionId: string;
}

export interface PlayerResult {
  readonly given: string;
  readonly correct: boolean;
  readonly points: number;
  readonly late: boolean;
}

export interface RevealPayload {
  readonly questionId: string;
  readonly index: number;
  readonly correct: readonly string[];
  readonly explanation: string | null;
  readonly results: Readonly<Record<string, PlayerResult>>;
  readonly leaderboard: readonly LeaderRow[];
  readonly seq: number;
}

export interface ScorePayload {
  readonly leaderboard: readonly LeaderRow[];
}

export interface EndPayload {
  readonly leaderboard: readonly LeaderRow[];
}

export interface JoinPayload {
  readonly name: string;
  readonly token: string | null;
}

export interface SubmitPayload {
  readonly questionId: string;
  readonly response: Response;
  readonly token: string | null;
}

export interface ReadyPayload {
  readonly ready: boolean;
}

export interface PingPayload {
  readonly now: number;
}

export interface PongPayload {
  readonly now: number;
}
