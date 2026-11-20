/**
 * Interface strings. Every language is a file in `locales/`.
 *
 * There is no built-in default language. A filtered build can ship one
 * language, several, or none. Keys are stable; hosts override any of them with
 * `translations`. The dictionaries stay out of `core.js`: only a controller
 * that has a screen needs them.
 */

import { LOCALES } from "./locales";
import type { Translate, TranslationTable } from "./types";

export type { Translate, TranslationTable } from "./types";

/** Codes that this build actually carries, sorted. */
export const BUILTIN_TRANSLATIONS: Readonly<Record<string, TranslationTable>> =
  LOCALES;

export function builtinLanguages(): readonly string[] {
  return Object.keys(LOCALES).sort();
}

/** `nl-BE`, `NL` and `nl` all mean the same table. */
function languageCode(language: string | null | undefined): string {
  const [base] = (language ?? "").toLowerCase().split("-");
  return base ?? "";
}

export function translate(
  language: string | null | undefined,
  key: string,
  params: Readonly<Record<string, string | number>> = {},
  overrides: Readonly<Record<string, TranslationTable>> = {},
): string {
  const code = languageCode(language);
  const builtin = LOCALES[code] ?? {};
  const table = { ...builtin, ...(overrides[code] ?? {}) };
  // No language silently falls back to another. A missing key is a missing
  // key: the host sees it and can fill it in.
  const template = table[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** A `t` for a tree that has no quiz to carry one. */
export function translator(
  language: string | null | undefined,
  overrides: Readonly<Record<string, TranslationTable>> = {},
): Translate {
  return (key, params = {}) => translate(language, key, params, overrides);
}

/** What the page and the browser can tell us, without needing a DOM lib. */
interface LanguageGlobals {
  readonly document?: { readonly documentElement?: { readonly lang?: string } };
  readonly navigator?: { readonly language?: string };
}

/** The page's language, then the browser's, then the default. */
export function resolveLanguage(raw?: string | null): string {
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
