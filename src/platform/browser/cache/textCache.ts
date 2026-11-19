/**
 * A small text cache with an IndexedDB home and a memory fallback.
 *
 * Two rules: the cache never breaks the quiz, and it never grows forever. LRU
 * by `storedAt`, a byte budget, and an eviction pass when the browser says the
 * quota is full.
 */

export interface TextEntry {
  readonly key: string;
  readonly text: string;
  readonly etag: string | null;
  readonly storedAt: number;
}

export interface TextCache {
  get(key: string): Promise<TextEntry | null>;
  set(entry: TextEntry): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export const DEFAULT_CACHE_BYTES = 200 * 1024 * 1024;
const DB_NAME = "pq-trivia";
const STORE = "text";
const DB_VERSION = 1;

function bytesOf(entry: TextEntry): number {
  return entry.text.length * 2 + entry.key.length * 2 + 64;
}

function isQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const record = error as { name?: unknown; code?: unknown };
  return (
    record.name === "QuotaExceededError" ||
    record.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    record.code === 22 ||
    record.code === 1014
  );
}

/** LRU in insertion order: a hit moves the entry to the end. */
export function memoryTextCache(
  maxBytes: number = DEFAULT_CACHE_BYTES,
): TextCache {
  const entries = new Map<string, TextEntry>();
  let total = 0;

  function remove(key: string): void {
    const entry = entries.get(key);
    if (entry === undefined) {
      return;
    }
    entries.delete(key);
    total -= bytesOf(entry);
  }

  function trim(): void {
    for (const key of entries.keys()) {
      if (total <= maxBytes) {
        return;
      }
      remove(key);
    }
  }

  return {
    async get(key) {
      const entry = entries.get(key);
      if (entry === undefined) {
        return null;
      }
      entries.delete(key);
      entries.set(key, entry);
      return entry;
    },
    async set(entry) {
      remove(entry.key);
      entries.set(entry.key, entry);
      total += bytesOf(entry);
      trim();
    },
    async delete(key) {
      remove(key);
    },
    async clear() {
      entries.clear();
      total = 0;
    },
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB refused to open."));
  });
}

function readAll(database: IDBDatabase): Promise<TextEntry[]> {
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(STORE, "readonly")
      .objectStore(STORE)
      .getAll();
    request.onsuccess = () => resolve(request.result as TextEntry[]);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB read failed."));
  });
}

function readOne(
  database: IDBDatabase,
  key: string,
): Promise<TextEntry | null> {
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(STORE, "readonly")
      .objectStore(STORE)
      .get(key);
    request.onsuccess = () =>
      resolve((request.result as TextEntry | undefined) ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB read failed."));
  });
}

function writeOne(
  database: IDBDatabase,
  entry: TextEntry | null,
  key: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    if (entry === null) {
      store.delete(key);
    } else {
      store.put(entry);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB write failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB write aborted."));
  });
}

/** Oldest first, until the budget fits. */
async function trim(database: IDBDatabase, maxBytes: number): Promise<void> {
  const entries = await readAll(database);
  let total = entries.reduce((sum, entry) => sum + bytesOf(entry), 0);
  if (total <= maxBytes) {
    return;
  }
  const oldest = entries.sort((a, b) => a.storedAt - b.storedAt);
  for (const entry of oldest) {
    if (total <= maxBytes) {
      return;
    }
    await writeOne(database, null, entry.key);
    total -= bytesOf(entry);
  }
}

/**
 * IndexedDB when the browser allows it, memory when it does not. A private
 * window with no storage still plays the quiz; it just forgets it afterwards.
 */
export function browserTextCache(
  maxBytes: number = DEFAULT_CACHE_BYTES,
): TextCache {
  const memory = memoryTextCache(Math.min(maxBytes, 8 * 1024 * 1024));
  let opening: Promise<IDBDatabase> | null = null;
  let unusable = typeof indexedDB === "undefined";

  function database(): Promise<IDBDatabase> {
    opening ??= openDatabase();
    return opening;
  }

  return {
    async get(key) {
      if (unusable) {
        return memory.get(key);
      }
      try {
        return await readOne(await database(), key);
      } catch {
        unusable = true;
        return memory.get(key);
      }
    },
    async set(entry) {
      await memory.set(entry);
      if (unusable) {
        return;
      }
      try {
        const db = await database();
        await writeOne(db, entry, entry.key);
        await trim(db, maxBytes);
      } catch (error) {
        if (!isQuotaError(error)) {
          unusable = true;
          return;
        }
        // Full. Drop half, try once more. Then give up quietly.
        try {
          const db = await database();
          await trim(db, Math.floor(maxBytes / 2));
          await writeOne(db, entry, entry.key);
        } catch {
          unusable = true;
        }
      }
    },
    async delete(key) {
      await memory.delete(key);
      if (unusable) {
        return;
      }
      try {
        await writeOne(await database(), null, key);
      } catch {
        unusable = true;
      }
    },
    async clear() {
      await memory.clear();
      if (unusable) {
        return;
      }
      try {
        const db = await database();
        await new Promise<void>((resolve, reject) => {
          const request = db
            .transaction(STORE, "readwrite")
            .objectStore(STORE)
            .clear();
          request.onsuccess = () => resolve();
          request.onerror = () =>
            reject(request.error ?? new Error("IndexedDB clear failed."));
        });
      } catch {
        unusable = true;
      }
    },
  };
}
