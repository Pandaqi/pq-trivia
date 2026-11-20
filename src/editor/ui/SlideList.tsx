/** The slide list. Click to select, Alt+↑/↓ to reorder. */

import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { moveSlide } from "../commands";
import { HEADER_INDEX, problemCount, SlideKind } from "../slides";
import type { EditorSnapshot, EditorStore } from "../store";

export interface SlideListProps {
  readonly store: EditorStore;
  readonly snapshot: EditorSnapshot;
}

const KIND_LABELS: Readonly<Record<SlideKind, string>> = {
  [SlideKind.Header]: "Header",
  [SlideKind.Start]: "Start",
  [SlideKind.Round]: "Round",
  [SlideKind.Question]: "Question",
  [SlideKind.End]: "End",
};

export function SlideList({ store, snapshot }: SlideListProps): JSX.Element {
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const wanted = useRef<number | null>(null);

  // Reordering unmounts the focused button. Focus follows the slide.
  useEffect(() => {
    const target = wanted.current;
    if (target === null) {
      return;
    }
    wanted.current = null;
    buttons.current.get(target)?.focus();
  }, [snapshot.slides]);

  const move = (index: number, delta: number): void => {
    wanted.current = index + delta;
    moveSlide(store, index, delta);
  };

  const keydown = (event: KeyboardEvent, index: number): void => {
    if (!event.altKey) {
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }
    event.preventDefault();
    move(index, event.key === "ArrowUp" ? -1 : 1);
  };

  return (
    <nav class="pq-editor-panel" aria-label="Slides">
      <h2>Slides</h2>
      <ol class="pq-editor-slides">
        {snapshot.slides.map((slide) => {
          const active = slide.index === snapshot.selected;
          const problems = problemCount(slide);
          return (
            <li key={`slide-${slide.index}`}>
              <button
                type="button"
                class="pq-editor-slide"
                aria-current={active ? "true" : undefined}
                ref={(element) => {
                  if (element === null) {
                    buttons.current.delete(slide.index);
                    return;
                  }
                  buttons.current.set(slide.index, element);
                }}
                onClick={() => store.select(slide.index)}
                onKeyDown={(event) => keydown(event, slide.index)}
              >
                <span class="pq-editor-slide-kind">
                  {KIND_LABELS[slide.kind]}
                </span>
                <span class="pq-editor-slide-label">{slide.label}</span>
                {problems > 0 ? (
                  <span
                    class="pq-editor-badge"
                    aria-label={`${problems} problems`}
                  >
                    {problems}
                  </span>
                ) : (
                  <span aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <p class="pq-editor-hint">
        Alt+↑ and Alt+↓ move the selected slide. The header stays put.
      </p>
      {snapshot.selected === HEADER_INDEX ? null : (
        <div class="pq-editor-actions">
          <button
            type="button"
            onClick={() => move(snapshot.selected, -1)}
            disabled={snapshot.selected <= 0}
          >
            Move up
          </button>
          <button
            type="button"
            onClick={() => move(snapshot.selected, 1)}
            disabled={snapshot.selected >= snapshot.slides.length - 2}
          >
            Move down
          </button>
        </div>
      )}
    </nav>
  );
}
