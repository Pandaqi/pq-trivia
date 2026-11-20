/** The wizard's own translation context. The editor never imports the player. */

import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Translate } from "../../i18n/types";

export const EditorContext = createContext<Translate>((key) => key);

export function useEditorT(): Translate {
  return useContext(EditorContext);
}
