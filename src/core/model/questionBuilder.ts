/**
 * Turning an AST question into the model.
 *
 * Every attribute is read exactly once, here. Unknown keys land in `extra`, so
 * a newer file still opens in an older player.
 */

import type { AstAttribute, AstQuestion } from "../syntax/ast";
import { ATTRIBUTES } from "../syntax/attributeRegistry";
import type { Diagnostic } from "../syntax/diagnostics";
import { parseMediaDescriptor } from "../values/media";
import { pickValue, type QuestionValue } from "../values/qval";
import {
  CONTINUE_VALUES,
  DIRECTION_VALUES,
  GRADING_VALUES,
  ORDER_VALUES,
  readBoolean,
  readEnum,
  readNumber,
  readScale,
  readSlider,
  readSteps,
  readTargets,
  readTimer,
  readType,
  SCORING_VALUES,
} from "./attributeReaders";
import { stableId } from "./ids";
import { parseParts } from "./parts";
import {
  attributeValues,
  ContinueMode,
  DEFAULT_HIT_RADIUS,
  DEFAULT_SCALE,
  Direction,
  firstAttributeValue,
  GradingMode,
  OrderMode,
  QuestionType,
  ScoringMethod,
  type BuildContext,
  type QuestionModel,
} from "./question";

/** Types where every answer is part of the truth: order, pairs or blanks. */
const ALL_ANSWERS_ARE_CORRECT: ReadonlySet<QuestionType> = new Set([
  QuestionType.List,
  QuestionType.Sort,
  QuestionType.Rank,
  QuestionType.Match,
  QuestionType.Cloze,
  QuestionType.Hotspot,
  QuestionType.Classification,
  QuestionType.Diagram,
]);

/** Anything the registry does not know lands in `extra`, so nothing is lost. */
const KNOWN_KEYS: ReadonlySet<string> = new Set(
  ATTRIBUTES.map((attribute) => attribute.key),
);

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
    tolerance: readNumber(attributes, "Tolerance", null, diagnostics, location),
    unit: firstAttributeValue(attributes, "Unit") ?? null,
    slider: readSlider(attributes, diagnostics, location),
    negate: readBoolean(attributes, "Negate", false, diagnostics, location),
    feedback: attributeValues(attributes, "Feedback"),
    suggestions: attributeValues(attributes, "Suggest"),
    rows: attributeValues(attributes, "Rows"),
    scale: readScale(attributes, DEFAULT_SCALE),
    multiple: readBoolean(attributes, "Multiple", false, diagnostics, location),
    parts: parseParts(attributeValues(attributes, "Parts")),
    buckets: attributeValues(attributes, "Buckets"),
    targets: readTargets(attributes, diagnostics, location),
    hitRadius:
      readNumber(
        attributes,
        "HitRadius",
        DEFAULT_HIT_RADIUS,
        diagnostics,
        location,
      ) ?? DEFAULT_HIT_RADIUS,
    playLimit: readNumber(attributes, "PlayLimit", null, diagnostics, location),
    wager: readBoolean(attributes, "Wager", false, diagnostics, location),
    buzzer: readBoolean(attributes, "Buzzer", false, diagnostics, location),
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
    stepTransition: firstAttributeValue(attributes, "StepTransition") ?? null,
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
