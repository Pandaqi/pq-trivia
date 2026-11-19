/**
 * Browser storage. `localStorage` first, memory when the browser says no.
 *
 * Private mode, a full disk and a blocked cookie jar all end up here. The quiz
 * keeps working; the player just cannot promise a resume.
 */

import { AttemptJournal, type TimerApi } from "../../../core/session/attempts";
import {
  MemoryStorage,
  ResilientStorage,
  type StorageAdapter,
} from "../../../core/session/storage";

const PREFIX = "pq:v1:";

class LocalStorage implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<boolean> {
    try {
      localStorage.setItem(PREFIX + key, value);
      return true;
    } catch {
      return false;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      // Nothing to clean up if we could never write.
    }
  }

  async keys(): Promise<string[]> {
    try {
      const out: string[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key !== null && key.startsWith(PREFIX)) {
          out.push(key.slice(PREFIX.length));
        }
      }
      return out;
    } catch {
      return [];
    }
  }
}

function storageAvailable(): boolean {
  try {
    const probe = `${PREFIX}probe`;
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** No storage at all is still a working quiz. It just forgets. */
export function createBrowserStorage(): StorageAdapter {
  return storageAvailable()
    ? new ResilientStorage(new LocalStorage())
    : new MemoryStorage();
}

/** 300ms, the roadmap's number. Typing saves once, not once per key. */
const TIMERS: TimerApi = {
  schedule: (callback, ms) => setTimeout(callback, ms),
  cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createBrowserJournal(
  quizKey: string,
  onDegrade?: () => void,
): AttemptJournal {
  const base = storageAvailable() ? new LocalStorage() : new MemoryStorage();
  return new AttemptJournal(new ResilientStorage(base, onDegrade), quizKey, {
    debounceMs: 300,
    timers: TIMERS,
  });
}
