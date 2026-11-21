/**
 * The interface language picked in Settings. One key in localStorage, like the
 * theme mode and the layout. `null` means "never chosen"; an empty string means
 * "follow the quiz", which is a choice too and must survive a reload.
 */

const STORAGE_KEY = "pq-ui-language";
/** A real language code is never this, so it can mean "no override". */
const FOLLOW_QUIZ = "auto";

export function setStoredUiLanguage(code: string | null): void {
  try {
    if (typeof localStorage === "undefined") {
      return;
    }
    if (code === null || code.trim().length === 0) {
      localStorage.setItem(STORAGE_KEY, FOLLOW_QUIZ);
    } else {
      localStorage.setItem(STORAGE_KEY, code.trim());
    }
  } catch {
    // Private mode, quota, a locked-down browser. The screen still changed.
  }
}

/** `null` when nothing was saved, `""` for "same as quiz". */
export function storedUiLanguage(): string | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === null) {
      return null;
    }
    return value === FOLLOW_QUIZ ? "" : value;
  } catch {
    return null;
  }
}
