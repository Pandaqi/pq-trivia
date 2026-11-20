/** UI strings reach every component without passing a `t` prop around. */

import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Translate } from "../../i18n/types";

export type { Translate } from "../../i18n/types";

export const UiContext = createContext<Translate>((key) => key);

export function useT(): Translate {
  return useContext(UiContext);
}
