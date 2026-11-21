/** Wizard strings. Only the editor bundle imports this file. */

import type { TranslationTable } from "./types";
import { deDiagnostics, deEditor } from "./locales/de";
import { enDiagnostics, enEditor } from "./locales/en";
import { esDiagnostics, esEditor } from "./locales/es";
import { frDiagnostics, frEditor } from "./locales/fr";
import { itDiagnostics, itEditor } from "./locales/it";
import { nlDiagnostics, nlEditor } from "./locales/nl";
import { plDiagnostics, plEditor } from "./locales/pl";
import { pt_brDiagnostics, pt_brEditor } from "./locales/pt-br";

export const EDITOR_LOCALES: Readonly<Record<string, TranslationTable>> = {
  de: { ...deEditor, ...deDiagnostics },
  en: { ...enEditor, ...enDiagnostics },
  es: { ...esEditor, ...esDiagnostics },
  fr: { ...frEditor, ...frDiagnostics },
  it: { ...itEditor, ...itDiagnostics },
  nl: { ...nlEditor, ...nlDiagnostics },
  pl: { ...plEditor, ...plDiagnostics },
  "pt-br": { ...pt_brEditor, ...pt_brDiagnostics },
};
