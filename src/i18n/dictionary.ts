/**
 * Interface strings. Every language is a file in `locales/`.
 *
 * There is no built-in default language. A filtered build can ship one
 * language, several, or none. Keys are stable; hosts override any of them with
 * `translations`. The dictionaries stay out of `core.js`: only a controller
 * that has a screen needs them.
 */

import { LOCALES } from "./locales";
import type { TranslationTable } from "./types";

export type { TranslationTable } from "./types";

/** Codes that this build actually carries, sorted. */
export const BUILTIN_TRANSLATIONS: Readonly<Record<string, TranslationTable>> =
  LOCALES;

export function builtinLanguages(): readonly string[] {
  return Object.keys(LOCALES).sort();
}

export function translate(
  language: string | null | undefined,
  key: string,
  params: Readonly<Record<string, string | number>> = {},
  overrides: Readonly<Record<string, TranslationTable>> = {},
): string {
  const code = (language ?? "").toLowerCase();
  const builtin = LOCALES[code] ?? {};
  const table = { ...builtin, ...(overrides[code] ?? {}) };
  // No language silently falls back to another. A missing key is a missing
  // key: the host sees it and can fill it in.
  const template = table[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
