/**
 * Every built-in language. The default build imports this file.
 *
 * A filtered build replaces it with only the languages you picked, through
 * `bun run build --languages <code>`. Keep the key equal to the language code.
 */

import type { TranslationTable } from "../types";
import { enBase } from "./en";
import { nlBase } from "./nl";

/** The shared player and core strings. Live and editor tables load there. */
export const LOCALES: Readonly<Record<string, TranslationTable>> = {
  en: enBase,
  nl: nlBase,
};
