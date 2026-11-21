/**
 * Grading. One pure function, shared by the browser, the results screen and
 * the CLI.
 *
 * Answers are compared by content ID or by normalized text. Never by position,
 * so a shuffle cannot change the grade.
 */

import { answerRefs } from "../model/answers";
import { groupedAnswers } from "../model/parts";
import {
  GradingMode,
  isMappingType,
  questionMaxScore,
  QuestionType,
  ScoringMethod,
  type QuestionModel,
} from "../model/question";
import {
  ResponseKind,
  isEmptyResponse,
  type Response,
} from "../session/responses";
import { answerKeyOf } from "../values/media";
import { matchText, normalizeText, parseNumber } from "./normalize";
import { closePoints, gradeKind, part, round2 } from "./parts";
import {
  gradeClassification,
  gradeDiagram,
  gradeHotspot,
  gradeMatrix,
  gradeOddOneOut,
  gradeParts,
} from "./interfaces";
import {
  GradeKind,
  type GradeOptions,
  type GradePart,
  type GradeResult,
} from "./types";
import type { PluginGrade } from "./plugins";
import { gradeList, gradeMatch, gradeRank, gradeSort } from "./structured";

export * from "./types";

const PAIR_SYMBOL = "~";

function modeOf(question: QuestionModel, options: GradeOptions): GradingMode {
  if (question.grading === GradingMode.Fuzzy) {
    return GradingMode.Fuzzy;
  }
  return options.grading ?? question.grading;
}

/** Per-correct counts the earned parts; partial counts the right picks. */
function splitPoints(
  question: QuestionModel,
  parts: readonly GradePart[],
  selectedCorrect: number,
  wanted: number,
  maxPoints: number,
): number {
  if (question.scoring === ScoringMethod.PerCorrect) {
    return round2(
      parts.reduce(
        (total, entry) => total + (entry.correct ? entry.points : 0),
        0,
      ),
    );
  }
  if (question.scoring === ScoringMethod.Partial) {
    return round2((maxPoints * selectedCorrect) / Math.max(wanted, 1));
  }
  return 0;
}

/**
 * Cloze keeps V2's scoring: every filled blank earns its share, even when the
 * question is not fully right.
 */
function clozePoints(
  question: QuestionModel,
  parts: readonly GradePart[],
  won: boolean,
): number {
  if (won) {
    return questionMaxScore(question);
  }
  const earned = parts.filter((entry) => entry.correct);
  if (question.scoring === ScoringMethod.PerCorrect) {
    return round2(earned.reduce((total, entry) => total + entry.points, 0));
  }
  return round2(
    (questionMaxScore(question) * earned.length) / Math.max(parts.length, 1),
  );
}

/** A widget that reports its own score is partial as soon as it has a value. */
function answeredKind(answered: boolean): GradeKind {
  if (answered) {
    return GradeKind.Partial;
  }
  return GradeKind.Unanswered;
}

function gradeOpen(
  question: QuestionModel,
  response: Response,
  options: GradeOptions,
): GradeResult {
  const given = response.kind === ResponseKind.Open ? response.text : "";
  const accepted = [
    ...question.correct.map((value) => value.text),
    ...question.alsoAccept,
  ];
  const match = matchText(given, accepted, {
    mode: modeOf(question, options),
    fuzzyDistance: options.fuzzyDistance ?? question.fuzzyDistance,
    reject: question.reject,
  });
  const maxPoints = questionMaxScore(question);
  const entry = part(
    "Answer",
    question.correct.map((value) => value.text).join(" / "),
    given,
    match.correct,
    maxPoints,
  );
  const answered = given.trim().length > 0;
  return {
    questionId: question.id,
    answered,
    correct: match.correct,
    kind: gradeKind(match.correct, answered, match.correct ? maxPoints : 0),
    points: match.correct ? maxPoints : 0,
    maxPoints,
    parts: [entry],
    normalizedGiven: [match.normalizedGiven],
    normalizedCorrect: [match.normalizedCorrect],
  };
}

