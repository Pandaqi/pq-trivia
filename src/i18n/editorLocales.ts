/** Wizard strings. Only the editor bundle imports this file. */

import type { TranslationTable } from "./types";
import { enDiagnostics, enEditor } from "./locales/en";
import { nlDiagnostics, nlEditor } from "./locales/nl";

export const EDITOR_LOCALES: Readonly<Record<string, TranslationTable>> = {
  en: { ...enEditor, ...enDiagnostics },
  nl: { ...nlEditor, ...nlDiagnostics },
};
