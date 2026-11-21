/**
 * Interface strings. Every language is a file in `locales/`.
 *
 * There is no built-in default language. A filtered build can ship one
 * language, several, or none. Keys are stable; hosts override any of them with
 * `translations`. The dictionaries stay out of `core.js`: only a controller
 * that has a screen needs them.
 */

import { DEFAULT_LANGUAGE, normalizeTag, resolveLanguageTag } from "./codes";
import { LOCALES } from "./locales";
import type { Translate, TranslationTable } from "./types";

export type { Translate, TranslationTable } from "./types";

/** Codes that this build actually carries, sorted. */
export const BUILTIN_TRANSLATIONS: Readonly<Record<string, TranslationTable>> =
  LOCALES;

export function builtinLanguages(): readonly string[] {
  return Object.keys(LOCALES).sort();
}

/** `pt_BR`, `pt` and `pt-br` all find the Brazilian table. */
function languageCode(language: string | null | undefined): string {
  return resolveLanguageTag(language, (code) => Object.hasOwn(LOCALES, code));
}

/** English, unless a filtered build left it out. */
export function defaultLanguage(): string {
  const languages = builtinLanguages();
  if (languages.includes(DEFAULT_LANGUAGE)) {
    return DEFAULT_LANGUAGE;
  }
  return languages[0] ?? DEFAULT_LANGUAGE;
}

export function translate(
  language: string | null | undefined,
  key: string,
  params: Readonly<Record<string, string | number>> = {},
  overrides: Readonly<Record<string, TranslationTable>> = {},
): string {
  const code = languageCode(language);
  const builtin = LOCALES[code] ?? {};
  const tagged = overrides[normalizeTag(language)] ?? {};
  const table = { ...builtin, ...(overrides[code] ?? {}), ...tagged };
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

/** The page's language, then the browser's, then the default. */
export function resolveLanguage(raw?: string | null): string {
  return resolveLanguageTag(raw, (code) => Object.hasOwn(LOCALES, code));
}
