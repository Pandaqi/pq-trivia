/**
 * Animation presets. Names map to CSS classes; the theme owns the keyframes.
 *
 * The base player links `paper.css`, which carries `fade`, `slide-up` and
 * `shake`. The rest live in this entry and cost nothing until imported.
 */

export enum AnimationId {
  Fade = "fade",
  SlideLeft = "slide-left",
  SlideRight = "slide-right",
  SlideUp = "slide-up",
  ZoomIn = "zoom-in",
  ZoomOut = "zoom-out",
  FlipX = "flip-x",
  Wipe = "wipe",
  BlurIn = "blur-in",
  StaggerChildren = "stagger-children",
  Typewriter = "typewriter",
  CountUp = "count-up",
  Shake = "shake",
  Pulse = "pulse",
  Confetti = "confetti",
  None = "none",
}

export interface AnimationPreset {
  readonly id: AnimationId;
  readonly className: string;
  /** Milliseconds. Budget: 300ms per transition. */
  readonly durationMs: number;
  readonly default?: boolean;
}

const preset = (
  id: AnimationId,
  durationMs: number,
  isDefault = false,
): AnimationPreset => ({
  id,
  className: `pq-anim-${id}`,
  durationMs,
  ...(isDefault ? { default: true } : {}),
});

export const ANIMATIONS: Readonly<Record<AnimationId, AnimationPreset>> = {
  [AnimationId.Fade]: preset(AnimationId.Fade, 180, true),
  [AnimationId.SlideLeft]: preset(AnimationId.SlideLeft, 220),
  [AnimationId.SlideRight]: preset(AnimationId.SlideRight, 220),
  [AnimationId.SlideUp]: preset(AnimationId.SlideUp, 220, true),
  [AnimationId.ZoomIn]: preset(AnimationId.ZoomIn, 240),
  [AnimationId.ZoomOut]: preset(AnimationId.ZoomOut, 240),
  [AnimationId.FlipX]: preset(AnimationId.FlipX, 300),
  [AnimationId.Wipe]: preset(AnimationId.Wipe, 260),
  [AnimationId.BlurIn]: preset(AnimationId.BlurIn, 260),
  [AnimationId.StaggerChildren]: preset(AnimationId.StaggerChildren, 280),
  [AnimationId.Typewriter]: preset(AnimationId.Typewriter, 300),
  [AnimationId.CountUp]: preset(AnimationId.CountUp, 300),
  [AnimationId.Shake]: preset(AnimationId.Shake, 240, true),
  [AnimationId.Pulse]: preset(AnimationId.Pulse, 240),
  [AnimationId.Confetti]: preset(AnimationId.Confetti, 300),
  [AnimationId.None]: preset(AnimationId.None, 0),
};

const BY_NAME = new Map<string, AnimationPreset>(
  Object.values(ANIMATIONS).map((entry) => [entry.id, entry]),
);

export function findAnimation(
  raw: string | null | undefined,
): AnimationPreset | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  return BY_NAME.get(raw.trim().toLowerCase() as AnimationId) ?? null;
}

/** The class to add, or null for "no animation". Unknown names fall back. */
export function animationClass(
  raw: string | null | undefined,
  fallback: AnimationId = AnimationId.Fade,
): string | null {
  const found = findAnimation(raw);
  if (found !== null) {
    return found.id === AnimationId.None ? null : found.className;
  }
  if (raw !== null && raw !== undefined && raw.trim().length > 0) {
    return ANIMATIONS[fallback].className;
  }
  return null;
}

export const DEFAULT_ANIMATIONS: readonly AnimationId[] = Object.values(
  ANIMATIONS,
)
  .filter((entry) => entry.default === true)
  .map((entry) => entry.id);
