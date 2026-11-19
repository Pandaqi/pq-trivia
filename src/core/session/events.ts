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
