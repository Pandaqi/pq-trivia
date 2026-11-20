/**
 * Reading one attribute at a time.
 *
 * Every reader warns once and falls back, so a typo costs a value, not the
 * question. The table of allowed values stays here too, where the reader that
 * needs it can see it.
 */

import type { AstAttribute } from "../syntax/ast";
import { QUESTION_TYPES } from "../syntax/attributes";
import {
  DiagnosticCodes,
  syntaxWarning,
  type Diagnostic,
  type SourceLocation,
} from "../syntax/diagnostics";
import {
  coerceBoolean,
  coerceDuration,
  coerceEnum,
  coerceNumber,
} from "../values/coerce";
import {
  parseSliderRange,
  parseTarget,
  type HotspotTarget,
  type SliderRange,
} from "../values/point";
import {
  detectType,
  Direction,
  firstAttributeValue,
  GradingMode,
  OrderMode,
  QuestionType,
  ScoringMethod,
  toQuestionType,
  ContinueMode,
} from "./question";
import {
  isStepToken,
  isStepTransition,
  STEP_PARTS,
  STEP_TRANSITIONS,
} from "./steps";

export const SCORING_VALUES: readonly ScoringMethod[] = [
  ScoringMethod.AllOrNothing,
  ScoringMethod.Partial,
  ScoringMethod.PerCorrect,
];
export const GRADING_VALUES: readonly GradingMode[] = [
  GradingMode.Exact,
  GradingMode.Normalized,
  GradingMode.Fuzzy,
];
export const ORDER_VALUES: readonly OrderMode[] = [
  OrderMode.Keep,
  OrderMode.Shuffle,
];
export const DIRECTION_VALUES: readonly Direction[] = [
  Direction.Auto,
  Direction.Ltr,
  Direction.Rtl,
];
export const CONTINUE_VALUES: readonly ContinueMode[] = [
  ContinueMode.Always,
  ContinueMode.OnCorrect,
  ContinueMode.OnWrong,
];

export function readBoolean(
  attributes: readonly AstAttribute[],
  key: string,
  fallback: boolean,
  diagnostics: Diagnostic[],
  location: SourceLocation,
): boolean {
  const raw = firstAttributeValue(attributes, key);
  if (raw === undefined) {
    return fallback;
  }
  const value = coerceBoolean(raw);
  if (value !== undefined) {
    return value;
  }
  diagnostics.push(
    syntaxWarning(
      DiagnosticCodes.InvalidBoolean,
      `"${key}" should be true or false, not "${raw}".`,
      { location, suggestion: "Use true, false, yes, no, on or off." },
    ),
  );
  return fallback;
}

export function readNumber(
  attributes: readonly AstAttribute[],
  key: string,
  fallback: number | null,
  diagnostics: Diagnostic[],
  location: SourceLocation,
): number | null {
  const raw = firstAttributeValue(attributes, key);
  if (raw === undefined) {
    return fallback;
  }
  const value = coerceNumber(raw);
  if (value !== undefined) {
    return value;
  }
  diagnostics.push(
    syntaxWarning(
      DiagnosticCodes.InvalidNumber,
      `"${key}" should be a number, not "${raw}".`,
      { location },
    ),
  );
  return fallback;
}

export function readEnum<T extends string>(
  attributes: readonly AstAttribute[],
  key: string,
  allowed: readonly T[],
  fallback: T,
  diagnostics: Diagnostic[],
  location: SourceLocation,
): T {
  const raw = firstAttributeValue(attributes, key);
  if (raw === undefined) {
    return fallback;
  }
  const value = coerceEnum(raw, allowed);
  if (value !== undefined) {
    return value;
  }
  diagnostics.push(
    syntaxWarning(
      DiagnosticCodes.InvalidValue,
      `"${key}" has an unknown value "${raw}".`,
      { location, suggestion: `Allowed: ${allowed.join(", ")}.` },
    ),
  );
  return fallback;
}

