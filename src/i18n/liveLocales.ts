/** Live room strings. Loaded by the live UI and the standalone player. */

import type { TranslationTable } from "./types";
import { deLive } from "./locales/de";
import { enLive } from "./locales/en";
import { esLive } from "./locales/es";
import { frLive } from "./locales/fr";
import { itLive } from "./locales/it";
import { nlLive } from "./locales/nl";
import { plLive } from "./locales/pl";
import { pt_brLive } from "./locales/pt-br";

export const LIVE_LOCALES: Readonly<Record<string, TranslationTable>> = {
  de: deLive,
  en: enLive,
  es: esLive,
  fr: frLive,
  it: itLive,
  nl: nlLive,
  pl: plLive,
  "pt-br": pt_brLive,
};
