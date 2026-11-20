/**
 * Saved attempts. One record per play-through, keyed by quiz content.
 *
 * A reload should offer to resume. A finished quiz should keep its history.
 * Both read the same record, and the record has a schema version.
 */

import type { GradeReport } from "../grading/report";
import type { ResponseMap } from "./responses";
import { SessionStatus, type SessionState } from "./session";
import type { StorageAdapter } from "./storage";

export const ATTEMPT_SCHEMA_VERSION = 1;
const PREFIX = "pq:attempt:";
const HISTORY_LIMIT = 5;
/** A day. After that an unfinished run is clutter, not unfinished business. */
export const ATTEMPT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface TimerApi {
  readonly schedule: (callback: () => void, ms: number) => unknown;
  readonly cancel: (handle: unknown) => void;
}

export interface JournalOptions {
  /** Coalesce writes. Zero writes immediately. */
  readonly debounceMs?: number;
  /** Injected, because core has no timers of its own. */
  readonly timers?: TimerApi;
}

export interface AttemptConfig {
  readonly seed: string;
  readonly shuffleQuestions: boolean;
  readonly shuffleRounds: boolean;
  readonly mode: string;
  readonly restricted: boolean;
}

export interface AttemptRecord {
  readonly schemaVersion: number;
  readonly quizKey: string;
  readonly title: string;
  readonly index: number;
  readonly status: string;
  readonly responses: ResponseMap;
  readonly startedAt: number | null;
  readonly endedAt: number | null;
  readonly savedAt: number;
  readonly report: GradeReport | null;
  readonly config: AttemptConfig;
}

function keyOf(attemptKey: string, savedAt: number): string {
  return `${PREFIX}${attemptKey}:${savedAt}`;
}

/** Title, seed and question count. Rename a quiz and the old attempt stays old. */
export function attemptKeyFor(
  title: string,
  seed: string,
  total: number,
): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${slug.length === 0 ? "quiz" : slug}-${seed}-${total}`;
}

export function createAttempt(
  quizKey: string,
  title: string,
  config: AttemptConfig,
  fields: {
    readonly index: number;
    readonly status: string;
    readonly responses: ResponseMap;
    readonly startedAt: number | null;
    readonly endedAt: number | null;
    readonly report: GradeReport | null;
    readonly savedAt: number;
  },
): AttemptRecord {
  return {
    schemaVersion: ATTEMPT_SCHEMA_VERSION,
    quizKey,
    title,
    index: fields.index,
    status: fields.status,
    responses: fields.responses,
    startedAt: fields.startedAt,
    endedAt: fields.endedAt,
    savedAt: fields.savedAt,
    report: fields.report,
    config,
  };
}

function parse(raw: string | null): AttemptRecord | null {
  if (raw === null) {
    return null;
  }
  try {
    const data = JSON.parse(raw) as Partial<AttemptRecord> | null;
    if (
      data === null ||
      typeof data !== "object" ||
      data.schemaVersion !== ATTEMPT_SCHEMA_VERSION ||
      typeof data.quizKey !== "string"
    ) {
      return null;
    }
    return data as AttemptRecord;
  } catch {
    return null;
  }
}

/** Write the current state, if there is anything worth writing. */
export function saveAttempt(
  journal: AttemptJournal,
  title: string,
  state: SessionState,
  config: AttemptConfig,
): void {
  if (
    state.plan === null ||
    state.index < 0 ||
    state.status === SessionStatus.Idle
  ) {
    return;
  }
  // Only a real play-through is worth resuming. Reading the answers, or
  // stepping through the questions without typing anything, leaves no promise
  // to keep, so nothing is saved and nothing is offered the next morning.
  if (!state.interactive) {
    return;
  }
  journal.saveSoon(() =>
    createAttempt(journal.quizKey, title, config, {
      index: state.index,
      status: state.status,
      responses: state.responses,
      startedAt: state.startedAt,
      endedAt: state.endedAt,
      report: state.report,
      savedAt: Date.now(),
    }),
  );
}

export class AttemptJournal {
  readonly #storage: StorageAdapter;
  readonly #quizKey: string;
  readonly #options: JournalOptions;
  #pending: (() => AttemptRecord) | null = null;
  #handle: unknown = null;
  #lastWritten = "";

  constructor(
    storage: StorageAdapter,
    quizKey: string,
    options: JournalOptions = {},
  ) {
    this.#storage = storage;
    this.#quizKey = quizKey;
    this.#options = options;
  }

  get quizKey(): string {
    return this.#quizKey;
  }

  /** Newest attempt that is neither finished nor a day old. */
  async resumable(): Promise<AttemptRecord | null> {
    const all = await this.history();
    const cutoff = Date.now() - ATTEMPT_MAX_AGE_MS;
    for (const entry of all) {
      if (entry.status === SessionStatus.Finished) {
        continue;
      }
      if (entry.savedAt < cutoff) {
        // Forget it, and take it out of storage while we are here.
        await this.#storage.remove(keyOf(this.#quizKey, entry.savedAt));
        continue;
      }
      return entry;
    }
    return null;
  }

  async latest(): Promise<AttemptRecord | null> {
    const all = await this.history();
    return all[0] ?? null;
  }

  async history(): Promise<AttemptRecord[]> {
    const keys = await this.#storage.keys();
    const mine = keys
      .filter((key) => key.startsWith(`${PREFIX}${this.#quizKey}:`))
      .sort()
      .reverse();
    const records: AttemptRecord[] = [];
    for (const key of mine) {
      const record = parse(await this.#storage.get(key));
      if (record !== null) {
        records.push(record);
      }
    }
    return records;
  }

  async save(record: AttemptRecord): Promise<boolean> {
    const key = keyOf(this.#quizKey, record.savedAt);
    const json = JSON.stringify(record);
    if (json === this.#lastWritten) {
      return true;
    }
    const written = await this.#storage.set(key, json);
    if (written) {
      this.#lastWritten = json;
      await this.#trim();
    }
    return written;
  }

  /**
   * Queue a write. The record is built at flush time, so typing ten letters
   * builds one record instead of ten. Without injected timers it writes now.
   */
  saveSoon(build: () => AttemptRecord): void {
    this.#pending = build;
    const timers = this.#options.timers;
    if (timers === undefined) {
      this.flush();
      return;
    }
    if (this.#handle !== null) {
      timers.cancel(this.#handle);
    }
    this.#handle = timers.schedule(() => {
      this.#handle = null;
      this.flush();
    }, this.#options.debounceMs ?? 300);
  }

  /** Write whatever is waiting. Called on finish, results and destroy. */
  flush(): void {
    const pending = this.#pending;
    this.#pending = null;
    if (pending === null) {
      return;
    }
    void this.save(pending());
  }

  async clear(): Promise<void> {
    const timers = this.#options.timers;
    if (this.#handle !== null && timers !== undefined) {
      timers.cancel(this.#handle);
    }
    this.#handle = null;
    this.#pending = null;
    this.#lastWritten = "";
    const keys = await this.#storage.keys();
    for (const key of keys) {
      if (key.startsWith(`${PREFIX}${this.#quizKey}:`)) {
        await this.#storage.remove(key);
      }
    }
  }

  async #trim(): Promise<void> {
    const all = await this.history();
    for (const stale of all.slice(HISTORY_LIMIT)) {
      if (stale === undefined) {
        continue;
      }
      await this.#storage.remove(keyOf(this.#quizKey, stale.savedAt));
    }
  }
}
