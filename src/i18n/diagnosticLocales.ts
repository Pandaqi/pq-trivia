/** Problem-panel strings. The player and the editor both import this. */

import type { TranslationTable } from "./types";
import { deDiagnostics } from "./locales/de";
import { enDiagnostics } from "./locales/en";
import { esDiagnostics } from "./locales/es";
import { frDiagnostics } from "./locales/fr";
import { itDiagnostics } from "./locales/it";
import { nlDiagnostics } from "./locales/nl";
import { plDiagnostics } from "./locales/pl";
import { pt_brDiagnostics } from "./locales/pt-br";

export const DIAGNOSTIC_LOCALES: Readonly<Record<string, TranslationTable>> = {
  de: deDiagnostics,
  en: enDiagnostics,
  es: esDiagnostics,
  fr: frDiagnostics,
  it: itDiagnostics,
  nl: nlDiagnostics,
  pl: plDiagnostics,
  "pt-br": pt_brDiagnostics,
};

/** Keys owned by the diagnostic table, so a provider can delegate them. */
export const DIAGNOSTIC_KEYS: ReadonlySet<string> = new Set(
  Object.values(DIAGNOSTIC_LOCALES).flatMap((table) => Object.keys(table)),
);
