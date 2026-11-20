/**
 * Drag and drop, without a library.
 *
 * The click path stays the real one: keyboard users, screen readers and phones
 * that do not fire drag events all use it. Dragging is the shortcut on top.
 * Anything that changes an answer goes through these pure functions, so both
 * paths are tested by the same small code.
 */

export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) {
    return [...items];
  }
  next.splice(to, 0, moved);
  return next;
}

/** One right target per left item. Connecting again moves the pair. */
export function connectPair(
  pairs: readonly (readonly [string, string])[],
  left: string,
  right: string,
): Array<readonly [string, string]> {
  const kept = pairs.filter((pair) => pair[0] !== left && pair[1] !== right);
  return [...kept, [left, right] as const];
}

/** One bucket per item. Dropping an item again moves it. */
export function placeItem(
  placements: readonly (readonly [string, string])[],
  item: string,
  bucket: string,
): Array<readonly [string, string]> {
  const kept = placements.filter((pair) => pair[0] !== item);
  return [...kept, [item, bucket] as const];
}

/** The id a drag started with. Null when the browser sends no data. */
export function dragPayload(event: DragEvent): string | null {
  const data = event.dataTransfer;
  if (data === null) {
    return null;
  }
  const value = data.getData("text/plain");
  return value.length === 0 ? null : value;
}

export function allowDrop(event: DragEvent): void {
  event.preventDefault();
}
