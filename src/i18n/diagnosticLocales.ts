/** Problem-panel strings. The player and the editor both import this. */

import type { TranslationTable } from "./types";
import { enDiagnostics } from "./locales/en";
import { nlDiagnostics } from "./locales/nl";

export const DIAGNOSTIC_LOCALES: Readonly<Record<string, TranslationTable>> = {
  en: enDiagnostics,
  nl: nlDiagnostics,
};

/** Keys owned by the diagnostic table, so a provider can delegate them. */
export const DIAGNOSTIC_KEYS: ReadonlySet<string> = new Set(
  Object.values(DIAGNOSTIC_LOCALES).flatMap((table) => Object.keys(table)),
);
