/**
 * Points and targets, in percent.
 *
 * A hotspot answer is `120,80` in percent of the image, not in pixels. The map
 * looks the same on a phone and on a projector, and an author can read the
 * numbers off any image editor that shows a percentage. The helper in
 * `examples/hotspot.html` prints them.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface SliderRange {
  readonly min: number;
  readonly max: number;
}

export interface HotspotTarget extends Point {
  readonly label: string;
}

/** `20,40`, `20%, 40%`, `20 , 40`. Null when either number is missing. */
export function parsePoint(text: string): Point | null {
  const parts = text
    .replaceAll("%", "")
    .split(/[,;]/)
    .map((entry) => entry.trim());
  const x = numberOf(parts[0]);
  const y = numberOf(parts[1]);
  return x === null || y === null ? null : { x, y };
}

function numberOf(raw: string | undefined): number | null {
  if (raw === undefined || raw.length === 0) {
    return null;
  }
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/** `0..100`, `0-100`, or `0 | 100`. Used by the slider and the number pad. */
export function parseSliderRange(text: string): SliderRange | null {
  const parts = text.includes("|") ? text.split("|") : text.split(/\.\.|-/);
  const min = numberOf(parts[0]?.trim());
  const max = numberOf(parts[1]?.trim());
  if (min === null || max === null || min >= max) {
    return null;
  }
  return { min, max };
}

/** `Front door @ 20,40` keeps the label; a bare point gets none. */
export function parseTarget(text: string): HotspotTarget | null {
  const at = text.lastIndexOf("@");
  const point = parsePoint(at >= 0 ? text.slice(at + 1) : text);
  if (point === null) {
    return null;
  }
  const label = at >= 0 ? text.slice(0, at).trim() : text.trim();
  return { label, x: point.x, y: point.y };
}

/** Straight-line distance, in percent of the image. */
export function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The nearest of the accepted points, and how far away it is. */
export function nearestPoint(
  given: Point,
  points: readonly Point[],
): { point: Point; distance: number } | null {
  let best: { point: Point; distance: number } | null = null;
  for (const point of points) {
    const distance = distanceBetween(given, point);
    if (best === null || distance < best.distance) {
      best = { point, distance };
    }
  }
  return best;
}

export function insidePercent(value: number): boolean {
  return value >= 0 && value <= 100;
}
