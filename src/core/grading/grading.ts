/**
 * Grading. One pure function, shared by the browser, the results screen and
 * the CLI.
 *
 * Answers are compared by content ID or by normalized text. Never by position,
 * so a shuffle cannot change the grade.
 */

import { answerRefs } from "../model/answers";
import {
  GradingMode,
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
import { matchText, normalizeText, parseNumber } from "./normalize";
import { closePoints, part, round2 } from "./parts";
import { GradeKind, type GradeOptions, type GradeResult } from "./types";
import { gradeList, gradeMatch, gradeSort } from "./structured";

export * from "./types";

const PAIR_SYMBOL = "~";

function modeOf(question: QuestionModel, options: GradeOptions): GradingMode {
  if (question.grading === GradingMode.Fuzzy) {
    return GradingMode.Fuzzy;
  }
  return options.grading ?? question.grading;
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
  return {
    questionId: question.id,
    answered: given.trim().length > 0,
    correct: match.correct,
    kind: match.correct
      ? GradeKind.Correct
      : given.trim().length === 0
        ? GradeKind.Unanswered
        : GradeKind.Wrong,
    points: match.correct ? maxPoints : 0,
    maxPoints,
    parts: [entry],
    normalizedGiven: [match.normalizedGiven],
    normalizedCorrect: [match.normalizedCorrect],
  };
}

function gradeRange(question: QuestionModel, response: Response): GradeResult {
  const given = response.kind === ResponseKind.Range ? response.value : null;
  const expectedText =
    question.correct[0]?.text ?? question.answers[0]?.text ?? "";
  const expected = parseNumber(expectedText);
  const margin = question.range ?? 0;
  const won =
    given !== null && expected !== null && Math.abs(given - expected) <= margin;
  const maxPoints = questionMaxScore(question);
  return {
    questionId: question.id,
    answered: given !== null,
    correct: won,
    kind: won
      ? GradeKind.Correct
      : given === null
        ? GradeKind.Unanswered
        : GradeKind.Wrong,
    points: won ? maxPoints : 0,
    maxPoints,
    parts: [
      part(
        "Number",
        margin === 0 ? expectedText : `${expectedText} ± ${margin}`,
        given === null ? "" : String(given),
        won,
        maxPoints,
      ),
    ],
    normalizedGiven: given === null ? [] : [String(given)],
    normalizedCorrect: expected === null ? [] : [String(expected)],
  };
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
  const correctTexts = new Set(question.correct.map((value) => value.text));
  const correctIds = refs
    .filter((ref) => correctTexts.has(ref.value.text))
    .map((ref) => ref.id);
  const maxPoints = questionMaxScore(question);

  if (correctIds.length <= 1) {
    const wanted = correctIds[0];
    const won =
      wanted !== undefined && selected.length === 1 && selected[0] === wanted;
    const expectedText = question.correct[0]?.text ?? "";
    const givenText =
      refs.find((ref) => selected.includes(ref.id))?.value.text ?? "";
    return {
      questionId: question.id,
      answered: selected.length > 0,
      correct: won,
      kind: won
        ? GradeKind.Correct
        : selected.length === 0
          ? GradeKind.Unanswered
          : GradeKind.Wrong,
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
    .filter((ref) => correctTexts.has(ref.value.text))
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
    if (correctTexts.has(ref.value.text) || !selected.includes(ref.id)) {
      continue;
    }
    parts.push(
      part("Extra", `not ${ref.value.text}`, ref.value.text, false, 0),
    );
  }
  const won = parts.every((entry) => entry.correct);
  const selectedCorrect = parts.filter(
    (entry) => entry.label === "Answer" && entry.correct,
  ).length;
  const points = won
    ? maxPoints
    : question.scoring === ScoringMethod.PerCorrect
      ? round2(
          parts
            .filter((entry) => entry.correct)
            .reduce((total, entry) => total + entry.points, 0),
        )
      : question.scoring === ScoringMethod.Partial
        ? round2((maxPoints * selectedCorrect) / Math.max(correctIds.length, 1))
        : 0;
  return {
    questionId: question.id,
    answered: selected.length > 0,
    correct: won,
    kind: won
      ? GradeKind.Correct
      : selected.length === 0
        ? GradeKind.Unanswered
        : points > 0
          ? GradeKind.Partial
          : GradeKind.Wrong,
    points,
    maxPoints,
    parts,
    normalizedGiven: refs
      .filter((ref) => selected.includes(ref.id))
      .map((ref) => normalizeText(ref.value.text, mode)),
    normalizedCorrect: question.correct.map((value) => value.text),
  };
}

/**
 * `Answers => 1969 | Apollo 11` gives one accepted answer per blank.
 * `Answers => 1969|1969 AD || Apollo 11` groups answers per blank; the parser
 * leaves the empty split entry where `||` sits, and that is the separator.
 */
export function clozeGroups(question: QuestionModel): string[][] {
  const texts = question.answers.map((value) => value.text);
  const groups: string[][] = [];
  let current: string[] = [];
  let grouped = false;
  for (const text of texts) {
    if (text.trim().length === 0) {
      grouped = true;
      if (current.length > 0) {
        groups.push(current);
        current = [];
      }
      continue;
    }
    current.push(text);
  }
  if (current.length > 0) {
    groups.push(current);
  }
  return grouped ? groups : texts.map((text) => [text]);
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
  const points = won
    ? questionMaxScore(question)
    : question.scoring === ScoringMethod.PerCorrect
      ? round2(
          parts
            .filter((entry) => entry.correct)
            .reduce((total, entry) => total + entry.points, 0),
        )
      : round2(
          (questionMaxScore(question) *
            parts.filter((entry) => entry.correct).length) /
            Math.max(parts.length, 1),
        );
  return {
    questionId: question.id,
    answered: given.some((blank) => blank.trim().length > 0),
    correct: won,
    kind: won
      ? GradeKind.Correct
      : given.every((blank) => blank.trim().length === 0)
        ? GradeKind.Unanswered
        : points > 0
          ? GradeKind.Partial
          : GradeKind.Wrong,
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
        : value === null
          ? GradeKind.Unanswered
          : GradeKind.Partial,
    points,
    maxPoints,
    parts: [part("Widget", "self-reported", "", points > 0, maxPoints)],
    normalizedGiven: [],
    normalizedCorrect: [],
  };
}

/** The one grading function. Every type, every scoring method. */
export function gradeQuestion(
  question: QuestionModel,
  response: Response,
  options: GradeOptions = {},
): GradeResult {
  const mode = modeOf(question, options);
  if (isEmptyResponse(response) && question.type !== QuestionType.Range) {
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
  switch (question.type) {
    case QuestionType.Choice:
      return gradeChoice(question, response, options, mode);
    case QuestionType.Range:
      return gradeRange(question, response);
    case QuestionType.List:
      return gradeList(question, response, options, mode);
    case QuestionType.Sort:
      return gradeSort(question, response);
    case QuestionType.Match:
      return gradeMatch(question, response);
    case QuestionType.Cloze:
      return gradeCloze(question, response, options);
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
