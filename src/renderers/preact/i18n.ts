/** UI strings reach every component without passing a `t` prop around. */

import { createContext } from "preact";
import { useContext } from "preact/hooks";

export type Translate = (
  key: string,
  params?: Readonly<Record<string, string | number>>,
) => string;

export const UiContext = createContext<Translate>((key) => key);

export function useT(): Translate {
  return useContext(UiContext);
}
