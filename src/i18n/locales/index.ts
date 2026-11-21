/**
 * Every built-in language. The default build imports this file.
 *
 * A filtered build replaces it with only the languages you picked, through
 * `bun run build --languages <code>`. Keep the key equal to the language code.
 */

import type { TranslationTable } from "../types";
import { deBase } from "./de";
import { enBase } from "./en";
import { esBase } from "./es";
import { frBase } from "./fr";
import { itBase } from "./it";
import { nlBase } from "./nl";
import { plBase } from "./pl";
import { pt_brBase } from "./pt-br";

/** The shared player and core strings. Live and editor tables load there. */
export const LOCALES: Readonly<Record<string, TranslationTable>> = {
  de: deBase,
  en: enBase,
  es: esBase,
  fr: frBase,
  it: itBase,
  nl: nlBase,
  pl: plBase,
  "pt-br": pt_brBase,
};
