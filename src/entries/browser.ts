/**
 * Bundle entry for `dist/v3/browser.js`. The optional extras.
 *
 * Worker parsing, the IndexedDB cache and manifest loading each cost a little
 * weight. The default player stays under its budget because they live here.
 *
 *   import { createQuiz, mountQuiz } from "./player.js";
 *   import { createWorkerParser } from "./browser.js";
 *
 *   const quiz = createQuiz({ parseText: createWorkerParser() });
 */

import type { Quiz } from "../core/quiz/types";
import {
  loadQuizSource,
  loadQuizText,
  type LoadSourceOptions,
} from "../platform/browser/source";
import { sharedTextCache } from "../platform/browser/cache";
import {
  createWorkerParser,
  type WorkerParserOptions,
} from "../platform/worker/parseClient";
import type { QuizManifest } from "../core/quiz/manifest";

export {
  createWorkerParser,
  DEFAULT_WORKER_THRESHOLD,
  type WorkerParserOptions,
} from "../platform/worker/parseClient";
export {
  sharedTextCache,
  browserTextCache,
  memoryTextCache,
  fetchTextCached,
  DEFAULT_CACHE_BYTES,
  type TextCache,
  type TextEntry,
} from "../platform/browser/cache";
export {
  loadQuizSource,
  loadQuizText,
  resolvePath,
  isFileProtocol,
  FILE_PROTOCOL_HINT,
  type LoadSourceOptions,
} from "../platform/browser/source";
export { parseManifest, isManifest, type QuizManifest } from "../core/quiz/manifest";

/** Manifest, inline JSON and plain text, with the shared cache underneath. */
export async function loadQuizSourceCached(
  quiz: Quiz,
  source: string,
  options: LoadSourceOptions = {},
): Promise<QuizManifest | null> {
  return loadQuizSource(quiz, source, {
    cache: options.cache ?? sharedTextCache(),
  });
}

export async function loadQuizTextCached(
  quiz: Quiz,
  text: string,
  source: string,
  options: LoadSourceOptions = {},
): Promise<QuizManifest | null> {
  return loadQuizText(quiz, text, source, {
    cache: options.cache ?? sharedTextCache(),
  });
}

/** `parse.worker.js` sits next to this bundle. */
export function workerParser(options: WorkerParserOptions = {}): ReturnType<
  typeof createWorkerParser
> {
  return createWorkerParser({
    url: new URL("parse.worker.js", import.meta.url),
    ...options,
  });
}
