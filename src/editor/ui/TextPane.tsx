/**
 * Trivia Syntax, on the right, where it started.
 *
 * The slide tab edits one block. The file tab edits everything. Blur or Apply
 * reparses, so a hand edit and a form edit are the same kind of edit.
 */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { setSlideText, setWholeText } from "../commands";
import { HEADER_INDEX } from "../slides";
import type { EditorSnapshot, EditorStore } from "../store";
import { blockTextAt, headerText } from "../text";

export enum TextTab {
  Slide = "slide",
  File = "file",
}

export interface TextPaneProps {
  readonly store: EditorStore;
  readonly snapshot: EditorSnapshot;
}

const CODE_ID = "pq-editor-syntax";
const ROWS = 20;

export function TextPane({ store, snapshot }: TextPaneProps): JSX.Element {
  const [tab, setTab] = useState(TextTab.Slide);
  const source = sourceFor(snapshot, tab);
  const [draft, setDraft] = useState(source);

  useEffect(() => {
    setDraft(source);
  }, [source]);

  const commit = (): void => {
    if (draft === source) {
      return;
    }
    if (tab === TextTab.File) {
      setWholeText(store, draft);
      return;
    }
    setSlideText(store, snapshot.selected, draft);
  };

  return (
    <section class="pq-editor-panel" aria-label="Trivia Syntax">
      <h2>Trivia Syntax</h2>
      <div class="pq-editor-tabs" role="tablist" aria-label="Text scope">
        <button
          type="button"
          role="tab"
          aria-selected={tab === TextTab.Slide}
          onClick={() => setTab(TextTab.Slide)}
        >
          This slide
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === TextTab.File}
          onClick={() => setTab(TextTab.File)}
        >
          Whole file
        </button>
      </div>

      <label class="pq-editor-label" for={CODE_ID}>
        {tab === TextTab.File
          ? "Every block, as written"
          : "This block, as written"}
      </label>
      <textarea
        id={CODE_ID}
        class="pq-editor-code"
        rows={ROWS}
        spellcheck={false}
        value={draft}
        onInput={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
      />

      <div class="pq-editor-actions">
        <button type="button" onClick={commit}>
          Apply
        </button>
        <button type="button" onClick={() => setDraft(source)}>
          Reset
        </button>
      </div>
      <p class="pq-editor-hint">
        Edits land on blur or Apply. The rest of the wizard is rebuilt from this
        text, so the text always wins.
      </p>
    </section>
  );
}

function sourceFor(snapshot: EditorSnapshot, tab: TextTab): string {
  if (tab === TextTab.File) {
    return snapshot.text;
  }
  if (snapshot.selected === HEADER_INDEX) {
    return headerText(snapshot.text, snapshot.doc);
  }
  return blockTextAt(snapshot.text, snapshot.doc, snapshot.selected);
}