function gradeNumber(
  question: QuestionModel,
  response: Response,
  margin: number,
  unit: string | null,
): GradeResult {
  const given = response.kind === ResponseKind.Range ? response.value : null;
  const expectedText =
    question.correct[0]?.text ?? question.answers[0]?.text ?? "";
  const expected = parseNumber(expectedText);
  const suffix = unit === null ? "" : ` ${unit}`;
  const won =
    given !== null && expected !== null && Math.abs(given - expected) <= margin;
  const maxPoints = questionMaxScore(question);
  // Skipped means skipped. Showing "your answer: —" and "correct answer: 1989"
  // for a question nobody touched is noise on the results page.
  if (given === null) {
    return {
      questionId: question.id,
      answered: false,
      correct: false,
      kind: GradeKind.Unanswered,
      points: 0,
      maxPoints,
      parts: [],
      normalizedGiven: [],
      normalizedCorrect: expected === null ? [] : [String(expected)],
    };
  }
  return {
    questionId: question.id,
    answered: true,
    correct: won,
    kind: won ? GradeKind.Correct : GradeKind.Wrong,
    points: won ? maxPoints : 0,
    maxPoints,
    parts: [
      part(
        "Number",
        margin === 0
          ? `${expectedText}${suffix}`
          : `${expectedText} ± ${margin}${suffix}`,
        `${given}${suffix}`,
        won,
        maxPoints,
      ),
    ],
    normalizedGiven: [String(given)],
    normalizedCorrect: expected === null ? [] : [String(expected)],
  };
}
function gradeRange(question: QuestionModel, response: Response): GradeResult {
  return gradeNumber(question, response, question.range ?? 0, null);
}
/** `Tolerance` is the margin, in the answer's own unit. */
function gradeEstimate(
  question: QuestionModel,
  response: Response,
): GradeResult {
  return gradeNumber(
    question,
    response,
    question.tolerance ?? question.range ?? 0,
    question.unit,
  );
}
function gradeChoice(
  question: QuestionModel,
  response: Response,
  _options: GradeOptions,
  mode: GradingMode,
): GradeResult {
  const refs = answerRefs(question);
  const selected =
    response.kind === ResponseKind.Choice ? response.selected : [];
  // A media answer is its file, not the alt text around it.
  const correctTexts = new Set(
    question.correct.map((value) => answerKeyOf(value.text)),
  );
  // `Negate => true` lists the true statements; the odd one out is the answer.
  const wanted = (ref: (typeof refs)[number]): boolean => {
    const hit = correctTexts.has(answerKeyOf(ref.value.text));
    return question.negate ? !hit : hit;
  };
  const correctIds = refs.filter(wanted).map((ref) => ref.id);
  const maxPoints = questionMaxScore(question);
  if (correctIds.length <= 1) {
    const wantedId = correctIds[0];
    const won =
      wantedId !== undefined &&
      selected.length === 1 &&
      selected[0] === wantedId;
    const expectedText = question.negate
      ? (refs.find((ref) => ref.id === wantedId)?.value.text ?? "")
      : (question.correct[0]?.text ?? "");
    const givenText =
      refs.find((ref) => selected.includes(ref.id))?.value.text ?? "";
    return {
      questionId: question.id,
      answered: selected.length > 0,
      correct: won,
      kind: gradeKind(won, selected.length > 0, won ? maxPoints : 0),
      points: won ? maxPoints : 0,
      maxPoints,
      parts: [part("Answer", expectedText, givenText, won, maxPoints)],
      normalizedGiven: selected.length === 0 ? [] : [givenText],
      normalizedCorrect: [expectedText],
    };
  }

  // Multi-select: every correct answer is a part. A wrong pick is a part too,
  // so `all-or-nothing` can never be fooled by ticking everything.
  const perPart = closePoints(maxPoints, correctIds.length);
  const parts = refs
    .filter(wanted)
    .map((ref) =>
      part(
        "Answer",
        ref.value.text,
        selected.includes(ref.id) ? ref.value.text : "",
        selected.includes(ref.id),
        perPart.points,
      ),
    );
  for (const ref of refs) {
    if (wanted(ref) || !selected.includes(ref.id)) {
      continue;
    }
    parts.push(
      part("Extra", `not ${ref.value.text}`, ref.value.text, false, 0),
    );
  }
  const won = parts.every((entry) => entry.correct);
  // Count the picks, not the part labels: a label is text a host may change.
  const selectedCorrect = refs.filter(
    (ref) => wanted(ref) && selected.includes(ref.id),
  ).length;
  const points = won
    ? maxPoints
    : splitPoints(
        question,
        parts,
        selectedCorrect,
        correctIds.length,
        maxPoints,
      );
  return {
    questionId: question.id,
    answered: selected.length > 0,
    correct: won,
    kind: gradeKind(won, selected.length > 0, points),
    points,
    maxPoints,
    parts,
    normalizedGiven: refs
      .filter((ref) => selected.includes(ref.id))
      .map((ref) => normalizeText(ref.value.text, mode)),
    normalizedCorrect: correctIds.map(
      (id) => refs.find((ref) => ref.id === id)?.value.text ?? id,
    ),
  };
}

/**
 * `Answers => 1969 | Apollo 11` gives one accepted answer per blank.
 * `Answers => 1969|1969 AD || Apollo 11` groups answers per blank; the parser
 * leaves the empty split entry where `||` sits, and that is the separator.
 */
export function clozeGroups(question: QuestionModel): string[][] {
  return groupedAnswers(question.answers.map((value) => value.text));
}

