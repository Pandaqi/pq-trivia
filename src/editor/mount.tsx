/**
 * Mount the wizard. One call, one element, nothing global left behind.
 *
 * The wizard knows nothing about files or previews. It asks for four things
 * and a host page fills them in: save, open, pick media, preview. That keeps
 * this folder free of platform code.
 */

import { h, render } from "preact";
import type { EditorLayout } from "./layout";
import { createEditorStore, type EditorStore } from "./store";
import { EDITOR_CSS } from "./styles";
import { EditorApp } from "./ui/EditorApp";

export interface EditorFile {
  readonly name: string;
  readonly text: string;
}

export interface PickedMedia {
  /** File name, the way it goes into `Media =>`. */
  readonly name: string;
  /** True when the host copied it into `media/` already. */
  readonly copied: boolean;
}

/**
 * A slide, in the list's own words: `"round"`, `"question"`, and so on. A
 * string, not the enum, so a renderer can read this without importing the
 * wizard.
 */
export interface PreviewPlace {
  readonly kind: string;
  /** Block index in the text. -1 is the header. */
  readonly index: number;
  /** Line the block starts on, so the player can find the same question. */
  readonly line: number;
}

/** A mounted player: new text in, teardown out. */
export interface PreviewInstance {
  load(text: string): void;
  /** Follow the author to this slide. A host may leave this out. */
  show?(place: PreviewPlace): void;
  destroy(): void;
}

/** Start a live player against this text. */
export type PreviewHook = (text: string, host: HTMLElement) => PreviewInstance;

export interface EditorOptions {
  /** Starting text. Ignored when a store is passed. */
  readonly text?: string | undefined;
  readonly store?: EditorStore | undefined;
  readonly onSave?: ((name: string, text: string) => void) | undefined;
  readonly onOpen?: (() => Promise<EditorFile | null>) | undefined;
  readonly onOpenFolder?: (() => Promise<EditorFile | null>) | undefined;
  readonly onSaveToFolder?:
    ((name: string, text: string) => Promise<boolean>) | undefined;
  readonly onPickMedia?: (() => Promise<PickedMedia | null>) | undefined;
  /** Live player on the right. On when a preview hook exists. */
  readonly preview?: PreviewHook | undefined;
  /** Start with the preview pane open. Default true when a hook exists. */
  readonly previewOpen?: boolean | undefined;
  /** Panes and widths to open with. Wins over anything the last visit saved. */
  readonly layout?: EditorLayout | undefined;
  /** Keep the panes and widths for the next visit. Default true. */
  readonly rememberLayout?: boolean | undefined;
}

export interface MountedEditor {
  readonly store: EditorStore;
  /** The current text, for a host that wants to save it itself. */
  text(): string;
  destroy(): void;
}

const STYLE_ID = "pq-editor-style";

/**
 * The stylesheet is injected once per document and shared. Two wizards on one
 * page should not fight over it, so it stays after `destroy()`.
 */
function ensureStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID) !== null) {
    return;
  }
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = EDITOR_CSS;
  doc.head.append(style);
}

export function mountEditor(
  target: Element,
  options: EditorOptions = {},
): MountedEditor {
  const store = options.store ?? createEditorStore(options.text);
  const doc = target.ownerDocument;
  if (doc !== null) {
    ensureStyles(doc);
  }
  render(h(EditorApp, { store, options }), target);
  return {
    store,
    text: () => store.snapshot().text,
    destroy() {
      render(null, target);
      store.destroy();
    },
  };
}
