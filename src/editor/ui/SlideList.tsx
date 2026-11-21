/** The slide list. Click to select, drag or use the arrows to reorder. */

import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { pluralKey } from "../../core/values/marks";
import { moveSlide, moveSlideTo } from "../commands";
import {
  problemCount,
  SlideKind,
  slideKindLabel,
  slideLabel,
  type SlideInfo,
} from "../slides";
import type { EditorSnapshot, EditorStore } from "../store";
import { useEditorT } from "./i18n";
import { NoteHead } from "./NoteHead";

/** Rounds sit one step in, their questions two. The rest sit flush. */
function depthOf(slide: SlideInfo): number {
  if (slide.kind === SlideKind.Round) {
    return 1;
  }
  if (slide.kind === SlideKind.Question) {
    return slide.round === null ? 1 : 2;
  }
  return 0;
}

export interface SlideListProps {
  readonly store: EditorStore;
  readonly snapshot: EditorSnapshot;
  /** One click selects and opens the details. A second click closes them. */
  readonly onSelect: (index: number) => void;
}

export function SlideList({
  store,
  snapshot,
  onSelect,
}: SlideListProps): JSX.Element {
  const t = useEditorT();
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const wanted = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

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

  const drop = (): void => {
    setDragging(null);
    setOver(null);
  };

  const startDrag =
    (index: number) =>
    (event: DragEvent): void => {
      if (event.dataTransfer !== null) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
      }
      setDragging(index);
      setOver(index);
    };

  const dragOver =
    (index: number) =>
    (event: DragEvent): void => {
      if (dragging === null || dragging === index) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer !== null) {
        event.dataTransfer.dropEffect = "move";
      }
      setOver(index);
    };

  const dropOn =
    (index: number) =>
    (event: DragEvent): void => {
      event.preventDefault();
      const from = dragging;
      drop();
      if (from === null || from === index) {
        return;
      }
      wanted.current = index;
      moveSlideTo(store, from, index);
    };

  const questions = snapshot.slides.filter(
    (slide) => slide.kind === SlideKind.Question,
  ).length;
  const rounds = snapshot.slides.filter(
    (slide) => slide.kind === SlideKind.Round,
  ).length;
  // The header carries index -1, so the last row is the last block's index.
  const last = snapshot.slides[snapshot.slides.length - 1]?.index ?? -1;

  return (
    <nav
      class="pq-editor-panel pq-editor-slide-list"
      aria-label={t("editorSlides")}
    >
      <NoteHead label={t("editorSlides")} note={t("editorSlidesNote")} />
      <ol class="pq-editor-slides">
        {snapshot.slides.map((slide) => {
          const active = slide.index === snapshot.selected;
          const label = slideLabel(t, slide);
          const problems = problemCount(slide);
          const fixed = slide.kind === SlideKind.Header;
          const target = dragging !== null && over === slide.index && !fixed;
          return (
            <li
              key={`slide-${slide.index}`}
              class="pq-editor-slide-item"
              data-depth={depthOf(slide)}
              data-dragging={dragging === slide.index ? "true" : undefined}
              data-drop={
                target && dragging !== slide.index ? "true" : undefined
              }
              draggable={fixed ? undefined : true}
              onDragStart={fixed ? undefined : startDrag(slide.index)}
              onDragOver={fixed ? undefined : dragOver(slide.index)}
              onDrop={fixed ? undefined : dropOn(slide.index)}
              onDragEnd={fixed ? undefined : drop}
            >
              <div
                class="pq-editor-slide-row"
                data-current={active ? "true" : undefined}
              >
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
                  onClick={() => onSelect(slide.index)}
                  onKeyDown={(event) => keydown(event, slide.index)}
                >
                  <span class="pq-editor-slide-kind">
                    {slideKindLabel(t, slide.kind)}
                  </span>
                  <span class="pq-editor-slide-label">{label}</span>
                  {problems > 0 ? (
                    <span
                      class="pq-editor-badge"
                      aria-label={t(pluralKey(problems, "problemsReopen"), {
                        count: problems,
                      })}
                    >
                      {problems}
                    </span>
                  ) : (
                    <span aria-hidden="true" />
                  )}
                </button>
                {fixed ? null : (
                  <span class="pq-editor-move">
                    <button
                      type="button"
                      class="pq-editor-move-button"
                      aria-label={t("moveUp", { text: label })}
                      title={t("editorMoveUpTitle")}
                      disabled={slide.index <= 0}
                      onClick={() => move(slide.index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      class="pq-editor-move-button"
                      aria-label={t("moveDown", { text: label })}
                      title={t("editorMoveDownTitle")}
                      disabled={slide.index >= last}
                      onClick={() => move(slide.index, 1)}
                    >
                      ↓
                    </button>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p class="pq-editor-hint">
        {t("editorSlideCount", {
          questions: `${questions} ${t(pluralKey(questions, "question"))}`,
          rounds: `${rounds} ${t(pluralKey(rounds, "round"))}`,
        })}
      </p>
    </nav>
  );
}