function gradeCloze(
  question: QuestionModel,
  response: Response,
  options: GradeOptions,
): GradeResult {
  const given = response.kind === ResponseKind.Cloze ? response.blanks : [];
  const groups = clozeGroups(question);
  const blankCount = Math.max(given.length, groups.length);
  const perPart = closePoints(questionMaxScore(question), blankCount);
  const parts = Array.from({ length: blankCount }, (_, index) => {
    const accepted = groups[index] ?? groups[groups.length - 1] ?? [];
    const answer = given[index] ?? "";
    const match = matchText(answer, accepted, {
      mode: modeOf(question, options),
      fuzzyDistance: options.fuzzyDistance ?? question.fuzzyDistance,
      reject: question.reject,
    });
    return part(
      `Blank ${index + 1}`,
      accepted.join(" / "),
      answer,
      match.correct,
      perPart.points,
    );
  });
  const won = parts.every((entry) => entry.correct);
  const points = clozePoints(question, parts, won);
  return {
    questionId: question.id,
    answered: given.some((blank) => blank.trim().length > 0),
    correct: won,
    kind: gradeKind(
      won,
      given.some((blank) => blank.trim().length > 0),
      points,
    ),
    points,
    maxPoints: questionMaxScore(question),
    parts,
    normalizedGiven: given.map((blank) =>
      normalizeText(blank, modeOf(question, options)),
    ),
    normalizedCorrect: groups.map((group) =>
      normalizeText(group.join(" / "), modeOf(question, options)),
    ),
  };
}

function gradeCustom(question: QuestionModel, response: Response): GradeResult {
  const value = response.kind === ResponseKind.Custom ? response.value : null;
  const payload =
    value !== null && typeof value === "object"
      ? (value as { points?: unknown })
      : null;
  const maxPoints = questionMaxScore(question);
  const points =
    typeof payload?.points === "number" && Number.isFinite(payload.points)
      ? Math.max(0, Math.min(payload.points, maxPoints))
      : 0;
  return {
    questionId: question.id,
    answered: value !== null && value !== undefined,
    correct: points >= maxPoints && maxPoints > 0,
    kind:
      points >= maxPoints && maxPoints > 0
        ? GradeKind.Correct
        : answeredKind(value !== null && value !== undefined),
    points,
    maxPoints,
    parts: [part("Widget", "self-reported", "", points > 0, maxPoints)],
    normalizedGiven: [],
    normalizedCorrect: [],
  };
}

/**
 * A registered type grades itself. A plugin that throws, or one nobody
 * registered, falls back to the self-reported custom grade below.
 */
function gradeFromPlugin(
  question: QuestionModel,
  response: Response,
  options: GradeOptions,
): GradeResult | null {
  const plugin = options.plugins?.get(question.plugin);
  if (plugin === undefined) {
    return null;
  }
  let outcome: PluginGrade;
  try {
    outcome = plugin.grade(question, response);
  } catch {
    return null;
  }
  const maxPoints = Math.max(
    0,
    outcome.maxPoints ?? questionMaxScore(question),
  );
  const points = Math.max(0, Math.min(outcome.points, maxPoints));
  const answered = !isEmptyResponse(response);
  const correct = outcome.correct ?? (maxPoints > 0 && points >= maxPoints);
  return {
    questionId: question.id,
    answered,
    correct,
    kind: gradeKind(correct, answered, points),
    points,
    maxPoints,
    parts: outcome.parts ?? [],
    normalizedGiven: outcome.normalizedGiven ?? [],
    normalizedCorrect: outcome.normalizedCorrect ?? [],
  };
}

/** The one grading function. Every type, every scoring method. */
export function gradeQuestion(
  question: QuestionModel,
  response: Response,
  options: GradeOptions = {},
): GradeResult {
  const mode = modeOf(question, options);
  // A pair or a placement still has a right answer when nothing was given.
  // Grading it empty gives the reveal its rows, with no points earned.
  if (isEmptyResponse(response) && !isMappingType(question.type)) {
    const maxPoints = questionMaxScore(question);
    return {
      questionId: question.id,
      answered: false,
      correct: maxPoints === 0,
      kind: GradeKind.Unanswered,
      points: 0,
      maxPoints,
      parts: [],
      normalizedGiven: [],
      normalizedCorrect: [],
    };
  }
  if (question.type === QuestionType.Custom) {
    const custom = gradeFromPlugin(question, response, options);
    if (custom !== null) {
      return custom;
    }
  }
  switch (question.type) {
    case QuestionType.Choice:
      return gradeChoice(question, response, options, mode);
    case QuestionType.Range:
      return gradeRange(question, response);
    case QuestionType.Estimate:
      return gradeEstimate(question, response);
    case QuestionType.List:
      return gradeList(question, response, options, mode);
    case QuestionType.Sort:
      return gradeSort(question, response);
    case QuestionType.Rank:
      return gradeRank(question, response);
    case QuestionType.Match:
      return gradeMatch(question, response);
    case QuestionType.Cloze:
      return gradeCloze(question, response, options);
    case QuestionType.OddOneOut:
      return gradeOddOneOut(question, response, options, mode);
    case QuestionType.Hotspot:
      return gradeHotspot(question, response);
    case QuestionType.Matrix:
      return gradeMatrix(question, response);
    case QuestionType.Parts:
      return gradeParts(question, response, options, mode);
    case QuestionType.Classification:
      return gradeClassification(question, response);
    case QuestionType.Diagram:
      return gradeDiagram(question, response);
    case QuestionType.Custom:
      return gradeCustom(question, response);
    default:
      return gradeOpen(question, response, options);
  }
}

/** Used by the print model and the results header: the title, in plain text. */
export function questionTitle(question: QuestionModel): string {
  return question.text[0]?.text ?? question.id;
}
export { PAIR_SYMBOL };