/** A typo in `Steps` costs a step, so it is worth a word. */
export function readSteps(
  attributes: readonly AstAttribute[],
  diagnostics: Diagnostic[],
  location: SourceLocation,
): readonly string[] {
  const raw = attributes
    .filter((attribute) => attribute.key === "Steps")
    .flatMap((attribute) => attribute.values);
  for (const entry of raw.flatMap((value) => value.split("|"))) {
    const token = entry.trim();
    if (token.length === 0 || isStepToken(token) || isStepTransition(token)) {
      continue;
    }
    diagnostics.push(
      syntaxWarning(
        DiagnosticCodes.InvalidValue,
        `"Steps" has an unknown part or transition "${token}".`,
        {
          location,
          suggestion: `Parts: ${STEP_PARTS.join(", ")} or all. Transitions: ${STEP_TRANSITIONS.join(", ")}.`,
        },
      ),
    );
  }
  return raw;
}

export function readTimer(
  attributes: readonly AstAttribute[],
  diagnostics: Diagnostic[],
  location: SourceLocation,
): number | null {
  const raw = firstAttributeValue(attributes, "Timer");
  if (raw === undefined) {
    return null;
  }
  const value = coerceDuration(raw);
  if (value !== undefined) {
    return value;
  }
  diagnostics.push(
    syntaxWarning(
      DiagnosticCodes.InvalidDuration,
      `"Timer" should be a duration, not "${raw}".`,
      { location, suggestion: "Try 90, 1:30 or 1m30s." },
    ),
  );
  return null;
}

export function readType(
  attributes: readonly AstAttribute[],
  diagnostics: Diagnostic[],
  location: SourceLocation,
): QuestionType {
  const declared = firstAttributeValue(attributes, "Type");
  if (declared === undefined || toQuestionType(declared) !== null) {
    return detectType(attributes);
  }
  diagnostics.push(
    syntaxWarning(
      DiagnosticCodes.UnknownType,
      `Unknown question type "${declared}".`,
      {
        location,
        suggestion: `Allowed: ${QUESTION_TYPES.join(", ")}. Falling back to open.`,
      },
    ),
  );
  return QuestionType.Open;
}

/** `Slider => 0..100`. A bad range is a warning, not a broken question. */
export function readSlider(
  attributes: readonly AstAttribute[],
  diagnostics: Diagnostic[],
  location: SourceLocation,
): SliderRange | null {
  const raw = firstAttributeValue(attributes, "Slider");
  if (raw === undefined) {
    return null;
  }
  const range = parseSliderRange(raw);
  if (range !== null) {
    return range;
  }
  diagnostics.push(
    syntaxWarning(
      DiagnosticCodes.InvalidNumber,
      `"Slider" should be two numbers, like 0..100, not "${raw}".`,
      { location },
    ),
  );
  return null;
}

/** `Targets => Front door @ 20,40`. Bad coordinates are named, not dropped. */
export function readTargets(
  attributes: readonly AstAttribute[],
  diagnostics: Diagnostic[],
  location: SourceLocation,
): readonly HotspotTarget[] {
  const targets: HotspotTarget[] = [];
  for (const value of attributes
    .filter((attribute) => attribute.key === "Targets")
    .flatMap((attribute) => attribute.values)) {
    const target = parseTarget(value);
    if (target === null) {
      diagnostics.push(
        syntaxWarning(
          DiagnosticCodes.InvalidValue,
          `"Targets" has no point in "${value}".`,
          { location, suggestion: "Write `Front door @ 20,40`, in percent." },
        ),
      );
      continue;
    }
    targets.push(
      target.label.length === 0
        ? { ...target, label: `Target ${targets.length + 1}` }
        : target,
    );
  }
  return targets;
}

export function readScale(
  attributes: readonly AstAttribute[],
  fallback: readonly string[],
): readonly string[] {
  const scale = attributes
    .filter((attribute) => attribute.key === "Scale")
    .flatMap((attribute) => attribute.values);
  return scale.length > 0 ? scale : fallback;
}
