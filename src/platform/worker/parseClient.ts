/**
 * Worker parsing, with an honest fallback.
 *
 * Above the threshold the text goes to a worker. If the worker cannot start,
 * crashes or takes too long, the same text is parsed on the main thread. Slower
 * on a huge quiz, never broken.
 */

import { parseQuiz, type BuildOptions, type ParsedQuiz } from "../../core/model/quiz";
import type { ParseHook } from "../../core/quiz/types";

export interface WorkerParserOptions {
  /** Where the built worker lives. Defaults to `parse.worker.js` next to the bundle. */
  readonly url?: string | URL;
  /** Characters, not questions. §11.1: 250 questions or 1 MB. */
  readonly threshold?: number;
  readonly timeoutMs?: number;
  /** For tests, or for a worker you built yourself. */
  readonly createWorker?: () => Worker;
}

export const DEFAULT_WORKER_THRESHOLD = 1_000_000;
const DEFAULT_TIMEOUT_MS = 15_000;

interface ParseResponse {
  readonly id: number;
  readonly result?: ParsedQuiz;
  readonly error?: string;
}

interface Pending {
  readonly resolve: (result: ParsedQuiz) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

export function createWorkerParser(
  options: WorkerParserOptions = {},
): ParseHook {
  const threshold = options.threshold ?? DEFAULT_WORKER_THRESHOLD;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pending = new Map<number, Pending>();
  let worker: Worker | null = null;
  let broken = false;
  let nextId = 1;

  function stop(error: Error): void {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    pending.clear();
    worker?.terminate();
    worker = null;
    broken = true;
  }

  function settle(response: ParseResponse): void {
    const entry = pending.get(response.id);
    if (entry === undefined) {
      return;
    }
    pending.delete(response.id);
    clearTimeout(entry.timer);
    if (response.result !== undefined) {
      entry.resolve(response.result);
      return;
    }
    entry.reject(new Error(response.error ?? "The parser worker failed."));
  }

  function spawn(): Worker | null {
    if (broken) {
      return null;
    }
    if (worker !== null) {
      return worker;
    }
    try {
      if (options.createWorker !== undefined) {
        worker = options.createWorker();
      } else if (options.url !== undefined) {
        worker = new Worker(options.url, { type: "module" });
      } else {
        return null;
      }
    } catch {
      broken = true;
      return null;
    }
    worker.onmessage = (event: MessageEvent<ParseResponse>) =>
      settle(event.data);
    worker.onerror = () => stop(new Error("The parser worker crashed."));
    return worker;
  }

  function send(
    target: Worker,
    text: string,
    build: BuildOptions,
  ): Promise<ParsedQuiz> {
    const id = nextId;
    nextId += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        stop(new Error("The parser worker took too long."));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      target.postMessage({ id, text, options: build });
    });
  }

  return async (text, build) => {
    if (text.length < threshold || typeof Worker === "undefined") {
      return parseQuiz(text, build);
    }
    const active = spawn();
    if (active === null) {
      return parseQuiz(text, build);
    }
    try {
      return await send(active, text, build);
    } catch {
      return parseQuiz(text, build);
    }
  };
}
