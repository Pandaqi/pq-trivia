/**
 * Step-by-step reveals.
 *
 * `Steps => media | question | answers` shows one part at a time. Every entry
 * adds to what is already on screen, so the third step still shows the video.
 * `all` brings in everything that is left.
 *
 * An animation name between two parts sets the transition for what follows:
 * `media | fade | question | slide-up | answers`. It stays in force until
 * another name changes it, so one `fade` at the front covers the rest.
 *
 * A part nobody names joins the last step. That keeps a short list honest: the
 * screen always ends complete.
 */

export enum StepPart {
  Media = "media",
  Question = "question",
  Answers = "answers",
  Comments = "comments",
  Hints = "hints",
  Sources = "sources",
  Explanation = "explanation",
}

export const STEP_PARTS: readonly StepPart[] = Object.values(StepPart);

/**
 * Animation names a `Steps` line may use.
 *
 * A copy of `AnimationId` in `animations/registry.ts`. Core cannot import the
 * animation layer, and a test fails when the two lists disagree.
 */
export const STEP_TRANSITIONS: readonly string[] = [
  "fade",
  "slide-left",
  "slide-right",
  "slide-up",
  "zoom-in",
  "zoom-out",
  "flip-x",
  "wipe",
  "blur-in",
  "stagger-children",
  "typewriter",
  "count-up",
  "shake",
  "pulse",
  "confetti",
  "none",
];

/** `all`, and the two spellings nobody has to remember. */
const ALL_TOKENS: ReadonlySet<string> = new Set(["all", "everything", "*"]);

const BY_NAME = new Map<string, StepPart>(
  STEP_PARTS.map((part) => [part, part]),
);

const TRANSITIONS = new Set<string>(STEP_TRANSITIONS);

export function stepPartOf(raw: string): StepPart | null {
  return BY_NAME.get(raw.trim().toLowerCase()) ?? null;
}

export function isAllStepToken(raw: string): boolean {
  return ALL_TOKENS.has(raw.trim().toLowerCase());
}

/** True for a part name or for `all`. Used to warn about typos. */
export function isStepToken(raw: string): boolean {
  return isAllStepToken(raw) || stepPartOf(raw) !== null;
}

export function isStepTransition(raw: string): boolean {
  return TRANSITIONS.has(raw.trim().toLowerCase());
}

function tokensOf(raw: readonly string[]): string[] {
  return raw
    .flatMap((value) => value.split("|"))
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);
}

/** A part, and how it came in. Null means "use the default animation". */
export interface PartTransition {
  readonly part: StepPart;
  readonly transition: string | null;
}

/** One step: everything on screen by then, and what just arrived. */
export interface Step {
  readonly parts: readonly StepPart[];
  readonly entered: readonly PartTransition[];
}

function enteredAt(
  parts: readonly StepPart[],
  transition: string | null,
): readonly PartTransition[] {
  return parts.map((part) => ({ part, transition }));
}

/**
 * One step per part. An empty result means "no staging": show the whole
 * question at once.
 */
export function parseSteps(raw: readonly string[]): readonly Step[] {
  const steps: Step[] = [];
  let parts: StepPart[] = [];
  let pending: string | null = null;
  for (const token of tokensOf(raw)) {
    if (isAllStepToken(token)) {
      const added = STEP_PARTS.filter((part) => !parts.includes(part));
      if (added.length > 0) {
        parts = [...STEP_PARTS];
        steps.push({ parts: [...parts], entered: enteredAt(added, pending) });
      }
      continue;
    }
    const part = stepPartOf(token);
    if (part !== null) {
      if (parts.includes(part)) {
        continue;
      }
      parts = [...parts, part];
      steps.push({ parts: [...parts], entered: enteredAt([part], pending) });
      continue;
    }
    // Not a part, so it is a transition. Sticky, so one name covers the rest.
    pending = transitionOf(token);
  }

  const last = steps[steps.length - 1];
  if (last !== undefined) {
    const added = STEP_PARTS.filter((part) => !last.parts.includes(part));
    if (added.length > 0) {
      steps[steps.length - 1] = {
        parts: [...STEP_PARTS],
        entered: [...last.entered, ...enteredAt(added, null)],
      };
    }
  }
  return steps;
}

/** An unknown word is kept as-is: the renderer shows it plainly. */
function transitionOf(token: string): string {
  return token === "none" ? "none" : token;
}

/** The parts on screen at `index`, clamped to the plan that exists. */
export function partsAt(
  steps: readonly Step[],
  index: number,
): readonly StepPart[] {
  if (steps.length === 0) {
    return STEP_PARTS;
  }
  const clamped = Math.min(Math.max(index, 0), steps.length - 1);
  return steps[clamped]?.parts ?? STEP_PARTS;
}

/** Quiz-wide defaults, so a whole quiz can say this once in its header. */
export interface StepDefaults {
  readonly defaultSteps?: readonly string[];
  readonly defaultStepTransition?: string | null;
}

/** What a renderer needs to know about the parts on screen. */
export interface StepViewModel {
  readonly index: number;
  readonly total: number;
  /** Parts on screen now. The full list when nothing is staged. */
  readonly visible: readonly StepPart[];
  /** How each visible part arrived, in order. Empty when nothing is staged. */
  readonly entered: readonly PartTransition[];
  /** Animation for a part that no step named. */
  readonly transition: string | null;
  /** True while a step is still waiting. */
  readonly more: boolean;
}

export interface StepViewInput {
  /** The question's own list, or empty to take the quiz default. */
  readonly steps: readonly string[];
  /** The question's own animation, or null to take the quiz default. */
  readonly transition: string | null;
  readonly defaults: StepDefaults;
  readonly step: number;
  /** The answer is up, or the host asked for everything. */
  readonly complete: boolean;
}

export function stepViewOf(input: StepViewInput): StepViewModel {
  const declared =
    input.steps.length > 0 ? input.steps : (input.defaults.defaultSteps ?? []);
  const plan = parseSteps(declared);
  const total = Math.max(plan.length, 1);
  const index = Math.min(Math.max(input.step, 0), total - 1);
  const finished = input.complete || plan.length === 0;
  const transition =
    input.transition ?? input.defaults.defaultStepTransition ?? null;
  if (finished) {
    return {
      index: total - 1,
      total,
      visible: STEP_PARTS,
      entered: [],
      transition,
      more: false,
    };
  }
  return {
    index,
    total,
    visible: partsAt(plan, index),
    entered: plan.slice(0, index + 1).flatMap((step) => step.entered),
    transition,
    more: index < total - 1,
  };
}
