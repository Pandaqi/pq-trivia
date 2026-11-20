/** Every key in every language. Tests and word lists only. */

import type { TranslationTable } from "../types";
import { enBase, enDiagnostics, enEditor, enLive, enLoader } from "./en";
import { nlBase, nlDiagnostics, nlEditor, nlLive, nlLoader } from "./nl";

export const ALL_LOCALES: Readonly<Record<string, TranslationTable>> = {
  en: { ...enBase, ...enLive, ...enEditor, ...enDiagnostics, ...enLoader },
  nl: { ...nlBase, ...nlLive, ...nlEditor, ...nlDiagnostics, ...nlLoader },
};
