/**
 * Team colours. Bright, and the same colour for the same team everywhere.
 *
 * A team's badge wears its colour, the board wears the same one, and a phone in
 * a live room works it out from the name alone. A room of four teams should be
 * readable from the back.
 */

export interface TeamColour {
  /** The fill. Solid, no gradients, no pastels. */
  readonly base: string;
  /** Text that reads on it. Picked by hand, one entry at a time. */
  readonly ink: string;
}

const LIGHT = "#fffdf7";
const DARK = "#1a171c";

/** Twelve is the team limit, so twelve colours. Then it starts again. */
export const TEAM_COLOURS: readonly TeamColour[] = [
  { base: "#e63946", ink: LIGHT },
  { base: "#f0742a", ink: DARK },
  { base: "#f2b705", ink: DARK },
  { base: "#9bd60b", ink: DARK },
  { base: "#16a34a", ink: LIGHT },
  { base: "#0d9488", ink: LIGHT },
  { base: "#38bdf8", ink: DARK },
  { base: "#2563eb", ink: LIGHT },
  { base: "#7c3aed", ink: LIGHT },
  { base: "#db2777", ink: LIGHT },
  { base: "#fb7185", ink: DARK },
  { base: "#6ee7b7", ink: DARK },
];

const FALLBACK: TeamColour = { base: "#e63946", ink: LIGHT };

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function at(index: number): TeamColour {
  const count = TEAM_COLOURS.length;
  const safe = ((index % count) + count) % count;
  return TEAM_COLOURS[safe] ?? FALLBACK;
}

/**
 * A colour from the name alone. For a phone that knows only its own team.
 *
 * Two names can land on the same colour, which is why a session with two or
 * more teams uses `assignTeamColours` instead.
 */
export function teamColourFor(name: string): TeamColour {
  const clean = name.trim().toLowerCase();
  return clean.length === 0
    ? FALLBACK
    : at(hashText(clean) % TEAM_COLOURS.length);
}

/**
 * One colour per team, all different, for one session.
 *
 * Give it every team name and it sorts them, then hands out the palette by
 * position. Same names, same answer, on the big screen or a phone. Two teams
 * never share a colour until the palette runs out at twelve, which is the team
 * limit anyway.
 */
export function assignTeamColours(
  names: readonly string[],
): ReadonlyMap<string, TeamColour> {
  const unique = [
    ...new Set(
      names.map((name) => name.trim()).filter((name) => name.length > 0),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const colours = new Map<string, TeamColour>();
  unique.forEach((name, index) => colours.set(name, at(index)));
  return colours;
}

/** The session's answer, or a colour from the name when the team is unknown. */
export function colourFor(
  colours: ReadonlyMap<string, TeamColour>,
  name: string,
): TeamColour {
  return colours.get(name.trim()) ?? teamColourFor(name);
}

/** The two properties a badge needs. `style` takes a string, so here it is. */
export function teamStyle(colour: TeamColour): string {
  return `--pq-team:${colour.base};--pq-team-ink:${colour.ink}`;
}
