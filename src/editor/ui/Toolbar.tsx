/**
 * The wizard's top bar.
 *
 * Four small groups: the quiz name, history, adding slides, and file work.
 * Save is the one filled button, because it is the one that keeps your work.
 */

import type { ComponentChildren, JSX } from "preact";
import { useRef } from "preact/hooks";
import { addSlide, setFieldValue, SlideTemplate, valuesFor } from "../commands";
import type { EditorFile, EditorOptions } from "../mount";
import { HEADER_INDEX } from "../slides";
import type { EditorSnapshot, EditorStore } from "../store";
import { STARTER_TEXT } from "../store";
import { DraftText, FieldShell } from "./Field";

export interface ToolbarProps {
  readonly store: EditorStore;
  readonly snapshot: EditorSnapshot;
  readonly options: EditorOptions;
  readonly previewOpen: boolean;
  readonly onTogglePreview: () => void;
}

const TITLE_ID = "pq-editor-title";

/** A small drop-down. A menu, not a modal: one click in, one click out. */
function Menu({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ComponentChildren;
}): JSX.Element {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details class="pq-editor-menu" ref={ref}>
      <summary class="pq-editor-button">{label}</summary>
      <div
        class="pq-editor-menu-list"
        onClick={() => {
          if (ref.current !== null) {
            ref.current.open = false;
          }
        }}
      >
        {children}
      </div>
    </details>
  );
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
    void options.onSaveToFolder?.(title, snapshot.text).then((ok) => {
      store.say(
        ok
          ? "Written to the open folder."
          : "No folder open. Use Save instead.",
      );
    });
  };

  const hasFileActions =
    options.onOpen !== undefined ||
    options.onOpenFolder !== undefined ||
    options.onSaveToFolder !== undefined;

  return (
    <div class="pq-editor-bar">
      <div class="pq-editor-bar-name">
        <FieldShell id={TITLE_ID} label="Quiz title">
          <DraftText
            id={TITLE_ID}
            value={title}
            placeholder="Untitled quiz"
            onCommit={(value) =>
              setFieldValue(store, HEADER_INDEX, "Title", value)
            }
          />
        </FieldShell>
      </div>

      <div class="pq-editor-groups">
        <div class="pq-editor-group" role="group" aria-label="History">
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => store.undo()}
            disabled={!snapshot.canUndo}
            title="Ctrl+Z"
          >
            Undo
          </button>
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => store.redo()}
            disabled={!snapshot.canRedo}
            title="Ctrl+Shift+Z"
          >
            Redo
          </button>
        </div>

        <div class="pq-editor-group" role="group" aria-label="Add a slide">
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => addSlide(store, SlideTemplate.Question)}
            title="Insert after the selected slide"
          >
            + Question
          </button>
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => addSlide(store, SlideTemplate.Round)}
            title="Insert after the selected slide"
          >
            + Round
          </button>
        </div>

        <div class="pq-editor-group" role="group" aria-label="File">
          {hasFileActions ? (
            <Menu label="File">
              <button
                type="button"
                onClick={() => store.update(STARTER_TEXT, 0)}
              >
                New quiz
              </button>
              {options.onOpen === undefined ? null : (
                <button type="button" onClick={() => open(options.onOpen)}>
                  Open file…
                </button>
              )}
              {options.onOpenFolder === undefined ? null : (
                <button
                  type="button"
                  onClick={() => open(options.onOpenFolder)}
                >
                  Open folder…
                </button>
              )}
              {options.onSaveToFolder === undefined ? null : (
                <button type="button" onClick={saveToFolder}>
                  Save to folder…
                </button>
              )}
            </Menu>
          ) : null}
          {options.onSave === undefined ? null : (
            <button
              type="button"
              class="pq-editor-primary"
              onClick={save}
              title="Download this quiz as a .trivia file"
            >
              Save
            </button>
          )}
        </div>

        {options.preview === undefined ? null : (
          <div class="pq-editor-group" role="group" aria-label="View">
            <button
              type="button"
              class="pq-editor-button"
              onClick={onTogglePreview}
              aria-pressed={previewOpen}
              title="Show the real player beside the editor"
            >
              Preview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
