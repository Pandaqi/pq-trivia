/** A pane heading, with its note a hover away. */

import type { JSX } from "preact";
import { useMemo, useRef, useState } from "preact/hooks";
import { Bubble } from "../../shared/bubble";

let seed = 0;

function bubbleId(): string {
  seed += 1;
  return `pq-editor-bubble-${seed}`;
}

export function NoteHead({
  label,
  note,
}: {
  readonly label: string;
  readonly note: string;
}): JSX.Element {
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useMemo(bubbleId, []);
  const [open, setOpen] = useState(false);
  return (
    <>
      <h2
        ref={heading}
        class="pq-editor-has-note"
        aria-describedby={open ? id : undefined}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
      >
        {label}
        <span class="pq-editor-ask" aria-hidden="true">
          ?
        </span>
      </h2>
      {open ? (
        <Bubble
          anchor={heading}
          text={note}
          id={id}
          class="pq-editor-bubble"
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
