import type { QuizPlan } from "../plan/plan";
import type { Diagnostic } from "../syntax/diagnostics";
import type { GradeReport } from "../grading/report";
import type { Confidence, Response, ResponseMap } from "./responses";
import type { PlayMode } from "./session";

/** Every change the reducer understands. Actions in, events out. */
export type SessionAction =
  | { readonly type: "load/start" }
  | { readonly type: "load/success"; readonly plan: QuizPlan }
  | { readonly type: "plan/replace"; readonly plan: QuizPlan }
  | {
      readonly type: "load/failure";
      readonly diagnostics: readonly Diagnostic[];
    }
  | { readonly type: "nav/next" }
  | { readonly type: "nav/prev" }
  | { readonly type: "nav/goTo"; readonly index: number }
  | { readonly type: "step/next" }
  | { readonly type: "nav/restart"; readonly keepResponses?: boolean }
  | { readonly type: "mode/set"; readonly mode: PlayMode }
  | { readonly type: "interactive/set"; readonly interactive: boolean }
  | {
      readonly type: "response/set";
      readonly questionId: string;
      readonly response: Response;
    }
  | {
      readonly type: "answer/toggle";
      readonly questionId: string;
      readonly answerId: string;
    }
  | {
      readonly type: "confidence/set";
      readonly questionId: string;
      readonly level: Confidence | null;
    }
  | {
      readonly type: "wager/set";
      readonly questionId: string;
      readonly value: number;
    }
  | {
      readonly type: "noidea/set";
      readonly questionId: string;
      readonly value: boolean;
    }
  | { readonly type: "media/play"; readonly questionId: string }
  | { readonly type: "hint/reveal"; readonly questionId: string }
  | { readonly type: "reveal"; readonly questionId: string }
  | { readonly type: "hide"; readonly questionId: string }
  | { readonly type: "language/set"; readonly language: string }
  | { readonly type: "timer/expire"; readonly questionId: string }
  | {
      readonly type: "timer/extend";
      readonly questionId: string;
      readonly ms: number;
    }
  | { readonly type: "results/show"; readonly report: GradeReport }
  | { readonly type: "results/hide" }
  | {
      readonly type: "attempt/restore";
      readonly responses: ResponseMap;
      readonly index: number;
      readonly startedAt: number | null;
      readonly endedAt: number | null;
      readonly confidence?: Readonly<Record<string, Confidence>>;
      readonly wagers?: Readonly<Record<string, number>>;
      readonly noIdea?: readonly string[];
      readonly mediaPlays?: Readonly<Record<string, number>>;
    }
  | { readonly type: "team/start"; readonly names: readonly string[] }
  | { readonly type: "team/switch"; readonly index: number }
  | { readonly type: "team/stop" }
  | {
      readonly type: "lifeline/use";
      readonly questionId: string;
      readonly lifeline: string;
    }
  | { readonly type: "undo" }
  | {
      readonly type: "undo/clear";
      readonly questionId?: string;
    }
  | { readonly type: "finish" };
/**
 * Typed emitter. Tiny on purpose.
 *
 * A throwing handler becomes a diagnostic, not a dead quiz.
 */

export type Unsubscribe = () => void;

export interface EmitterOptions {
  readonly onHandlerError?: (error: unknown, event: string) => void;
}

export class Emitter<Events extends Record<string, unknown>> {
  readonly #handlers = new Map<keyof Events, Set<(payload: never) => void>>();
  readonly #onError: ((error: unknown, event: string) => void) | undefined;

  constructor(options: EmitterOptions = {}) {
    this.#onError = options.onHandlerError;
  }

  on<K extends keyof Events>(
    event: K,
    handler: (payload: Events[K]) => void,
  ): Unsubscribe {
    const set = this.#handlers.get(event) ?? new Set();
    set.add(handler as (payload: never) => void);
    this.#handlers.set(event, set);
    return () => {
      set.delete(handler as (payload: never) => void);
    };
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.#handlers.get(event);
    if (set === undefined) {
      return;
    }
    for (const handler of [...set]) {
      try {
        (handler as (value: Events[K]) => void)(payload);
      } catch (error) {
        this.#onError?.(error, String(event));
      }
    }
  }

  clear(): void {
    this.#handlers.clear();
  }
}
