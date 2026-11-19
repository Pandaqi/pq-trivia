/**
 * Value coercion. Raw text in, real values out.
 *
 * Booleans were strings in V2, so `false` was truthy. Not any more.
 */

const BOOLEAN_TRUE_WORDS: ReadonlySet<string> = new Set([
  "true",
  "yes",
  "on",
  "1",
]);
const BOOLEAN_FALSE_WORDS: ReadonlySet<string> = new Set([
  "false",
  "no",
  "off",
  "0",
]);

export function coerceBoolean(raw: string): boolean | undefined {
  const key = raw.trim().toLowerCase();
  if (BOOLEAN_TRUE_WORDS.has(key)) {
    return true;
  }
  if (BOOLEAN_FALSE_WORDS.has(key)) {
    return false;
  }
  return undefined;
}

export function coerceNumber(raw: string): number | undefined {
  const cleaned = raw.trim().replace(/\s+/g, "").replaceAll(",", ".");
  if (cleaned.length === 0) {
    return undefined;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Durations become milliseconds.
 * `90` and `90s` are both ninety seconds. `1:30`, `1m30s`, `1:02:03` work too.
 */
export function coerceDuration(raw: string): number | undefined {
  const value = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (value.length === 0) {
    return undefined;
  }

  if (/^\d+(?:\.\d+)?$/.test(value)) {
    return Math.round(Number(value) * 1000);
  }

  const colonParts = value.split(":");
  if (
    colonParts.length >= 2 &&
    colonParts.length <= 3 &&
    colonParts.every((part) => /^\d+$/.test(part))
  ) {
    let total = 0;
    for (const part of colonParts) {
      total = total * 60 + Number(part);
    }
    return total * 1000;
  }

  const units: ReadonlyArray<readonly [RegExp, number]> = [
    [/(\d+(?:\.\d+)?)h/, 3600],
    [/(\d+(?:\.\d+)?)m/, 60],
    [/(\d+(?:\.\d+)?)s/, 1],
  ];
  let total = 0;
  let matched = false;
  for (const [pattern, factor] of units) {
    const match = pattern.exec(value);
    const amount = match?.[1];
    if (amount === undefined) {
      continue;
    }
    total += Number(amount) * factor;
    matched = true;
  }
  return matched ? Math.round(total * 1000) : undefined;
}

export function coerceEnum<T extends string>(
  raw: string,
  allowed: readonly T[],
): T | undefined {
  const key = raw
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/\s+/g, "-");
  return allowed.find((option) => option.toLowerCase() === key);
}

/** Split on a separator, but let `\|` mean a literal pipe. */
export function splitUnescaped(raw: string, separator: string): string[] {
  const out: string[] = [];
  let current = "";
  let index = 0;
  while (index < raw.length) {
    const char = raw.charAt(index);
    if (char === "\\" && index + 1 < raw.length) {
      current += char + raw.charAt(index + 1);
      index += 2;
      continue;
    }
    if (raw.startsWith(separator, index)) {
      out.push(current);
      current = "";
      index += separator.length;
      continue;
    }
    current += char;
    index += 1;
  }
  out.push(current);
  return out;
}

export function unescapeValue(raw: string): string {
  let out = "";
  let index = 0;
  while (index < raw.length) {
    const char = raw.charAt(index);
    const next = raw.charAt(index + 1);
    if (char === "\\" && (next === "\\" || next === "|" || next === ">")) {
      out += next;
      index += 2;
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

export function escapeValue(
  value: string,
  separators: readonly string[],
): string {
  let out = value.replaceAll("\\", "\\\\");
  for (const separator of separators) {
    out = out.split(separator).join(`\\${separator}`);
  }
  return out;
}

/** First unescaped occurrence of the pairing symbol, for `Key => Value`. */
export function splitPair(
  raw: string,
  pairing: string,
): [string, string] | undefined {
  const parts = splitUnescaped(raw, pairing);
  if (parts.length < 2) {
    return undefined;
  }
  const head = parts[0] ?? "";
  const rest = parts.slice(1).join(pairing);
  return [head, rest];
}
