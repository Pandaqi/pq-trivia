/**
 * Light, dark, high contrast. One attribute on `<html>`, CSS does the rest.
 *
 * The author sets a default with `themeMode` or `ThemeMode => dark`. A reader
 * who flips the switch keeps their choice across reloads.
 */

import { ThemeMode } from "../../core/quiz/types";

const STORAGE_KEY = "pq-theme-mode";
const MODES: ReadonlySet<string> = new Set(Object.values(ThemeMode));

export function isThemeMode(value: string): value is ThemeMode {
  return MODES.has(value);
}

/** `auto` removes the attribute, so `prefers-color-scheme` wins again. */
export function applyThemeMode(
  mode: ThemeMode | undefined,
  doc: Document = document,
): void {
  const element = doc.documentElement;
  if (mode === undefined || mode === ThemeMode.Auto) {
    element.removeAttribute("data-pq-mode");
    return;
  }
  element.dataset["pqMode"] = mode;
}

/** A choice made in the settings panel. Survives a reload. */
export function setThemeMode(mode: ThemeMode): void {
  applyThemeMode(mode);
  try {
    if (typeof localStorage === "undefined") {
      return;
    }
    if (mode === ThemeMode.Auto) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  } catch {
    // Private mode, quota, a locked-down browser. The screen still changed.
  }
}

export function storedThemeMode(): ThemeMode | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    const value = localStorage.getItem(STORAGE_KEY);
    return value !== null && isThemeMode(value) ? value : null;
  } catch {
    return null;
  }
}
