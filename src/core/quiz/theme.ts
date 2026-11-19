/**
 * `.trivia-theme` — a theme folder's settings, in the same plain-text spirit as
 * a quiz. No JavaScript config, no build step.
 *
 *   Label => Forest
 *   Stylesheet => style.css
 *   Font => body | Lora | regular | Lora-Regular.woff2
 *   BackgroundAlpha => 0.4
 *   --pq-accent => #2f6b4f
 *
 *   ### Background
 *   bg-dots.svg
 *   bg-waves.svg
 *
 * The parser is deliberately small: it shares the split rules, not the quiz
 * attribute table. A theme is its own vocabulary.
 */

import { splitPair, splitUnescaped } from "../values/coerce";

export type FontSlot = "body" | "heading";
export type FontVariant = "regular" | "italic" | "bold" | "bold-italic";

export interface ThemeFont {
  readonly slot: FontSlot;
  readonly family: string;
  readonly variant: FontVariant;
  readonly file: string;
}

export interface ThemeColorScheme {
  readonly light: string | null;
  readonly dark: string | null;
  readonly bg: string | null;
  readonly text: string | null;
}

export interface ThemeSettings {
  readonly label: string;
  /** Empty means "no extra stylesheet", a tokens-only theme. */
  readonly stylesheet: string;
  readonly fonts: readonly ThemeFont[];
  readonly backgrounds: readonly string[];
  /** 0 hides the images, 1 shows them fully. Null leaves the stylesheet alone. */
  readonly backgroundAlpha: number | null;
  readonly boldHeadings: boolean;
  /** `--pq-accent => #2f6b4f` lines. Applied on the quiz root. */
  readonly tokens: Readonly<Record<string, string>>;
  /** `### ColorScheme night` with Light/Dark/Background/Text lines. */
  readonly schemes: Readonly<Record<string, ThemeColorScheme>>;
  readonly issues: readonly string[];
}

const SLOTS: ReadonlySet<string> = new Set(["body", "heading"]);
const VARIANTS: Readonly<Record<string, FontVariant>> = {
  regular: "regular",
  normal: "regular",
  italic: "italic",
  bold: "bold",
  "bold-italic": "bold-italic",
  bolditalic: "bold-italic",
  "bold italic": "bold-italic",
};

function lower(value: string): string {
  return value.trim().toLowerCase();
}

function parseFont(value: string): ThemeFont | null {
  const parts = splitUnescaped(value, "|").map((part) => part.trim());
  const slot = lower(parts[0] ?? "");
  if (!SLOTS.has(slot)) {
    return null;
  }
  const family = parts[1] ?? "";
  if (family.length === 0) {
    return null;
  }
  let variant: FontVariant = "regular";
  let file = parts[2] ?? "";
  const named = parts.length >= 4 ? VARIANTS[lower(parts[2] ?? "")] : undefined;
  if (named !== undefined) {
    variant = named;
    file = parts[3] ?? "";
  }
  if (file.length === 0) {
    return null;
  }
  return { slot: slot as FontSlot, family, variant, file };
}

function splitList(value: string): string[] {
  return splitUnescaped(value, "|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function parseThemeSettings(text: string): ThemeSettings {
  const issues: string[] = [];
  let label = "Custom theme";
  let stylesheet = "style.css";
  let backgroundAlpha: number | null = null;
  let boldHeadings = false;
  const fonts: ThemeFont[] = [];
  const backgrounds: string[] = [];
  const tokens: Record<string, string> = {};
  const schemes: Record<string, ThemeColorScheme> = {};
  let group: string | null = null;

  const schemeName = (value: string): string | null => {
    const match = /^colou?r[\s-]*schemes?\s+(.+)$/i.exec(value.trim());
    return match?.[1]?.trim() ?? null;
  };
  const schemeField = (value: string): keyof ThemeColorScheme | null => {
    switch (value.trim().toLowerCase()) {
      case "light":
        return "light";
      case "dark":
        return "dark";
      case "background":
      case "bg":
        return "bg";
      case "text":
        return "text";
      default:
        return null;
    }
  };

  const add = (key: string, value: string): void => {
    const name = lower(key);
    if (name.startsWith("--")) {
      tokens[key.trim()] = value;
      return;
    }
    if (name === "label" || name === "name") {
      label = value;
      return;
    }
    if (name === "stylesheet" || name === "style" || name === "css") {
      stylesheet = value;
      return;
    }
    if (name === "font" || name === "fonts") {
      const font = parseFont(value);
      if (font === null) {
        issues.push(`Ignored font line "${value}".`);
        return;
      }
      fonts.push(font);
      return;
    }
    if (name === "background" || name === "backgrounds") {
      backgrounds.push(...splitList(value));
      return;
    }
    if (name === "backgroundalpha" || name === "alpha") {
      const alpha = Number(value.replace(",", "."));
      if (Number.isFinite(alpha) && alpha >= 0 && alpha <= 1) {
        backgroundAlpha = alpha;
      } else {
        issues.push(`BackgroundAlpha "${value}" is not between 0 and 1.`);
      }
      return;
    }
    if (name === "boldheadings" || name === "bold") {
      boldHeadings = lower(value) === "true" || lower(value) === "yes";

      return;
    }
    issues.push(`Unknown theme setting "${key}".`);
  };

  for (const raw of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.startsWith("//")) {
      continue;
    }
    if (trimmed.startsWith("###")) {
      group = trimmed.slice(3).trim();
      continue;
    }
    if (trimmed.startsWith("##")) {
      label = trimmed.slice(2).trim() || label;
      group = null;
      continue;
    }
    const pair = splitPair(trimmed, "=>");
    if (pair !== undefined) {
      const active = group === null ? null : schemeName(group);
      const field = active === null ? null : schemeField(pair[0]);
      if (active !== null && field !== null) {
        const current = schemes[active] ?? {
          light: null,
          dark: null,
          bg: null,
          text: null,
        };
        schemes[active] = { ...current, [field]: pair[1].trim() };
        continue;
      }
      group = null;
      const value = pair[1].trim();
      if (value.length === 0) {
        group = pair[0].trim();
        continue;
      }
      add(pair[0], value);
      continue;
    }
    if (group !== null) {
      if (lower(group) === "font" || lower(group) === "fonts") {
        add("font", trimmed);
      } else if (
        lower(group) === "background" ||
        lower(group) === "backgrounds"
      ) {
        backgrounds.push(trimmed);
      } else {
        add(group, trimmed);
      }
      continue;
    }
    issues.push(`Cannot parse theme line "${trimmed}".`);
  }

  return {
    label,
    stylesheet: stylesheet.trim(),
    fonts,
    backgrounds,
    backgroundAlpha,
    boldHeadings,
    tokens,
    schemes,
    issues,
  };
}

/** Stable pick, so a question keeps its background when you go back to it. */
export function backgroundFor(
  settings: ThemeSettings,
  key: string,
): string | null {
  if (settings.backgrounds.length === 0) {
    return null;
  }
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  }
  const index = Math.abs(hash) % settings.backgrounds.length;
  return settings.backgrounds[index] ?? null;
}

/** `regular` becomes 400, `bold-italic` becomes 700 italic. */
export function fontOptions(font: ThemeFont): {
  readonly weight: string;
  readonly style: string;
} {
  return {
    weight: font.variant === "bold" || font.variant === "bold-italic" ? "700" : "400",
    style: font.variant === "italic" || font.variant === "bold-italic" ? "italic" : "normal",
  };
}
