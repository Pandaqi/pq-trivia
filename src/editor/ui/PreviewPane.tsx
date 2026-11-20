/** The live preview. Parsed text in, real player out, torn down on change. */

import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { PreviewHook } from "../mount";

export interface PreviewPaneProps {
  readonly text: string;
  readonly preview: PreviewHook;
}

/** Long enough that typing does not start a player per keystroke. */
const DELAY_MS = 400;

export function PreviewPane({ text, preview }: PreviewPaneProps): JSX.Element {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    if (element === null) {
      return;
    }
    let teardown: (() => void) | null = null;
    const timer = setTimeout(() => {
      teardown = preview(text, element);
    }, DELAY_MS);
    return () => {
      clearTimeout(timer);
      teardown?.();
      element.replaceChildren();
    };
  }, [text, preview]);

  return (
    <section class="pq-editor-panel pq-editor-preview" aria-label="Preview">
      <h2>Preview</h2>
      <div ref={host} />
    </section>
  );
}
