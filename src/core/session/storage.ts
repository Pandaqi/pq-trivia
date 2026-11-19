/**
 * Storage, as an interface. Core never touches `localStorage` or IndexedDB;
 * the browser adapters do. A memory adapter ships here so tests and the CLI
 * need nothing at all.
 */

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  /** `false` means the write failed: quota, private mode, blocked storage. */
  set(key: string, value: string): Promise<boolean>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export class MemoryStorage implements StorageAdapter {
  readonly #values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.#values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<boolean> {
    this.#values.set(key, value);
    return true;
  }

  async remove(key: string): Promise<void> {
    this.#values.delete(key);
  }

  async keys(): Promise<string[]> {
    return [...this.#values.keys()];
  }
}

/**
 * A wrapper that falls back to memory the first time a write fails. The quiz
 * keeps playing; the player says progress will not survive a reload.
 */
export class ResilientStorage implements StorageAdapter {
  readonly #primary: StorageAdapter;
  readonly #fallback = new MemoryStorage();
  #degraded = false;
  #onDegrade: (() => void) | undefined;

  constructor(primary: StorageAdapter, onDegrade?: () => void) {
    this.#primary = primary;
    this.#onDegrade = onDegrade;
  }

  get degraded(): boolean {
    return this.#degraded;
  }

  #degrade(): void {
    if (this.#degraded) {
      return;
    }
    this.#degraded = true;
    this.#onDegrade?.();
  }

  async get(key: string): Promise<string | null> {
    const value = await this.#primary.get(key).catch(() => null);
    if (value !== null) {
      return value;
    }
    return this.#fallback.get(key);
  }

  async set(key: string, value: string): Promise<boolean> {
    const written = await this.#primary.set(key, value).catch(() => false);
    if (written) {
      return true;
    }
    this.#degrade();
    return this.#fallback.set(key, value);
  }

  async remove(key: string): Promise<void> {
    await this.#primary.remove(key).catch(() => undefined);
    await this.#fallback.remove(key);
  }

  async keys(): Promise<string[]> {
    const primary = await this.#primary.keys().catch(() => [] as string[]);
    const fallback = await this.#fallback.keys();
    return [...new Set([...primary, ...fallback])].sort();
  }
}
