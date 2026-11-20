/**
 * The live protocol, v1.
 *
 * The host owns the game. Players get a small, allowlisted copy of a question:
 * no correct answers, no explanations until the reveal, no plan.
 */

import type { QuestionType } from "../core/model/question";
import type { Quiz } from "../core/session/quiz";
import type { Response } from "../core/session/responses";
import type { MediaKind } from "../core/values/media";
import type { RoomTransport, Unsubscribe } from "./transport/types";

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
  Buzz = "buzz",
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
  /** `Buzzer => true`: the first phone to buzz owns this question. */
  readonly buzzer: boolean;
  /** `Wager => true`: the phone offers a stake before answering. */
  readonly wager: boolean;
  /** The most a stake can be: the question's own points. */
  readonly wagerMax: number;
}

/** The first phone that buzzed. A timestamp, not a race in the app. */
export interface BuzzState {
  readonly playerId: string;
  readonly name: string;
  readonly at: number;
}

export interface BuzzPayload extends BuzzState {
  readonly questionId: string;
}

export interface LivePlayer {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly connected: boolean;
  readonly ready: boolean;
  readonly answered: boolean;
  readonly late: number;
  /** Points on the current question, when it takes a wager. */
  readonly stake: number | null;
  /** Here to watch. No answers, no buzzer, no score. */
  readonly watching?: boolean;
  /** The group this phone answers for, when a room plays in teams. */
  readonly team?: string;
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
  /** Who buzzed first on the current question, if anyone did. */
  readonly buzz: BuzzState | null;
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
  /** The stake this question carried, or null when it took none. */
  readonly stake: number | null;
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
  readonly watch?: boolean;
  readonly team?: string;
}

export interface SubmitPayload {
  readonly questionId: string;
  readonly response: Response;
  /** Points riding on this answer. Null when the question takes no stake. */
  readonly stake: number | null;
  readonly token: string | null;
}

export interface ReadyPayload {
  readonly ready: boolean;
}

export interface PingPayload {
  readonly now: number;
}

export interface HostOptions {
  readonly quiz: Quiz;
  readonly transport: RoomTransport;
  readonly code: string;
  /** A player may change an answer until the reveal. Off by default. */
  readonly allowChanges?: boolean;
  readonly maxPlayers?: number;
  /** Defaults to one reveal per question. */
  readonly reveal?: RevealMode;
  /** Round cards on the phones. On by default; the host can turn them off. */
  readonly sections?: boolean;
}

/** The host screen's whole door. The phones never see this. */
export interface HostRoom {
  readonly code: string;
  state(): RoomStatePayload;
  question(): LiveQuestion | null;
  /** The last reveal, including correct answers. Host screen only. */
  lastReveal(): RevealPayload | null;
  /** Lobby only. A mode changed mid-quiz would rewrite its own history. */
  setRevealMode(mode: RevealMode): void;
  /** Lobby only, for the same reason: the flow positions would move. */
  setSections(show: boolean): void;
  start(): void;
  show(index: number): void;
  close(): void;
  /** Reveal what the mode says is due. A no-op when nothing is. */
  reveal(): void;
  /** Next question, next reveal, the answer pass, or the end. */
  next(): void;
  end(): void;
  ping(): void;
  subscribe(listener: () => void): Unsubscribe;
  leave(): void;
}

export interface PongPayload {
  readonly now: number;
}
