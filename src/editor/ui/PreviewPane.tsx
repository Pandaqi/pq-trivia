/**
 * The live preview. One player for the life of the pane; edits reload its text
 * so the author is not thrown back to the start screen on every keystroke.
 */

import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { PreviewHook, PreviewInstance } from "../mount";

export interface PreviewPaneProps {
  readonly text: string;
  readonly preview: PreviewHook;
}

/** Long enough that typing does not start a parse per keystroke. */
const DELAY_MS = 400;

export function PreviewPane({ text, preview }: PreviewPaneProps): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<PreviewInstance | null>(null);
  const hook = useRef(preview);
  const loaded = useRef(text);
  hook.current = preview;

  useEffect(() => {
    const element = host.current;
    if (element === null) {
      return;
    }
    const mounted = hook.current(text, element);
    instance.current = mounted;
    return () => {
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

  return (
    <section class="pq-editor-panel pq-editor-preview" aria-label="Preview">
      <h2>Preview</h2>
      <div ref={host} />
    </section>
  );
}
