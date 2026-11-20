/**
 * The live preview. One player for the life of the pane; edits reload its text
 * so the author is not thrown back to the start screen on every keystroke.
 *
 * The pane never scrolls. The whole page is shrunk until it fits the box the
 * pane gives it, so a narrow pane shows the same quiz, smaller. The player
 * follows the slide the author picked, and drifts when they click around.
 */

import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { PreviewHook, PreviewInstance, PreviewPlace } from "../mount";
import { useEditorT } from "./i18n";

export interface PreviewPaneProps {
  readonly text: string;
  readonly preview: PreviewHook;
  /** The slide being edited. Null when the list knows nothing yet. */
  readonly place: PreviewPlace | null;
}

/** Long enough that typing does not start a parse per keystroke. */
const DELAY_MS = 400;
/** A page this much wider than the box is not worth reflowing further. */
const WIDEST = 2.5;
/** Below this the numbers are layout noise, not a fit. */
const STEADY = 0.004;

/**
 * Shrink the player until the whole page fits. Wider text wraps less, so a
 * smaller scale allows a wider layout, which in turn needs a smaller scale.
 * Three passes land on a size that no longer moves.
 */
function fitStage(stage: HTMLElement, host: HTMLElement): void {
  const quiz = host.querySelector<HTMLElement>(".pq-quiz");
  if (quiz === null) {
    return;
  }
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (width < 8 || height < 8) {
    return;
  }
  const widest = width * WIDEST;
  const layout = (scale: number): number =>
    Math.min(widest, width / Math.max(scale, 0.01));

  let scale = 1;
  for (let pass = 0; pass < 3; pass += 1) {
    quiz.style.width = `${layout(scale)}px`;
    const page = quiz.offsetHeight;
    if (page <= 0) {
      return;
    }
    const next = Math.min(1, height / page);
    const steady = Math.abs(next - scale) < STEADY;
    scale = next;
    if (steady) {
      break;
    }
  }
  quiz.style.width = `${layout(scale)}px`;
  host.style.transform = `scale(${scale})`;
}

export function PreviewPane({
  text,
  preview,
  place,
}: PreviewPaneProps): JSX.Element {
  const t = useEditorT();
  const stage = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<PreviewInstance | null>(null);
  const hook = useRef(preview);
  const loaded = useRef(text);
  const wanted = useRef(place);
  hook.current = preview;
  wanted.current = place;

  /** Read the boxes through refs: every caller gets the same, current answer. */
  const fit = (): void => {
    if (stage.current !== null && host.current !== null) {
      fitStage(stage.current, host.current);
    }
  };

  useEffect(() => {
    const element = host.current;
    if (element === null) {
      return;
    }
    const mounted = hook.current(text, element);
    instance.current = mounted;
    // The player draws its first screen before this returns, but the load
    // lands later. One turn is enough for the box, the observer for the rest.
    const first = window.setTimeout(fit, 0);
    return () => {
      window.clearTimeout(first);
      instance.current = null;
      mounted.destroy();
      element.replaceChildren();
    };
    // Mount once. Text arrives through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (text === loaded.current) {
      return;
    }
    const timer = setTimeout(() => {
      loaded.current = text;
      instance.current?.load(text);
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  // Follow the picker. Primitive deps: a new object every render would snap
  // the preview back on every keystroke.
  const kind = place?.kind;
  const index = place?.index;
  const line = place?.line;
  useEffect(() => {
    const where = wanted.current;
    if (where === null) {
      return;
    }
    instance.current?.show?.(where);
  }, [kind, index, line]);

  // A resize, a new screen, an answer revealed: refit on one frame.
  useEffect(() => {
    const box = stage.current;
    const element = host.current;
    if (box === null || element === null) {
      return;
    }
    let queued = 0;
    const schedule = (): void => {
      if (queued !== 0) {
        return;
      }
      // A timer, not a frame: a pane that is not painted yet still measures.
      queued = window.setTimeout(() => {
        queued = 0;
        fit();
      }, 0);
    };
    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedule);
    resize?.observe(box);
    // The player swaps screens without a resize on the element itself.
    const change =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(schedule);
    change?.observe(element, { childList: true, subtree: true });
    return () => {
      if (queued !== 0) {
        window.clearTimeout(queued);
      }
      resize?.disconnect();
      change?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      class="pq-editor-panel pq-editor-preview"
      aria-label={t("editorPreview")}
    >
      <h2>{t("editorPreview")}</h2>
      <div class="pq-editor-stage" ref={stage}>
        <div class="pq-editor-preview-host" ref={host} />
      </div>
    </section>
  );
}
