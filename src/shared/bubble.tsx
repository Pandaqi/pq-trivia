/**
 * A note that floats over the page, pointed at whatever opened it.
 *
 * One home for both halves of the app. The player and the wizard each draw it
 * with their own class; everything else lives here. `src/shared` sits just
 * above core, so both layers may import it and core may not.
 *
 * The note is `position: fixed` on purpose: no scroll box between here and the
 * window can clip it, and opening one never moves the page.
 */

import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/** Anything with a box: a button, a row, a heading. */
export interface BubbleAnchor {
  readonly current: HTMLElement | null;
}

interface Rect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

interface Size {
  readonly width: number;
  readonly height: number;
}

interface Placement {
  readonly top: number;
  readonly left: number;
  readonly arrow: number;
  readonly side: "above" | "below";
}

/** Air between the anchor and the note, and at the window edge. */
const GAP = 10;
const EDGE = 8;
/** The tail stays clear of the rounded corners. */
const ARROW_INSET = 16;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * True while a note is on screen. A host with its own Escape handler asks this
 * first: the note takes the key, and the panel under it stays. Reading the DOM
 * rather than a counter means a second copy of this module cannot disagree.
 */
export function bubbleIsOpen(): boolean {
  return document.querySelector("[data-pq-note]") !== null;
}

/** Fired by a host that took the key for itself and still wants the note gone. */
const DISMISS = "pq-dismiss-note";

/**
 * Close every note on screen. A host swallows Escape, then calls this, so the
 * note does not have to race the host for the same keypress.
 */
export function dismissBubbles(): void {
  document.dispatchEvent(new Event(DISMISS));
}

/**
 * Below the anchor when it fits, above when that is the only way, pinned to
 * the window either way. `arrow` is where the tail points, in note pixels.
 */
export function placeBubble(
  anchor: Rect,
  bubble: Size,
  viewport: Size,
): Placement {
  const roomBelow = viewport.height - (anchor.top + anchor.height) - GAP - EDGE;
  const roomAbove = anchor.top - GAP - EDGE;
  const side =
    bubble.height <= roomBelow || roomAbove < bubble.height ? "below" : "above";
  const wanted =
    side === "below"
      ? anchor.top + anchor.height + GAP
      : anchor.top - GAP - bubble.height;
  const top = clampNumber(
    wanted,
    EDGE,
    Math.max(EDGE, viewport.height - bubble.height - EDGE),
  );
  const left = clampNumber(
    anchor.left + anchor.width / 2 - bubble.width / 2,
    EDGE,
    Math.max(EDGE, viewport.width - bubble.width - EDGE),
  );
  const arrow = clampNumber(
    anchor.left + anchor.width / 2 - left,
    ARROW_INSET,
    Math.max(ARROW_INSET, bubble.width - ARROW_INSET),
  );
  return { top, left, arrow, side };
}

/**
 * The box a `position: fixed` child is really measured against. A transformed
 * ancestor becomes its containing block, so page pixels stop matching viewport
 * pixels. Null when nothing up the tree is transformed.
 */
function frameOf(node: HTMLElement): { rect: DOMRect; scale: number } | null {
  let parent = node.parentElement;
  while (parent !== null) {
    const style = getComputedStyle(parent);
    if (
      style.transform !== "none" ||
      style.perspective !== "none" ||
      style.filter !== "none"
    ) {
      const rect = parent.getBoundingClientRect();
      const width = parent.offsetWidth;
      return { rect, scale: width > 0 ? rect.width / width : 1 };
    }
    parent = parent.parentElement;
  }
  return null;
}

export function Bubble({
  anchor,
  text,
  id,
  class: className = "pq-bubble",
  onClose,
}: {
  readonly anchor: BubbleAnchor;
  readonly text: string;
  readonly id?: string | undefined;
  readonly class?: string | undefined;
  /** Escape, or a click anywhere else. The owner decides what closing means. */
  readonly onClose: () => void;
}): JSX.Element {
  const box = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const close = useRef(onClose);
  close.current = onClose;

  // Measure, place, then follow the page for as long as the note is up.
  useEffect(() => {
    const place = (): void => {
      const node = anchor.current;
      const bubble = box.current;
      if (node === null || bubble === null) {
        return;
      }
      const rect = node.getBoundingClientRect();
      // A scaled box needs the same numbers the browser will use: its own.
      const frame = frameOf(bubble);
      const scale = frame === null ? 1 : frame.scale;
      const origin = frame === null ? { top: 0, left: 0 } : frame.rect;
      const anchorRect = {
        top: (rect.top - origin.top) / scale,
        left: (rect.left - origin.left) / scale,
        width: rect.width / scale,
        height: rect.height / scale,
      };
      const area =
        frame === null
          ? { width: window.innerWidth, height: window.innerHeight }
          : {
              width: frame.rect.width / scale,
              height: frame.rect.height / scale,
            };
      // Scrolled out of sight: go quiet rather than pin to an edge.
      if (
        anchorRect.top + anchorRect.height < 0 ||
        anchorRect.top > area.height
      ) {
        setPlacement(null);
        return;
      }
      setPlacement(
        placeBubble(
          anchorRect,
          { width: bubble.offsetWidth, height: bubble.offsetHeight },
          area,
        ),
      );
    };
    place();
    // Scroll does not bubble, and the panel around a note does scroll.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchor]);

  // Escape or a click elsewhere dismisses it. A click on the trigger is its
  // own toggle, so that one is left alone.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        close.current();
      }
    };
    const onDown = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (box.current?.contains(target) === true) {
        return;
      }
      if (anchor.current?.contains(target) === true) {
        return;
      }
      close.current();
    };
    const onDismiss = (): void => {
      close.current();
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener(DISMISS, onDismiss);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener(DISMISS, onDismiss);
    };
  }, [anchor]);

  const style =
    placement === null
      ? undefined
      : `top:${placement.top}px;left:${placement.left}px;--pq-arrow:${placement.arrow}px`;

  return (
    <div
      ref={box}
      id={id}
      class={className}
      role="tooltip"
      data-pq-note=""
      data-pq-side={placement?.side ?? "below"}
      data-pq-placed={placement === null ? undefined : "true"}
      style={style}
    >
      {text}
    </div>
  );
}
