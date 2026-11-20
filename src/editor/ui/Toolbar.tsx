/**
 * The wizard's top bar.
 *
 * Four small groups: the quiz name, history, adding slides, and file work.
 * Save is the one filled button, because it is the one that keeps your work.
 */

import type { ComponentChildren, JSX } from "preact";
import { useRef } from "preact/hooks";
import { addSlide, setFieldValue, SlideTemplate, valuesFor } from "../commands";
import { EditorPane, paneLabel, PANE_ORDER } from "../layout";
import type { EditorFile, EditorOptions } from "../mount";
import { HEADER_INDEX } from "../slides";
import type { EditorSnapshot, EditorStore } from "../store";
import { STARTER_TEXT } from "../store";
import { DraftText, FieldShell } from "./Field";
import { useEditorT } from "./i18n";

export interface ToolbarProps {
  readonly store: EditorStore;
  readonly snapshot: EditorSnapshot;
  readonly options: EditorOptions;
  readonly panes: readonly EditorPane[];
  readonly hasPreview: boolean;
  readonly onTogglePane: (pane: EditorPane) => void;
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

/** File work: new, open, open a folder, write back. Hidden when none is set. */
function FileMenu({
  store,
  options,
  title,
  text,
}: {
  readonly store: EditorStore;
  readonly options: EditorOptions;
  readonly title: string;
  readonly text: string;
}): JSX.Element | null {
  const t = useEditorT();
  const hasFileActions =
    options.onOpen !== undefined ||
    options.onOpenFolder !== undefined ||
    options.onSaveToFolder !== undefined;
  if (!hasFileActions) {
    return null;
  }

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
      store.say(t("editorOpened", { name: file.name }));
    });
  };

  const saveToFolder = (): void => {
    void options.onSaveToFolder?.(title, text).then((ok) => {
      store.say(ok ? t("editorWritten") : t("editorNoFolder"));
    });
  };

  return (
    <Menu label={t("editorFile")}>
      <button type="button" onClick={() => store.update(STARTER_TEXT, 0)}>
        {t("editorNewQuiz")}
      </button>
      {options.onOpen === undefined ? null : (
        <button type="button" onClick={() => open(options.onOpen)}>
          {t("editorOpenFile")}
        </button>
      )}
      {options.onOpenFolder === undefined ? null : (
        <button type="button" onClick={() => open(options.onOpenFolder)}>
          {t("editorOpenFolder")}
        </button>
      )}
      {options.onSaveToFolder === undefined ? null : (
        <button type="button" onClick={saveToFolder}>
          {t("editorSaveFolder")}
        </button>
      )}
    </Menu>
  );
}

export function Toolbar({
  store,
  snapshot,
  options,
  panes,
  hasPreview,
  onTogglePane,
}: ToolbarProps): JSX.Element {
  const t = useEditorT();
  const title =
    valuesFor(snapshot, HEADER_INDEX, "Title")[0] ??
    valuesFor(snapshot, HEADER_INDEX, "Quiz")[0] ??
    "";

  const save = (): void => {
    options.onSave?.(title, snapshot.text);
    store.say(t("editorSaved"));
  };

  return (
    <div class="pq-editor-bar">
      <div class="pq-editor-bar-name">
        <FieldShell id={TITLE_ID} label={t("editorQuizTitle")}>
          <DraftText
            id={TITLE_ID}
            value={title}
            placeholder={t("editorUntitled")}
            onCommit={(value) =>
              setFieldValue(store, HEADER_INDEX, "Title", value)
            }
          />
        </FieldShell>
      </div>

      <div class="pq-editor-groups">
        <div class="pq-editor-group" role="group" aria-label={t("editorPanes")}>
          {PANE_ORDER.map((pane) => {
            const on = panes.includes(pane);
            const unavailable = pane === EditorPane.Preview && !hasPreview;
            return (
              <button
                key={pane}
                type="button"
                class="pq-editor-pane-toggle"
                aria-pressed={on}
                disabled={unavailable}
                title={
                  unavailable
                    ? t("editorNoPreview")
                    : t("editorTogglePane", { pane: paneLabel(t, pane) })
                }
                onClick={() => onTogglePane(pane)}
              >
                {paneLabel(t, pane)}
              </button>
            );
          })}
        </div>

        <div
          class="pq-editor-group"
          role="group"
          aria-label={t("editorHistory")}
        >
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => store.undo()}
            disabled={!snapshot.canUndo}
            title={t("editorShortcutUndo")}
          >
            {t("editorUndo")}
          </button>
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => store.redo()}
            disabled={!snapshot.canRedo}
            title={t("editorShortcutRedo")}
          >
            {t("editorRedo")}
          </button>
        </div>

        <div
          class="pq-editor-group"
          role="group"
          aria-label={t("editorAddSlide")}
        >
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => addSlide(store, SlideTemplate.Question)}
            title={t("editorInsertAfter")}
          >
            {t("editorAddQuestion")}
          </button>
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => addSlide(store, SlideTemplate.Round)}
            title={t("editorInsertAfter")}
          >
            {t("editorAddRound")}
          </button>
        </div>

        <div class="pq-editor-group" role="group" aria-label={t("editorFile")}>
          <FileMenu
            store={store}
            options={options}
            title={title}
            text={snapshot.text}
          />
          {options.onSave === undefined ? null : (
            <button
              type="button"
              class="pq-editor-primary"
              onClick={save}
              title={t("editorSaveTitle")}
            >
              {t("editorSave")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
