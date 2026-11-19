/**
 * One accent per round, like the old exports: teal, purple, berry, honey.
 *
 * Same round, same colour, on screen and on paper. Kept small and dull enough
 * to stay neutral in a bright room and readable in greyscale.
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
