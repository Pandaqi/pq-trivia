/**
 * Turning an AST question into the model.
 *
 * Every attribute is read exactly once, here. Unknown keys land in `extra`, so
 * a newer file still opens in an older player.
 */

import type { AstAttribute, AstQuestion } from "../syntax/ast";
import { ATTRIBUTES } from "../syntax/attributeRegistry";
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
import { parseMediaDescriptor } from "../values/media";
import { pickValue, type QuestionValue } from "../values/qval";
import { stableId } from "./ids";
import {
  isStepToken,
  isStepTransition,
  STEP_PARTS,
  STEP_TRANSITIONS,
} from "./steps";
import {
  attributeValues,
  ContinueMode,
  detectType,
  Direction,
  firstAttributeValue,
  GradingMode,
  OrderMode,
  QuestionType,
  ScoringMethod,
  type BuildContext,
  type QuestionModel,
} from "./question";

const SCORING_VALUES: readonly ScoringMethod[] = [
  ScoringMethod.AllOrNothing,
  ScoringMethod.Partial,
  ScoringMethod.PerCorrect,
];
const GRADING_VALUES: readonly GradingMode[] = [
  GradingMode.Exact,
  GradingMode.Normalized,
  GradingMode.Fuzzy,
];
const ORDER_VALUES: readonly OrderMode[] = [OrderMode.Keep, OrderMode.Shuffle];
const DIRECTION_VALUES: readonly Direction[] = [
  Direction.Auto,
  Direction.Ltr,
  Direction.Rtl,
];
const CONTINUE_VALUES: readonly ContinueMode[] = [
  ContinueMode.Always,
  ContinueMode.OnCorrect,
  ContinueMode.OnWrong,
];

/** Types where every answer is part of the truth: order, pairs or blanks. */
const ALL_ANSWERS_ARE_CORRECT: ReadonlySet<QuestionType> = new Set([
  QuestionType.List,
  QuestionType.Sort,
  QuestionType.Match,
  QuestionType.Cloze,
]);

/** Anything the registry does not know lands in `extra`, so nothing is lost. */
const KNOWN_KEYS: ReadonlySet<string> = new Set(
  ATTRIBUTES.map((attribute) => attribute.key),
);

function readBoolean(
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

function readNumber(
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
      {
        location,
      },
    ),
  );
  return fallback;
}

function readEnum<T extends string>(
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
      {
        location,
        suggestion: `Allowed: ${allowed.join(", ")}.`,
      },
    ),
  );
  return fallback;
}

