/**
 * Language tags. Short code, region, or both: all mean the same table.
 *
 * Short codes are the canonical keys. `nl` covers Belgium and the Netherlands
 * with one set of strings, and `nl` is what quiz files use. A region gets its
 * own file only when the text really differs, which Portuguese does: `pt-br`.
 */

/** The language the interface speaks when nobody asked for one. */
export const DEFAULT_LANGUAGE = "en";

/** A bare language that means one specific region. */
const ALIASES: Readonly<Record<string, string>> = {
  pt: "pt-br",
};

/** `pt_BR`, `PT-br` and ` pt-BR ` all become `pt-br`. */
export function normalizeTag(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replaceAll("_", "-");
}

function baseTag(tag: string): string {
  return tag.split("-")[0] ?? "";
}

/** The table that answers for a tag: exact, alias, then its base language. */
export function tableCode(raw: string, has: (code: string) => boolean): string {
  if (has(raw)) {
    return raw;
  }
  const alias = ALIASES[raw];
  if (alias !== undefined && has(alias)) {
    return alias;
  }
  const base = baseTag(raw);
  if (base.length === 0) {
    return "";
  }
  if (has(base)) {
    return base;
  }
  const baseAlias = ALIASES[base];
  return baseAlias !== undefined && has(baseAlias) ? baseAlias : base;
}

/** What the page and the browser can tell us, without needing a DOM lib. */
interface LanguageGlobals {
  readonly document?: { readonly documentElement?: { readonly lang?: string } };
  readonly navigator?: { readonly language?: string };
}

function detectedTag(): string {
  const env = globalThis as LanguageGlobals;
  const page = normalizeTag(env.document?.documentElement?.lang);
  if (page.length > 0) {
    return page;
  }
  return normalizeTag(env.navigator?.language);
}

/**
 * A language's own name: "Nederlands", not "Dutch".
 *
 * `Intl` already knows every name. A table here would be one more thing to
 * translate. The code is the fallback.
 */
export function languageName(tag: string): string {
  const code = normalizeTag(tag);
  if (code.length === 0) {
    return "";
  }
  try {
    return (
      new Intl.DisplayNames([code], { type: "language" }).of(code) ??
      code.toUpperCase()
    );
  } catch {
    return code.toUpperCase();
  }
}

/** The given tag, then the page's, then the browser's, then English. */
export function resolveLanguageTag(
  raw: string | null | undefined,
  has: (code: string) => boolean,
): string {
  const given = normalizeTag(raw);
  if (given.length > 0) {
    return tableCode(given, has);
  }
  const detected = detectedTag();
  if (detected.length > 0) {
    return tableCode(detected, has);
  }
  return DEFAULT_LANGUAGE;
}
