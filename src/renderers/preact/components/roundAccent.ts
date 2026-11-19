/**
 * Round colours. A round gets its own hue from the seed, so a quiz looks the
 * same every night. Each question in the round takes a step from light to
 * dark, like the pages of a booklet.
 *
 * The print sheet keeps the old fixed palette: ink is expensive.
 */

export const ROUND_ACCENTS: readonly string[] = [
  "#3f7f72",
  "#7954a3",
  "#a9556b",
  "#b07d1c",
  "#4c6b8a",
];

export function roundAccent(roundNumber: number | null): string {
  const index = Math.max(roundNumber ?? 1, 1) - 1;
  return ROUND_ACCENTS[index % ROUND_ACCENTS.length] as string;
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
  const saturation = 38 + ((hash >>> 9) % 14);
  const baseLightness = 40 + ((hash >>> 17) % 9);
  const steps = Math.max(count, 1);
  const span =
    steps <= 1 ? 0.35 : Math.min(1, Math.max(0, (position - 0.5) / steps));
  const lightness = 76 - span * 38;
  return {
    base: hsl(hue, saturation, baseLightness),
    shade: hsl(hue, saturation, lightness),
    ink: lightness > 58 ? "#221d26" : "#fffdf7",
  };
}
