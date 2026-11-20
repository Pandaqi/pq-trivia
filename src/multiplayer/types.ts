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
  /** The second pass of the paper mode: questions again, then the answers. */
  Answers = "answers",
  Ended = "ended",
}

/**
 * When the truth comes out.
 *
 * A pub quiz has four honest shapes. One reveal per question (the classic),
 * one per round, one at the very end, or the paper version: play the whole
 * quiz first, then walk back through it with everyone's answers.
 */
export enum RevealMode {
  Question = "question",
  Round = "round",
  End = "end",
  Pass = "pass",
}

export const DEFAULT_REVEAL_MODE = RevealMode.Question;

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
  readonly revealMode: RevealMode;
  /** Round cards are part of the flow, unless the host turned them off. */
  readonly sections: boolean;
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
  readonly phase: RoomPhase;
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

/** One question's answers. A round reveal sends several of these at once. */
export interface RevealItem {
  readonly questionId: string;
  readonly index: number;
  readonly title: string;
  readonly correct: readonly string[];
  readonly explanation: string | null;
  readonly results: Readonly<Record<string, PlayerResult>>;
}

export interface RevealPayload {
  /** The first question in `items`, kept flat for the per-question reveal. */
  readonly questionId: string;
  readonly index: number;
  readonly correct: readonly string[];
  readonly explanation: string | null;
  readonly results: Readonly<Record<string, PlayerResult>>;
  readonly leaderboard: readonly LeaderRow[];
  readonly seq: number;
  readonly items: readonly RevealItem[];
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
