/**
 * The parser, on its own thread.
 *
 * The AST is plain data, so it crosses `postMessage` without a translator.
 * That was the point of keeping core DOM-free.
 */

import { parseQuiz, type BuildOptions, type ParsedQuiz } from "../core/model/quiz";

export interface ParseRequest {
  readonly id: number;
  readonly text: string;
  readonly options: BuildOptions;
}

export type ParseResponse =
  | { readonly id: number; readonly result: ParsedQuiz }
  | { readonly id: number; readonly error: string };

/** The worker scope, typed without pulling in the whole webworker lib. */
const scope = globalThis as unknown as {
  postMessage: (message: ParseResponse) => void;
  onmessage: ((event: MessageEvent<ParseRequest>) => void) | null;
};

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

scope.onmessage = (event) => {
  const { id, text, options } = event.data;
  try {
    scope.postMessage({ id, result: parseQuiz(text, options) });
  } catch (error) {
    // The main thread falls back to parsing inline, so the quiz still loads.
    scope.postMessage({ id, error: describe(error) });
  }
};
