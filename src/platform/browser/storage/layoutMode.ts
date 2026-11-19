/**
 * Viewport or inline. One key in localStorage, read by the view on every
 * render. The author sets a default with `layoutMode` or `LayoutMode =>`.
 */

import type { LayoutMode } from "../../../core/quiz/types";

const STORAGE_KEY = "pq-layout-mode";
const MODES: ReadonlySet<string> = new Set(["viewport", "inline"]);

export function isLayoutMode(value: string): value is LayoutMode {
  return MODES.has(value);
}

/** A choice made in the settings panel. Survives a reload. */
export function setLayoutMode(mode: LayoutMode): void {
  try {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private mode, quota, a locked-down browser. The screen still changed.
  }
}

export function storedLayoutMode(): LayoutMode | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    const value = localStorage.getItem(STORAGE_KEY);
    return value !== null && isLayoutMode(value) ? value : null;
  } catch {
    return null;
  }
}
