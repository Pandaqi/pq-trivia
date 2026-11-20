/** The wizard: a row of panes you can turn on, turn off and widen. */

import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import {
  columnTemplate,
  dragPair,
  EditorPane,
  paneLabel,
  startLayout,
  togglePane,
  writeLayout,
  type EditorLayout,
} from "../layout";
import type { EditorOptions, PreviewPlace } from "../mount";
import type { Translate } from "../../i18n/types";
import {
  diagnosticMessage,
  diagnosticSuggestion,
} from "../../i18n/diagnostics";
import type { EditorSnapshot, EditorStore } from "../store";
import { FormPane } from "./FormPane";
import { PreviewPane } from "./PreviewPane";
import { SlideList } from "./SlideList";
import { TextPane } from "./TextPane";
import { Toolbar } from "./Toolbar";
import { useEditorT } from "./i18n";
import { useEditor } from "./useStore";

export interface EditorAppProps {
  readonly store: EditorStore;
  readonly options: EditorOptions;
}

interface PaneProps {
  readonly store: EditorStore;
  readonly snapshot: EditorSnapshot;
  readonly options: EditorOptions;
  readonly onSelect: (index: number) => void;
  /** The slide in the list, for the preview to follow. */
  readonly place: PreviewPlace | null;
}

function paneBody(pane: EditorPane, props: PaneProps): JSX.Element | null {
  switch (pane) {
    case EditorPane.Slides:
      return (
        <SlideList
          store={props.store}
          snapshot={props.snapshot}
          onSelect={props.onSelect}
        />
      );
    case EditorPane.Form:
      return (
        <FormPane
          store={props.store}
          snapshot={props.snapshot}
          options={props.options}
        />
      );
    case EditorPane.Syntax:
      return <TextPane store={props.store} snapshot={props.snapshot} />;
    case EditorPane.Preview:
      return props.options.preview === undefined ? null : (
        <PreviewPane
          text={props.snapshot.text}
          preview={props.options.preview}
          place={props.place}
        />
      );
  }
}

export function EditorApp({ store, options }: EditorAppProps): JSX.Element {
  const t = useEditorT();
  const snapshot = useEditor(store);
  const hasPreview = options.preview !== undefined;
  const remember = options.rememberLayout !== false;
  const [layout, setLayout] = useState<EditorLayout>(() =>
    startLayout(options, hasPreview),
  );
  const grid = useRef<HTMLDivElement>(null);
  // The drag handlers fire outside a render, so they read the live layout here.
  const live = useRef(layout);
  live.current = layout;

  const apply = (next: EditorLayout): void => {
    // Straight into the ref too: a fast second click reads it before the
    // next render lands, and a toggle has to toggle.
    live.current = next;
    setLayout(next);
    if (remember) {
      writeLayout(next);
    }
  };

  // A new slide is no use if the pane that edits it is shut.
  const slideCount = useRef(snapshot.slides.length);
  useEffect(() => {
    const count = snapshot.slides.length;
    const grew = count > slideCount.current;
    slideCount.current = count;
    if (!grew) {
      return;
    }
    if (live.current.panes.includes(EditorPane.Form)) {
      return;
    }
    apply(togglePane(live.current, EditorPane.Form));
    // `apply` is rebuilt every render and would restart this effect forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.slides.length]);

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

  /** One click on a slide opens its details. A second click closes them. */
  const selectSlide = (index: number): void => {
    const current = live.current;
    const open = current.panes.includes(EditorPane.Form);
    if (index === snapshot.selected && open) {
      apply(togglePane(current, EditorPane.Form));
      return;
    }
    store.select(index);
    if (!open) {
      apply(togglePane(current, EditorPane.Form));
    }
  };

  const beginDrag =
    (left: EditorPane, right: EditorPane) =>
    (event: PointerEvent): void => {
      const element = grid.current;
      if (element === null) {
        return;
      }
      const nodeLeft = element.querySelector(`[data-pq-pane="${left}"]`);
      const nodeRight = element.querySelector(`[data-pq-pane="${right}"]`);
      if (nodeLeft === null || nodeRight === null) {
        return;
      }
      event.preventDefault();
      const startX = event.clientX;
      const boxLeft = nodeLeft.getBoundingClientRect();
      const boxRight = nodeRight.getBoundingClientRect();
      const move = (moveEvent: PointerEvent): void => {
        const next = dragPair(
          live.current.sizes,
          left,
          right,
          boxLeft.width,
          boxRight.width,
          moveEvent.clientX - startX,
        );
        if (next === null) {
          return;
        }
        // Keep the ref honest: the release can land before the next render.
        live.current = {
          ...live.current,
          sizes: { ...live.current.sizes, ...next },
        };
        setLayout(live.current);
      };
      const end = (): void => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        if (remember) {
          writeLayout(live.current);
        }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
    };

  const total = snapshot.slides.reduce(
    (count, slide) => count + slide.problems.length,
    0,
  );
  const selected = snapshot.slides.find(
    (slide) => slide.index === snapshot.selected,
  );
  const first = selected?.problems[0];
  const firstSuggestion =
    first === undefined ? null : diagnosticSuggestion(t, first);
  // The line is what the player can match on: it adds screens of its own.
  const start =
    selected === undefined
      ? 0
      : (snapshot.doc.blocks[selected.index]?.start ?? 0);
  const line = selected !== undefined && selected.index < 0 ? 0 : start;
  const place: PreviewPlace | null =
    selected === undefined
      ? null
      : { kind: selected.kind, index: selected.index, line };
  const panes = layout.panes;

  return (
    <div class="pq-editor">
      <Toolbar
        store={store}
        snapshot={snapshot}
        options={options}
        panes={panes}
        hasPreview={hasPreview}
        onTogglePane={(pane) => apply(togglePane(layout, pane))}
      />

      <div
        ref={grid}
        class="pq-editor-grid"
        style={`--pq-ed-grid:${columnTemplate(layout)}`}
      >
        {panes.map((pane, index) => {
          const next = panes[index + 1];
          return (
            <div class="pq-editor-cell" key={pane} data-pq-pane={pane}>
              {paneBody(pane, {
                store,
                snapshot,
                options,
                onSelect: selectSlide,
                place,
              })}
              {next === undefined ? null : (
                <div
                  class="pq-editor-grip"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={t("editorResizeAria", {
                    left: paneLabel(t, pane),
                    right: paneLabel(t, next),
                  })}
                  title={t("editorResize")}
                  onPointerDown={beginDrag(pane, next)}
                  onDblClick={() => apply({ ...layout, sizes: {} })}
                />
              )}
            </div>
          );
        })}
      </div>

      <div class="pq-editor-status">
        <span class={total === 0 ? "pq-editor-good" : "pq-editor-bad"}>
          {total === 0 ? t("editorNoProblems") : countLabel(total, t)}
        </span>
        {first === undefined ? null : (
          <span class="pq-editor-bad">
            {first.code} {diagnosticMessage(t, first)}
            {firstSuggestion === null ? null : <> {firstSuggestion}</>}
          </span>
        )}
        <span class="pq-editor-note-line" role="status" aria-live="polite">
          {snapshot.note === null ? t("editorNothingSaved") : t(snapshot.note)}
        </span>
      </div>
    </div>
  );
}

function countLabel(total: number, t: Translate): string {
  return t(total === 1 ? "problemsFound" : "problemsFoundPlural", {
    count: total,
  });
}
