/**
 * Question timers as data, not `setInterval`.
 *
 * The session stores when a timer started and how long it lasts. The renderer
 * asks for the remaining time whenever it paints. No drift, no hidden ticks,
 * and pausing is just moving `startedAt`.
 */

import type { QuestionModel } from "../model/question";

export interface TimerState {
  readonly questionId: string;
  readonly totalMs: number;
  readonly startedAt: number;
  /** Total already spent in earlier runs of the same timer. */
  readonly elapsedMs: number;
}

/** A port. The browser fills it with Web Audio; core stays silent. */
export interface TimerSound {
  /** Last five seconds. */
  warning(): void;
  /** Time is up. */
  done(): void;
}

export function timerFor(
  question: QuestionModel,
  now: number,
): TimerState | null {
  if (question.timerMs === null || question.timerMs <= 0) {
    return null;
  }
  return {
    questionId: question.id,
    totalMs: question.timerMs,
    startedAt: now,
    elapsedMs: 0,
  };
}

export function remainingOf(timer: TimerState, now: number): number {
  const spent = timer.elapsedMs + Math.max(0, now - timer.startedAt);
  return Math.max(0, timer.totalMs - spent);
}

export function isExpired(timer: TimerState, now: number): boolean {
  return remainingOf(timer, now) <= 0;
}

/** Freeze the clock. Resuming sets a new `startedAt` and banks the elapsed time. */
export function pauseTimer(timer: TimerState, now: number): TimerState {
  return {
    ...timer,
    elapsedMs: timer.totalMs - remainingOf(timer, now),
    startedAt: now,
  };
}

/** `1:30`, `0:07`. Minutes only when needed, so a ten-second timer stays calm. */
export function formatTimer(remainingMs: number): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : `${seconds}s`;
}

/** The last quarter is urgent. The theme repeats that, not just this number. */
export function timerUrgency(
  remainingMs: number,
  totalMs: number,
): "calm" | "warn" | "urgent" | "done" {
  if (remainingMs <= 0) {
    return "done";
  }
  const ratio = totalMs <= 0 ? 1 : remainingMs / totalMs;
  if (ratio <= 0.1) {
    return "urgent";
  }
  if (ratio <= 0.25) {
    return "warn";
  }
  return "calm";
}
