/**
 * Round colours. A round gets its own hue from the seed, so a quiz looks the
 * same every night. Each question in the round takes a step from light to
 * dark, like the pages of a booklet.
 *
 * Print uses the same idea with a flatter, darker set of hues: ink is
 * expensive, and a page of pastel bars costs a fortune.
 *
 * Text on a round colour is picked by measured contrast, never by a guess.
 * A mustard bar with white text is unreadable from the back of a room.
 */

/** White and near-black. Both are used elsewhere as the two ink options. */
export const INK_LIGHT = "#fffdf7";
export const INK_DARK = "#1a171c";

function channel(value: number): number {
  const part = value / 255;
  return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4;
}

function luminance(red: number, green: number, blue: number): number {
  return (
    0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  );
}

function hexToRgb(hex: string): readonly [number, number, number] | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (match === null) {
    return null;
  }
  const digits = match[1] ?? "";
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((digit) => `${digit}${digit}`)
          .join("")
      : digits;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

/** `hsl(200 45% 60%)`, the only other form this file produces. */
function hslToRgb(text: string): readonly [number, number, number] | null {
  const match = /^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)$/i.exec(
    text.trim(),
  );
  if (match === null) {
    return null;
  }
  const hue = Number(match[1]) / 360;
  const saturation = Number(match[2]) / 100;
  const lightness = Number(match[3]) / 100;
  if (saturation === 0) {
    const grey = Math.round(lightness * 255);
    return [grey, grey, grey];
  }
  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const toRgb = (offset: number): number => {
    let value = hue + offset;
    if (value < 0) {
      value += 1;
    }
    if (value > 1) {
      value -= 1;
    }
    if (value < 1 / 6) {
      return p + (q - p) * 6 * value;
    }
    if (value < 1 / 2) {
      return q;
    }
    if (value < 2 / 3) {
      return p + (q - p) * (2 / 3 - value) * 6;
    }
    return p;
  };
  return [
    Math.round(toRgb(1 / 3) * 255),
    Math.round(toRgb(0) * 255),
    Math.round(toRgb(-1 / 3) * 255),
  ];
}

function rgbOf(color: string): readonly [number, number, number] | null {
  return hexToRgb(color) ?? hslToRgb(color);
}

function relativeLuminance(red: number, green: number, blue: number): number {
  return luminance(red, green, blue);
}

/** WCAG contrast between two luminance values, 1:1 up to 21:1. */
export function contrastRatio(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): number {
  const a = relativeLuminance(first[0], first[1], first[2]);
  const b = relativeLuminance(second[0], second[1], second[2]);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

const LIGHT_RGB = hexToRgb(INK_LIGHT) ?? [255, 253, 247];
const DARK_RGB = hexToRgb(INK_DARK) ?? [26, 23, 28];

/**
 * White or near-black, whichever reads better on `background`.
 *
 * Falls back to white for a colour this file cannot read, which is what every
 * older call site assumed anyway.
 */
export function inkOn(background: string): string {
  const rgb = rgbOf(background);
  if (rgb === null) {
    return INK_LIGHT;
  }
  return contrastRatio(rgb, LIGHT_RGB) >= contrastRatio(rgb, DARK_RGB)
    ? INK_LIGHT
    : INK_DARK;
}

/**
 * A round colour from the whole wheel, picked by the seed.
 *
 * Golden-angle steps put neighbouring rounds opposite each other, so a quiz
 * with four rounds never looks like one colour taken down four shades. Same
 * seed, same colours, every night.
 */
export function roundAccent(roundNumber: number | null, seed = ""): string {
  const index = Math.max(roundNumber ?? 1, 1) - 1;
  const hash = hashText(`${seed}:accent`);
  const hue = ((hash % 360) + index * 137.508) % 360;
  const saturation = 48 + ((hash >>> 9) % 18);
  const lightness = 38 + ((hash >>> 17) % 12);
  return hsl(hue, saturation, lightness);
}

/** The matching text colour, measured, not assumed. */
export function roundAccentInk(roundNumber: number | null, seed = ""): string {
  return inkOn(roundAccent(roundNumber, seed));
}

export interface RoundColour {
  /** The round's base colour. Borders, kickers, the strip. */
  readonly base: string;
  /** This question's step between light and dark. */
  readonly shade: string;
  /** Readable text on either colour. */
  readonly ink: string;
}

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function hsl(hue: number, saturation: number, lightness: number): string {
  return `hsl(${Math.round(hue)} ${Math.round(saturation)}% ${Math.round(lightness)}%)`;
}

/**
 * `position` is one-based inside the round. A section page asks for position 0
 * and gets a light tint, so the round announces itself before it darkens.
 */
export function roundColour(
  seed: string,
  roundId: string | null,
  position: number,
  count: number,
): RoundColour {
  const hash = hashText(`${seed}:${roundId ?? "round"}`);
  const hue = hash % 360;
  const saturation = 44 + ((hash >>> 9) % 20);
  const baseLightness = 38 + ((hash >>> 17) % 10);
  const steps = Math.max(count, 1);
  const span =
    steps <= 1 ? 0.35 : Math.min(1, Math.max(0, (position - 0.5) / steps));
  const lightness = 76 - span * 38;
  const base = hsl(hue, saturation, baseLightness);
  const shade = hsl(hue, saturation, lightness);
  // Both the strip and the answer bubbles sit on `shade`. One ink, one check.
  return { base, shade, ink: inkOn(shade) };
}
