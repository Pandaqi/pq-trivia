/** A `t` for loader errors, which happen before any quiz screen exists. */

import { LOADER_LOCALES } from "./loaderLocales";
import type { Translate } from "./types";

interface LanguageGlobals {
  readonly document?: { readonly documentElement?: { readonly lang?: string } };
  readonly navigator?: { readonly language?: string };
}

function languageCode(raw: string | null | undefined): string {
  const [base] = (raw ?? "").toLowerCase().split("-");
  return base ?? "";
}

function resolveLanguage(raw: string | null | undefined): string {
  const given = languageCode(raw);
  if (given.length > 0) {
    return given;
  }
  const env = globalThis as LanguageGlobals;
  const page = languageCode(env.document?.documentElement?.lang);
  if (page.length > 0) {
    return page;
  }
  const browser = languageCode(env.navigator?.language);
  return browser.length > 0 ? browser : "en";
}

/**
 * The loader has no base dictionary to lean on: importing it would drag every
 * interface string into `browser.js`. This table is the whole vocabulary here.
 */
export function loaderT(language: string | null | undefined): Translate {
  const code = resolveLanguage(language);
  const table = LOADER_LOCALES[code] ?? {};
  return (key, params = {}) =>
    (table[key] ?? key).replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
}
