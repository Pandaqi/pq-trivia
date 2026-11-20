/**
 * The buffer, its history and who is looking at it.
 *
 * Small on purpose: a string, the parse of that string, a selection and two
 * stacks of strings. Undo is a text snapshot because text is small and a model
 * diff is not.
 */

import { HEADER_INDEX, listSlides, type SlideInfo } from "./slides";
import { readText, type EditorDoc } from "./text";

export const STARTER_TEXT = `# Untitled quiz

## Round one

### What do you call a group of flamingos?

Type => Choice
Answers => A flamboyance | A flock | A wiggle
Correct => A flamboyance
`;

const MAX_HISTORY = 100;

export interface EditorSnapshot {
  readonly text: string;
  readonly doc: EditorDoc;
  readonly slides: readonly SlideInfo[];
  /** -1 for the header, otherwise the block index. */
  readonly selected: number;
  /** Last thing the wizard said back to the author. */
  readonly note: string | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export class EditorStore {
  private text: string;
  private doc: EditorDoc;
  private slides: readonly SlideInfo[];
  private selected: number;
  private note: string | null = null;
  private past: string[] = [];
  private future: string[] = [];
  private cached: EditorSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(text: string = STARTER_TEXT) {
    this.text = text;
    this.doc = readText(text);
    this.slides = listSlides(this.doc);
    this.selected = this.doc.blocks.length > 0 ? 0 : HEADER_INDEX;
    this.cached = this.build();
  }

  private build(): EditorSnapshot {
    return {
      text: this.text,
      doc: this.doc,
      slides: this.slides,
      selected: this.selected,
      note: this.note,
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
    };
  }

  snapshot(): EditorSnapshot {
    return this.cached;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.cached = this.build();
    for (const listener of [...this.listeners]) {
      listener();
    }
  }

  private refresh(text: string, select?: number): void {
    this.text = text;
    this.doc = readText(text);
    this.slides = listSlides(this.doc);
    const wanted = select ?? this.selected;
    const last = this.doc.blocks.length - 1;
    this.selected = Math.min(Math.max(wanted, HEADER_INDEX), last);
  }

  /** One edit. Same text means no entry in the undo stack. */
  update(text: string, select?: number): void {
    if (text === this.text) {
      if (select !== undefined && select !== this.selected) {
        this.selected = select;
        this.notify();
      }
      return;
    }
    this.past.push(this.text);
    if (this.past.length > MAX_HISTORY) {
      this.past.shift();
    }
    this.future = [];
    this.refresh(text, select);
    this.notify();
  }

  select(index: number): void {
    const last = this.doc.blocks.length - 1;
    const next = Math.min(Math.max(index, HEADER_INDEX), last);
    if (next === this.selected) {
      return;
    }
    this.selected = next;
    this.notify();
  }

  say(note: string | null): void {
    this.note = note;
    this.notify();
  }

  /** Replace everything, for `Open` and `New`. Undo still works. */
  reset(text: string): void {
    this.past = [];
    this.future = [];
    this.selected = 0;
    this.refresh(text, 0);
    this.say(null);
  }

  undo(): void {
    const previous = this.past.pop();
    if (previous === undefined) {
      return;
    }
    this.future.push(this.text);
    this.refresh(previous);
    this.notify();
  }

  redo(): void {
    const next = this.future.pop();
    if (next === undefined) {
      return;
    }
    this.past.push(this.text);
    this.refresh(next);
    this.notify();
  }

  destroy(): void {
    this.listeners.clear();
    this.past = [];
    this.future = [];
  }
}

export function createEditorStore(text?: string): EditorStore {
  return new EditorStore(text);
}

export { HEADER_INDEX };
