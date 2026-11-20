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
import { useEditorT } from "./i18n";
import { NoteHead } from "./NoteHead";

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
  const t = useEditorT();
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
    <section class="pq-editor-panel" aria-label={t("editorSyntax")}>
      <NoteHead label={t("editorSyntax")} note={t("editorSyntaxNote")} />
      <div
        class="pq-editor-tabs"
        role="tablist"
        aria-label={t("editorTextScope")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === TextTab.Slide}
          onClick={() => setTab(TextTab.Slide)}
        >
          {t("editorThisSlide")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === TextTab.File}
          onClick={() => setTab(TextTab.File)}
        >
          {t("editorWholeFile")}
        </button>
      </div>

      <label class="pq-editor-label" for={CODE_ID}>
        {tab === TextTab.File ? t("editorAllBlocks") : t("editorThisBlock")}
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
          {t("editorApply")}
        </button>
        <button type="button" onClick={() => setDraft(source)}>
          {t("editorReset")}
        </button>
      </div>
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
