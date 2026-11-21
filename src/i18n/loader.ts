/** A `t` for loader errors, which happen before any quiz screen exists. */

import { resolveLanguageTag } from "./codes";
import { LOADER_LOCALES } from "./loaderLocales";
import type { Translate } from "./types";

/**
 * The loader has no base dictionary to lean on: importing it would drag every
 * interface string into `browser.js`. This table is the whole vocabulary here.
 */
export function loaderT(language: string | null | undefined): Translate {
  const code = resolveLanguageTag(language, (entry) =>
    Object.hasOwn(LOADER_LOCALES, entry),
  );
  const table = LOADER_LOCALES[code] ?? {};
  return (key, params = {}) =>
    (table[key] ?? key).replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
}
