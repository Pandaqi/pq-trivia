/** Browser loader errors. Only the code that fetches quiz files needs these. */

import type { TranslationTable } from "./types";
import { enLoader } from "./locales/en";
import { nlLoader } from "./locales/nl";

export const LOADER_LOCALES: Readonly<Record<string, TranslationTable>> = {
  en: enLoader,
  nl: nlLoader,
};
