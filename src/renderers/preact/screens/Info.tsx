/**
 * Help, on demand.
 *
 * One small "?" per group, on the heading line. Click it and the note floats
 * under it. Rows that explain themselves get nothing until you hover them,
 * which keeps a panel of twenty controls readable.
 */

import type { ComponentChildren, JSX } from "preact";
import { useMemo, useRef, useState } from "preact/hooks";
import { Bubble } from "../../../shared/bubble";
import { useT } from "../i18n";

let seed = 0;

function bubbleId(): string {
  seed += 1;
  return `pq-bubble-${seed}`;
}

/** A group heading, its "?" and the note behind it. */
export function GroupHead({
  label,
  note,
}: {
  readonly label: string;
  readonly note: string;
}): JSX.Element {
  const t = useT();
  const button = useRef<HTMLButtonElement>(null);
  const id = useMemo(bubbleId, []);
  const [open, setOpen] = useState(false);
  return (
    <>
      <legend>
        {label}
        <button
          ref={button}
          type="button"
          class="pq-info-button"
          aria-expanded={open}
          aria-label={t("moreInfo")}
          aria-describedby={open ? id : undefined}
          onClick={() => setOpen(!open)}
        >
          ?
        </button>
      </legend>
      {open ? (
        <Bubble
          anchor={button}
          text={note}
          id={id}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

/**
 * A row that explains itself on hover. Used where a "?" would be in the way:
 * a field, a tick box.
 */
export function HoverNote({
  text,
  children,
}: {
  readonly text: string;
  readonly children: ComponentChildren;
}): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  const id = useMemo(bubbleId, []);
  const [open, setOpen] = useState(false);
  return (
    <div
      ref={host}
      class="pq-hover"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocusIn={() => setOpen(true)}
      onFocusOut={() => setOpen(false)}
    >
      {children}
      {open ? (
        <Bubble
          anchor={host}
          text={text}
          id={id}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
