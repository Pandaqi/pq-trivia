/** Browser loader errors. Only the code that fetches quiz files needs these. */

import type { TranslationTable } from "./types";
import { deLoader } from "./locales/de";
import { enLoader } from "./locales/en";
import { esLoader } from "./locales/es";
import { frLoader } from "./locales/fr";
import { itLoader } from "./locales/it";
import { nlLoader } from "./locales/nl";
import { plLoader } from "./locales/pl";
import { pt_brLoader } from "./locales/pt-br";

export const LOADER_LOCALES: Readonly<Record<string, TranslationTable>> = {
  de: deLoader,
  en: enLoader,
  es: esLoader,
  fr: frLoader,
  it: itLoader,
  nl: nlLoader,
  pl: plLoader,
  "pt-br": pt_brLoader,
};