/** A typo in `Steps` costs a step, so it is worth a word. */
function readSteps(
  attributes: readonly AstAttribute[],
  diagnostics: Diagnostic[],
  location: SourceLocation,
): readonly string[] {
  const raw = attributeValues(attributes, "Steps");
  for (const entry of raw.flatMap((value) => value.split("|"))) {
    const token = entry.trim();
    if (
      token.length === 0 ||
      isStepToken(token) ||
      isStepTransition(token)
    ) {
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

function readTimer(
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
      {
        location,
        suggestion: "Try 90, 1:30 or 1m30s.",
      },
    ),
  );
  return null;
}

function readType(
  attributes: readonly AstAttribute[],
  diagnostics: Diagnostic[],
  location: SourceLocation,
): QuestionType {
  const declared = firstAttributeValue(attributes, "Type");
  if (
    declared === undefined ||
    coerceEnum(declared, QUESTION_TYPES) !== undefined
  ) {
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

/**
 * Screens may stay unanswered. List, sort, match and cloze treat every answer as
 * correct. A single answer is the answer. Otherwise the first answer wins.
 */
function pickCorrect(
  type: QuestionType,
  answers: readonly QuestionValue[],
  declared: readonly QuestionValue[],
): readonly QuestionValue[] {
  if (declared.length > 0) {
    return declared;
  }
  const isScreen =
    type === QuestionType.Section ||
    type === QuestionType.Start ||
    type === QuestionType.End;
  if (isScreen) {
    return [];
  }
  if (ALL_ANSWERS_ARE_CORRECT.has(type) || answers.length === 1) {
    return [...answers];
  }
  const first = answers[0];
  return first === undefined ? [] : [first];
}

function collectExtra(
  attributes: readonly AstAttribute[],
): Readonly<Record<string, string[]>> {
  const extra: Record<string, string[]> = {};
  for (const attribute of attributes) {
    if (KNOWN_KEYS.has(attribute.key)) {
      continue;
    }
    const bucket = extra[attribute.key] ?? [];
    bucket.push(...attribute.values);
    extra[attribute.key] = bucket;
  }
  return extra;
}

export function createQuestion(
  node: AstQuestion,
  context: BuildContext,
  diagnostics: Diagnostic[],
): QuestionModel {
  const attributes = node.attributes;
  const location = node.location;
  const { symbols } = context;

  const questionValues = attributeValues(attributes, "Question").map((raw) =>
    pickValue(raw, symbols),
  );
  const answerValues = attributeValues(attributes, "Answers").map((raw) =>
    pickValue(raw, symbols),
  );
  const correctValues = attributeValues(attributes, "Correct").map((raw) =>
    pickValue(raw, symbols),
  );
  const type = readType(attributes, diagnostics, location);

  const language =
    firstAttributeValue(attributes, "Language") ?? context.defaultLanguage;
  const id =
    firstAttributeValue(attributes, "ID") ??
    stableId("q", [
      language ?? "",
      type,
      questionValues.map((value) => value.text).join(" "),
      answerValues.map((value) => value.text).join("|"),
    ]);

  return {
    id,
    type,
    round:
      firstAttributeValue(attributes, "Section") !== undefined
        ? null
        : context.round,
    text: questionValues,
    answers: answerValues,
    correct: pickCorrect(type, answerValues, correctValues),
    alsoAccept: attributeValues(attributes, "AlsoAccept"),
    reject: attributeValues(attributes, "Reject"),
    media: attributeValues(attributes, "Media").map((raw) =>
      parseMediaDescriptor(pickValue(raw, symbols).text),
    ),
    alt: firstAttributeValue(attributes, "Alt") ?? null,
    printFallback: firstAttributeValue(attributes, "PrintFallback") ?? null,
    categories: attributeValues(attributes, "Category"),
    authors: attributeValues(attributes, "Author"),
    comments: attributeValues(attributes, "Comment").map((raw) =>
      pickValue(raw, symbols),
    ),
    hints: attributeValues(attributes, "Hints").map((raw) =>
      pickValue(raw, symbols),
    ),
    sources: attributeValues(attributes, "Sources"),
    explanation: firstAttributeValue(attributes, "Explanation") ?? null,
    description: firstAttributeValue(attributes, "Description") ?? null,
    secret: firstAttributeValue(attributes, "Secret") ?? null,
    score:
      readNumber(
        attributes,
        "Score",
        context.defaultScore,
        diagnostics,
        location,
      ) ?? context.defaultScore,
    scoring: readEnum(
      attributes,
      "Scoring",
      SCORING_VALUES,
      ScoringMethod.AllOrNothing,
      diagnostics,
      location,
    ),
    grading: readEnum(
      attributes,
      "Grading",
      GRADING_VALUES,
      GradingMode.Normalized,
      diagnostics,
      location,
    ),
    fuzzyDistance: readNumber(
      attributes,
      "FuzzyDistance",
      null,
      diagnostics,
      location,
    ),
    range: readNumber(attributes, "Range", null, diagnostics, location),
    timerMs: readTimer(attributes, diagnostics, location),
    answersOrder: readEnum(
      attributes,
      "AnswersOrder",
      ORDER_VALUES,
      OrderMode.Keep,
      diagnostics,
      location,
    ),
    mediaOrder: readEnum(
      attributes,
      "MediaOrder",
      ORDER_VALUES,
      OrderMode.Keep,
      diagnostics,
      location,
    ),
    placeAt: readNumber(attributes, "PlaceAt", null, diagnostics, location),
    placeBefore: attributeValues(attributes, "PlaceBefore"),
    placeAfter: attributeValues(attributes, "PlaceAfter"),
    layout: firstAttributeValue(attributes, "Layout") ?? null,
    background: firstAttributeValue(attributes, "Background") ?? null,
    colorScheme: firstAttributeValue(attributes, "ColorScheme") ?? null,
    transition: firstAttributeValue(attributes, "Transition") ?? null,
    reveal: firstAttributeValue(attributes, "Reveal") ?? null,
    steps: readSteps(attributes, diagnostics, location),
    stepTransition:
      firstAttributeValue(attributes, "StepTransition") ?? null,
    direction: readEnum(
      attributes,
      "Direction",
      DIRECTION_VALUES,
      Direction.Auto,
      diagnostics,
      location,
    ),
    classes: attributeValues(attributes, "Class"),
    printFlags: attributeValues(attributes, "Print"),
    buttons: attributeValues(attributes, "Buttons"),
    credits: attributeValues(attributes, "Credits"),
    height: firstAttributeValue(attributes, "Height") ?? null,
    script: firstAttributeValue(attributes, "Script") ?? null,
    when: firstAttributeValue(attributes, "When") ?? null,
    unlock: firstAttributeValue(attributes, "Unlock") ?? null,
    continueMode: readEnum(
      attributes,
      "Continue",
      CONTINUE_VALUES,
      ContinueMode.Always,
      diagnostics,
      location,
    ),
    variant: firstAttributeValue(attributes, "Variant") ?? null,
    language,
    translation: firstAttributeValue(attributes, "Translation") ?? null,
    hiddenAtPlay: readBoolean(
      attributes,
      "HiddenAtPlay",
      false,
      diagnostics,
      location,
    ),
    hiddenAtExport: readBoolean(
      attributes,
      "HiddenAtExport",
      false,
      diagnostics,
      location,
    ),
    formatText: readBoolean(
      attributes,
      "FormatText",
      true,
      diagnostics,
      location,
    ),
    syncAll: readBoolean(attributes, "SyncAll", false, diagnostics, location),
    extra: collectExtra(attributes),
    location,
  };
}
