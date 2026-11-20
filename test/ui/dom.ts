/**
 * A browser for the renderer tests, without a browser.
 *
 * happy-dom gives us a real DOM and real events. axe-core reads that DOM and
 * tells us where the accessibility work is. Both are dev-only.
 *
 * One window per suite, torn down after. Copying globals by hand beats a third
 * package that does the same thing.
 */

import { Window } from "happy-dom";

const GLOBALS = [
  "window",
  "document",
  "navigator",
  "location",
  "history",
  "localStorage",
  "sessionStorage",
  "customElements",
  "CustomEvent",
  "Event",
  "KeyboardEvent",
  "MouseEvent",
  "FocusEvent",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLButtonElement",
  "HTMLSelectElement",
  "HTMLTextAreaElement",
  "HTMLMediaElement",
  "HTMLAnchorElement",
  "HTMLImageElement",
  "Element",
  "Node",
  "DocumentFragment",
  "SVGElement",
  "MutationObserver",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "matchMedia",
] as const;

/** Methods that only work with their own window as `this`. */
const BOUND = new Set([
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "matchMedia",
]);

export interface TestDom {
  readonly window: Window;
  readonly document: Document;
  uninstall: () => void;
}

export function installDom(): TestDom {
  const window = new Window({ url: "http://localhost/" });
  const source = window as unknown as Record<string, unknown>;
  const target = globalThis as unknown as Record<string, unknown>;
  for (const name of GLOBALS) {
    const value = source[name];
    target[name] =
      BOUND.has(name) && typeof value === "function"
        ? value.bind(window)
        : value;
  }
  return {
    window,
    document: window.document as unknown as Document,
    uninstall() {
      for (const name of GLOBALS) {
        delete target[name];
      }
      void window.close();
    },
  };
}
