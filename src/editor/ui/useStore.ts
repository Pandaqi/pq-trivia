/** Subscribe to the store. One snapshot per change, no polling. */

import { useEffect, useState } from "preact/hooks";
import type { EditorSnapshot, EditorStore } from "../store";

export function useEditor(store: EditorStore): EditorSnapshot {
  const [snapshot, setSnapshot] = useState(() => store.snapshot());

  useEffect(() => {
    const sync = (): void => setSnapshot(store.snapshot());
    sync();
    return store.subscribe(sync);
  }, [store]);

  return snapshot;
}
