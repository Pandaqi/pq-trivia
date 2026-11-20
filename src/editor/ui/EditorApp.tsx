/** Three panes and a status line. The whole wizard, in one place. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { EditorOptions } from "../mount";
import type { EditorStore } from "../store";
import { FormPane } from "./FormPane";
import { PreviewPane } from "./PreviewPane";
import { SlideList } from "./SlideList";
import { TextPane } from "./TextPane";
import { Toolbar } from "./Toolbar";
import { useEditor } from "./useStore";

export interface EditorAppProps {
  readonly store: EditorStore;
  readonly options: EditorOptions;
}

export function EditorApp({ store, options }: EditorAppProps): JSX.Element {
  const snapshot = useEditor(store);
  const [previewOpen, setPreviewOpen] = useState(options.preview !== undefined);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        store.undo();
        return;
      }
      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        store.redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [store]);

  const problems = snapshot.slides.reduce(
    (total, slide) => total + slide.problems.length,
    0,
  );

  return (
    <div class="pq-editor">
      <Toolbar
        store={store}
        snapshot={snapshot}
        options={options}
        previewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen(!previewOpen)}
      />

      <div class="pq-editor-grid" data-pq-preview={previewOpen ? "on" : "off"}>
        <SlideList store={store} snapshot={snapshot} />
        <FormPane store={store} snapshot={snapshot} options={options} />
        <TextPane store={store} snapshot={snapshot} />
        {previewOpen && options.preview !== undefined ? (
          <PreviewPane text={snapshot.text} preview={options.preview} />
        ) : null}
      </div>

      <div class="pq-editor-status" role="status" aria-live="polite">
        <span>
          {problems === 1 ? "1 problem" : `${problems} problems`} in this file.
        </span>
        <span>{snapshot.note ?? "Autosaved nowhere. Use Save."}</span>
      </div>
    </div>
  );
}
