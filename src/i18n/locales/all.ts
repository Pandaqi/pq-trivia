/** Every key in every language. Tests and word lists only. */

import type { TranslationTable } from "../types";
import { deBase, deDiagnostics, deEditor, deLive, deLoader } from "./de";
import { enBase, enDiagnostics, enEditor, enLive, enLoader } from "./en";
import { esBase, esDiagnostics, esEditor, esLive, esLoader } from "./es";
import { frBase, frDiagnostics, frEditor, frLive, frLoader } from "./fr";
import { itBase, itDiagnostics, itEditor, itLive, itLoader } from "./it";
import { nlBase, nlDiagnostics, nlEditor, nlLive, nlLoader } from "./nl";
import { plBase, plDiagnostics, plEditor, plLive, plLoader } from "./pl";
import {
  pt_brBase,
  pt_brDiagnostics,
  pt_brEditor,
  pt_brLive,
  pt_brLoader,
} from "./pt-br";

export const ALL_LOCALES: Readonly<Record<string, TranslationTable>> = {
  de: { ...deBase, ...deLive, ...deEditor, ...deDiagnostics, ...deLoader },
  en: { ...enBase, ...enLive, ...enEditor, ...enDiagnostics, ...enLoader },
  es: { ...esBase, ...esLive, ...esEditor, ...esDiagnostics, ...esLoader },
  fr: { ...frBase, ...frLive, ...frEditor, ...frDiagnostics, ...frLoader },
  it: { ...itBase, ...itLive, ...itEditor, ...itDiagnostics, ...itLoader },
  nl: { ...nlBase, ...nlLive, ...nlEditor, ...nlDiagnostics, ...nlLoader },
  pl: { ...plBase, ...plLive, ...plEditor, ...plDiagnostics, ...plLoader },
  "pt-br": {
    ...pt_brBase,
    ...pt_brLive,
    ...pt_brEditor,
    ...pt_brDiagnostics,
    ...pt_brLoader,
  },
};
