/**
 * WCAG contrast, enough for a theme check.
 *
 * A theme that sets its own paper must keep its ink readable on it. The tokens
 * are CSS variables, so the browser is asked for their computed colours and
 * this module only does the arithmetic. No DOM here.
 */

export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export interface ContrastPair {
  /** Token names, so a theme author knows where to look. */
  readonly foreground: string;
  readonly background: string;
  readonly ratio: number;
}

/** WCAG AA for normal text. Large headings get more leeway than this. */
export const MIN_CONTRAST = 4.5;

/** Text tokens and the surfaces they sit on. */
const PAIRS: readonly (readonly [string, string])[] = [
  ["--pq-ink", "--pq-paper"],
  ["--pq-ink", "--pq-slide"],
  ["--pq-muted", "--pq-paper"],
  ["--pq-accent-ink", "--pq-accent"],
  ["--pq-strip-ink", "--pq-strip"],
];

/** Every token the check reads, once each. */
export const CONTRAST_TOKENS: readonly string[] = [...new Set(PAIRS.flat())];

const NAMED: Readonly<Record<string, string>> = {
  black: "#000000",
  white: "#ffffff",
};

function channel(value: string): number | null {
  const text = value.trim();
  if (text.endsWith("%")) {
    const percent = Number(text.slice(0, -1));
    return Number.isFinite(percent) ? (percent / 100) * 255 : null;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function parseHex(hex: string): Rgba | null {
  const expand = (part: string): number => Number.parseInt(part + part, 16);
  if (hex.length === 3 || hex.length === 4) {
    return {
      r: expand(hex.slice(0, 1)),
      g: expand(hex.slice(1, 2)),
      b: expand(hex.slice(2, 3)),
      a: hex.length === 4 ? expand(hex.slice(3, 4)) / 255 : 1,
    };
  }
  if (hex.length === 6 || hex.length === 8) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1,
    };
  }
  return null;
}

const OKLCH = /^oklch\(([^)]*)\)$/;
const NUMBER = /^(-?(?:\d+\.?\d*|\.\d+))(%?)$/;
const ANGLE = /^(-?(?:\d+\.?\d*|\.\d+))(deg|grad|rad|turn)?$/;

function number(
  text: string,
): { readonly value: number; readonly percent: boolean } | null {
  const match = NUMBER.exec(text.trim());
  if (match === null) {
    return null;
  }
  return {
    value: Number(match[1]),
    percent: match[2] === "%",
  };
}

function angle(text: string): number | null {
  const match = ANGLE.exec(text.trim());
  if (match === null) {
    return null;
  }
  const value = Number(match[1]);
  switch (match[2]) {
    case "grad":
      return (value * 180) / 200;
    case "rad":
      return (value * 180) / Math.PI;
    case "turn":
      return value * 360;
    default:
      return value;
  }
}

/** Linear light in 0–1 to an 8-bit sRGB channel. */
function srgbChannel(linear: number): number {
  const value = Math.max(0, Math.min(1, linear));
  const encoded =
    value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.round(encoded * 255);
}

/**
 * OKLCH, because that is what a computed style keeps for a modern colour.
 * The matrices are the CSS Color 4 ones; clipping is honest for a contrast
 * check, which only needs the colour the screen can show.
 */
function parseOklch(body: string): Rgba | null {
  const [main = "", alpha] = body.split("/");
  const parts = main.trim().split(/\s+/);
  if (parts.length !== 3) {
    return null;
  }
  const lightness = number(parts[0] ?? "");
  const chroma = number(parts[1] ?? "");
  const hue = angle(parts[2] ?? "");
  const opacity = alpha === undefined ? 1 : parseAlpha(alpha);
  if (
    lightness === null ||
    chroma === null ||
    hue === null ||
    opacity === null
  ) {
    return null;
  }
  const l = Math.max(
    0,
    Math.min(1, lightness.percent ? lightness.value / 100 : lightness.value),
  );
  const c = Math.max(
    0,
    chroma.percent ? (chroma.value / 100) * 0.4 : chroma.value,
  );
  const radians = (hue * Math.PI) / 180;
  const a = c * Math.cos(radians);
  const b = c * Math.sin(radians);
  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: srgbChannel(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    g: srgbChannel(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    b: srgbChannel(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
    a: Math.max(0, Math.min(1, opacity)),
  };
}

function parseAlpha(text: string): number | null {
  const parsed = number(text);
  if (parsed === null) {
    return null;
  }
  return parsed.percent ? parsed.value / 100 : parsed.value;
}

/** `#fff`, `#ffffff`, `#ffffffcc`, `rgb(1 2 3 / 0.5)`, `oklch(70% 0.1 200)`, `black`. */
export function parseColor(value: string): Rgba | null {
  const text = value.trim().toLowerCase();
  const named = NAMED[text];
  if (named !== undefined) {
    return parseColor(named);
  }
  if (text.startsWith("#")) {
    return parseHex(text.slice(1));
  }
  const oklch = OKLCH.exec(text);
  if (oklch !== null) {
    return parseOklch(oklch[1] ?? "");
  }
  const fn = /^rgba?\(([^)]*)\)$/.exec(text);
  if (fn === null) {
    return null;
  }
  const parts = (fn[1] ?? "")
    .replace("/", " ")
    .split(/[,\s]+/)
    .filter((part) => part.length > 0);
  const r = channel(parts[0] ?? "");
  const g = channel(parts[1] ?? "");
  const b = channel(parts[2] ?? "");
  const a = parts[3] === undefined ? 1 : parseAlpha(parts[3]);
  if (r === null || g === null || b === null || a === null) {
    return null;
  }
  return { r, g, b, a };
}

function linear(value: number): number {
  const unit = value / 255;
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: Rgba): number {
  return (
    0.2126 * linear(color.r) +
    0.7152 * linear(color.g) +
    0.0722 * linear(color.b)
  );
}

export function contrastRatio(first: Rgba, second: Rgba): number {
  const one = relativeLuminance(first);
  const two = relativeLuminance(second);
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}

/**
 * Pairs below AA. A missing token, or a transparent one, is not a verdict:
 * the browser's own fallback may paint it, and guessing here helps nobody.
 */
export function checkContrast(
  colors: Readonly<Record<string, string>>,
): ContrastPair[] {
  const out: ContrastPair[] = [];
  for (const [foreground, background] of PAIRS) {
    const text = parseColor(colors[foreground] ?? "");
    const surface = parseColor(colors[background] ?? "");
    if (text === null || surface === null || text.a === 0 || surface.a === 0) {
      continue;
    }
    const ratio = contrastRatio(text, surface);
    if (ratio < MIN_CONTRAST) {
      out.push({
        foreground,
        background,
        ratio: Math.round(ratio * 100) / 100,
      });
    }
  }
  return out;
}
