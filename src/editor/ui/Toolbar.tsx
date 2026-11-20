/** The wizard's top bar: the quiz name, then one button per job. */

import type { JSX } from "preact";
import { valuesFor, addSlide, setFieldValue, SlideTemplate } from "../commands";
import { HEADER_INDEX } from "../slides";
import type { EditorSnapshot, EditorStore } from "../store";
import { STARTER_TEXT } from "../store";
import type { EditorFile, EditorOptions } from "../mount";
import { DraftText, FieldShell } from "./Field";

export interface ToolbarProps {
  readonly store: EditorStore;
  readonly snapshot: EditorSnapshot;
  readonly options: EditorOptions;
  readonly previewOpen: boolean;
  readonly onTogglePreview: () => void;
}

export function Toolbar({
  store,
  snapshot,
  options,
  previewOpen,
  onTogglePreview,
}: ToolbarProps): JSX.Element {
  const title =
    valuesFor(snapshot, HEADER_INDEX, "Title")[0] ??
    valuesFor(snapshot, HEADER_INDEX, "Quiz")[0] ??
    "";

  const open = (
    reader: (() => Promise<EditorFile | null>) | undefined,
  ): void => {
    if (reader === undefined) {
      return;
    }
    void reader().then((file) => {
      if (file === null) {
        return;
      }
      store.reset(file.text);
      store.say(`Opened ${file.name}.`);
    });
  };

  const save = (): void => {
    options.onSave?.(title, snapshot.text);
    store.say("Saved. One .trivia file, nothing else.");
  };

  const saveToFolder = (): void => {
    const writer = options.onSaveToFolder;
    if (writer === undefined) {
      return;
    }
    void writer(title, snapshot.text).then((ok) => {
      store.say(
        ok
          ? "Written to the open folder."
          : "No folder open. Use Save instead.",
      );
    });
  };

  return (
    <div class="pq-editor-bar">
      <FieldShell id="pq-editor-title" label="Quiz title">
        <DraftText
          id="pq-editor-title"
          value={title}
          placeholder="Untitled quiz"
          onCommit={(value) =>
            setFieldValue(store, HEADER_INDEX, "Title", value)
          }
        />
      </FieldShell>

      <div class="pq-editor-bar-group">
        <button
          type="button"
          onClick={() => store.undo()}
          disabled={!snapshot.canUndo}
          aria-label="Undo"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => store.redo()}
          disabled={!snapshot.canRedo}
          aria-label="Redo"
        >
          Redo
        </button>
      </div>

      <div class="pq-editor-bar-group">
        <button
          type="button"
          onClick={() => addSlide(store, SlideTemplate.Question)}
        >
          Add question
        </button>
        <button
          type="button"
          onClick={() => addSlide(store, SlideTemplate.Round)}
        >
          Add round
        </button>
      </div>

      <div class="pq-editor-bar-group">
        <button type="button" onClick={() => store.update(STARTER_TEXT, 0)}>
          New
        </button>
        {options.onOpen === undefined ? null : (
          <button type="button" onClick={() => open(options.onOpen)}>
            Open file
          </button>
        )}
        {options.onOpenFolder === undefined ? null : (
          <button type="button" onClick={() => open(options.onOpenFolder)}>
            Open folder
          </button>
        )}
        {options.onSave === undefined ? null : (
          <button type="button" onClick={save}>
            Save
          </button>
        )}
        {options.onSaveToFolder === undefined ? null : (
          <button type="button" onClick={saveToFolder}>
            Save to folder
          </button>
        )}
      </div>

      {options.preview === undefined ? null : (
        <div class="pq-editor-bar-group">
          <button
            type="button"
            onClick={onTogglePreview}
            aria-pressed={previewOpen}
          >
            Preview
          </button>
        </div>
      )}
    </div>
  );
}
