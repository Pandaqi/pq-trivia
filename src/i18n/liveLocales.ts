/** Live room strings. Loaded by the live UI and the standalone player. */

import type { TranslationTable } from "./types";
import { enLive } from "./locales/en";
import { nlLive } from "./locales/nl";

export const LIVE_LOCALES: Readonly<Record<string, TranslationTable>> = {
  en: enLive,
  nl: nlLive,
};
