/**
 * Key bindings chosen in Settings. One browser, one set, like colour mode.
 *
 * Only written when `allowHotkeyMapping` is on. The panel merges this over the
 * quiz's own `hotkeys`, so a saved choice survives a reload without touching
 * the source file.
 */

const STORAGE_KEY = "pq-hotkeys";

/** Action name to its keys. `[]` means the action deliberately has no key. */
export type StoredHotkeys = Readonly<Record<string, readonly string[]>>;

function keyList(value: unknown): readonly string[] | null {
  if (typeof value === "string") {
    return value.length === 0 ? null : [value];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const keys = value.filter(
    (key): key is string => typeof key === "string" && key.length > 0,
  );
  return keys.length === value.length ? keys : null;
}

function parse(raw: string | null): StoredHotkeys {
  if (raw === null) {
    return {};
  }
  try {
    const data = JSON.parse(raw) as unknown;
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      return {};
    }
    const out: Record<string, readonly string[]> = {};
    for (const [action, value] of Object.entries(data)) {
      const keys = keyList(value);
      if (keys !== null) {
        out[action] = keys;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function storedHotkeys(): StoredHotkeys {
  try {
    if (typeof localStorage === "undefined") {
      return {};
    }
    return parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}

export function setStoredHotkeys(bindings: StoredHotkeys): void {
  try {
    if (typeof localStorage === "undefined") {
      return;
    }
    if (Object.keys(bindings).length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // Private mode, quota, a locked-down browser. The keys still work now.
  }
}

export function clearStoredHotkeys(): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Nothing to clean up.
  }
}
