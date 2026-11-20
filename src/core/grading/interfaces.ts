/**
 * The interactive types: a pick with a reason, a spot on an image, a matrix,
 * several parts, items in buckets, labels on targets.
 *
 * Everything here is a pure function of the question and the response. The
 * browser, the CLI and the live room all call `gradeQuestion`.
 */

import { answerRefs } from "../model/answers";
import { groupsForParts, partPoints, PartKind } from "../model/parts";
import {
  GradingMode,
  questionMaxScore,
  type QuestionModel,
} from "../model/question";
import type { Response } from "../session/responses";
import { ResponseKind } from "../session/responses";
import { nearestPoint, parsePoint } from "../values/point";
import { matchText, parseNumber } from "./normalize";
import { closePoints, part, round2 } from "./parts";
import { GradeKind, type GradeOptions, type GradeResult } from "./types";

const PAIR_SEPARATOR = "@";

function splitMapping(text: string): [string, string] | null {
  const index = text.lastIndexOf(PAIR_SEPARATOR);
  if (index < 0) {
    return null;
  }
  return [
    text.slice(0, index).trim(),
    text.slice(index + PAIR_SEPARATOR.length).trim(),
  ];
}

function spotParts(
  question: QuestionModel,
  label: string,
  point: { readonly x: number; readonly y: number } | null,
  profile: {
    readonly point: { x: number; y: number } | null;
    readonly distance: number;
  },
  maxPoints: number,
): GradeResult {
  const expected =
    profile.point === null
      ? "no answer"
      : `${profile.point.x},${profile.point.y}`;
  const given = point === null ? "" : `${point.x},${point.y}`;
  const won = profile.point !== null && profile.distance <= question.hitRadius;
  return {
    questionId: question.id,
    answered: point !== null,
    correct: won,
    kind: won
      ? GradeKind.Correct
      : point === null
        ? GradeKind.Unanswered
        : GradeKind.Wrong,
    points: won ? maxPoints : 0,
    maxPoints,
    parts: [part(label, expected, given, won, maxPoints)],
    normalizedGiven: point === null ? [] : [given],
    normalizedCorrect: profile.point === null ? [] : [expected],
  };
}

/** One click on the image, within `HitRadius` of any accepted point. */
export function gradeHotspot(
  question: QuestionModel,
  response: Response,
): GradeResult {
  const point = response.kind === ResponseKind.Hotspot ? response.point : null;
  const accepted = question.answers
    .map((value) => parsePoint(value.text))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const maxPoints = questionMaxScore(question);
  if (point === null) {
    return {
      questionId: question.id,
      answered: false,
      correct: false,
      kind: GradeKind.Unanswered,
      points: 0,
      maxPoints,
      parts: [],
      normalizedGiven: [],
      normalizedCorrect: accepted.map((entry) => `${entry.x},${entry.y}`),
    };
  }
  const nearest = nearestPoint(point, accepted);
  const profile =
    nearest === null
      ? { point: null, distance: Number.POSITIVE_INFINITY }
      : { point: nearest.point, distance: nearest.distance };
  return spotParts(question, "Spot", point, profile, maxPoints);
}

/** Pick the odd one, then earn the second half with a real reason. */
export function gradeOddOneOut(
  question: QuestionModel,
  response: Response,
  options: GradeOptions,
  mode: GradingMode,
): GradeResult {
  const selected =
    response.kind === ResponseKind.Reasoned ? response.selected : [];
  const reason = response.kind === ResponseKind.Reasoned ? response.reason : "";
  const refs = answerRefs(question);
  const wanted = new Set(question.correct.map((value) => value.text));
  const wantedIds = refs
    .filter((ref) => wanted.has(ref.value.text))
    .map((ref) => ref.id);
  const pickWon =
    wantedIds.length === 1 &&
    selected.length === 1 &&
    selected[0] === wantedIds[0];
  const acceptedReason = question.alsoAccept;
  const reasonWon =
    acceptedReason.length === 0
      ? reason.trim().length > 0
      : matchText(reason, acceptedReason, {
          mode,
          fuzzyDistance: options.fuzzyDistance ?? question.fuzzyDistance,
          reject: question.reject,
        }).correct;
  const maxPoints = questionMaxScore(question);
  const each = closePoints(maxPoints, 2).points;
  const pickText =
    refs.find((ref) => selected.includes(ref.id))?.value.text ?? "";
  const parts = [
    part("Pick", question.correct[0]?.text ?? "", pickText, pickWon, each),
    part(
      "Reason",
      acceptedReason.join(" / ") || "any",
      reason,
      reasonWon,
      each,
    ),
  ];
  const points = round2((pickWon ? each : 0) + (reasonWon ? each : 0));
  const won = pickWon && reasonWon;
  return {
    questionId: question.id,
    answered: selected.length > 0 || reason.trim().length > 0,
    correct: won,
    kind: won
      ? GradeKind.Correct
      : points > 0
        ? GradeKind.Partial
        : GradeKind.Wrong,
    points,
    maxPoints,
    parts,
    normalizedGiven: [pickText, reason],
    normalizedCorrect: [
      question.correct[0]?.text ?? "",
      acceptedReason.join(" / "),
    ],
  };
}

/** One row, one shared scale. Checkbox rows compare a set, radio rows one. */
export function gradeMatrix(
  question: QuestionModel,
  response: Response,
): GradeResult {
  const given = response.kind === ResponseKind.Matrix ? response.rows : [];
  const refs = answerRefs(question);
  const perRow = closePoints(questionMaxScore(question), question.rows.length);
  const parts = question.rows.map((row, index) => {
    const wantedTexts = (question.correct[index]?.text ?? "")
      .split("+")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    const wantedIds = refs
      .filter((ref) => wantedTexts.includes(ref.value.text))
      .map((ref) => ref.id);
    const selected = given[index] ?? [];
    const won =
      wantedIds.length > 0 &&
      wantedIds.length === selected.length &&
      wantedIds.every((id) => selected.includes(id));
    const answerText = selected
      .map((id) => refs.find((ref) => ref.id === id)?.value.text ?? "")
      .filter((text) => text.length > 0)
      .join(" + ");
    return part(
      row || `Row ${index + 1}`,
      wantedTexts.join(" + "),
      answerText,
      won,
      perRow.points,
    );
  });
  const won = parts.length > 0 && parts.every((entry) => entry.correct);
  const points = won
    ? questionMaxScore(question)
    : round2(
        parts
          .filter((entry) => entry.correct)
          .reduce((total, entry) => total + entry.points, 0),
      );
  const answered = given.some((row) => row.length > 0);
  return {
    questionId: question.id,
    answered,
    correct: won,
    kind: won
      ? GradeKind.Correct
      : !answered
        ? GradeKind.Unanswered
        : points > 0
          ? GradeKind.Partial
          : GradeKind.Wrong,
    points,
    maxPoints: questionMaxScore(question),
    parts,
    normalizedGiven: given.map((row) => row.join(" + ")),
    normalizedCorrect: question.correct.map((value) => value.text),
  };
}

/** Several inputs under one stem. Points stay per part, the total is theirs. */
export function gradeParts(
  question: QuestionModel,
  response: Response,
  options: GradeOptions,
  mode: GradingMode,
): GradeResult {
  const values = response.kind === ResponseKind.Parts ? response.values : [];
  const groups = groupsForParts(
    question.parts,
    question.answers.map((value) => value.text),
  );
  const points = partPoints(question.parts, question.score);
  const maxPoints = questionMaxScore(question);
  const parts = question.parts.map((entry, index) => {
    const accepted = groups[index] ?? [];
    const value = values[index] ?? "";
    const share = points[index] ?? 0;
    if (entry.kind === PartKind.Number) {
      const wanted = parseNumber(accepted[0] ?? "");
      const given = parseNumber(value);
      const margin = question.range ?? 0;
      const won =
        wanted !== null && given !== null && Math.abs(given - wanted) <= margin;
      return part(entry.label, accepted[0] ?? "", value, won, share);
    }
    const outcome = matchText(value, accepted, {
      mode,
      fuzzyDistance: options.fuzzyDistance ?? question.fuzzyDistance,
      reject: question.reject,
    });
    return part(
      entry.label,
      accepted.join(" / "),
      value,
      outcome.correct,
      share,
    );
  });
  const won = parts.length > 0 && parts.every((entry) => entry.correct);
  const earned = round2(
    parts
      .filter((entry) => entry.correct)
      .reduce((total, entry) => total + entry.points, 0),
  );
  const answered = values.some((value) => value.trim().length > 0);
  return {
    questionId: question.id,
    answered,
    correct: won,
    kind: won
      ? GradeKind.Correct
      : !answered
        ? GradeKind.Unanswered
        : earned > 0
          ? GradeKind.Partial
          : GradeKind.Wrong,
    // `all-or-nothing` is the default, so a half-right multi-part still earns
    // its half. Losing the worked parts would feel like a bug, not a rule.
    points: won ? maxPoints : earned,
    maxPoints,
    parts,
    normalizedGiven: [...values],
    normalizedCorrect: groups.map((group) => group.join(" / ")),
  };
}

/** Expected `item @ bucket` pairs. Explicit `Correct` wins; answers are next. */
function mappingsOf(
  source: readonly { readonly text: string }[],
): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const value of source) {
    const pair = splitMapping(value.text);
    if (pair !== null) {
      pairs.push(pair);
    }
  }
  return pairs;
}

function expectedBuckets(question: QuestionModel): Array<[string, string]> {
  const declared = mappingsOf(question.correct);
  return declared.length > 0 ? declared : mappingsOf(question.answers);
}

/** Each item is its own part. A bucket needs the item, not the other way. */
export function gradeClassification(
  question: QuestionModel,
  response: Response,
): GradeResult {
  const placements =
    response.kind === ResponseKind.Buckets ? response.placements : [];
  const expected = expectedBuckets(question);
  const perPart = closePoints(questionMaxScore(question), expected.length);
  const used = new Set<number>();
  const parts = expected.map(([item, bucket], index) => {
    let hit = -1;
    for (let cursor = 0; cursor < placements.length; cursor += 1) {
      if (used.has(cursor)) {
        continue;
      }
      const candidate = placements[cursor];
      if (
        candidate !== undefined &&
        candidate[0] === item &&
        candidate[1] === bucket
      ) {
        hit = cursor;
        break;
      }
    }
    if (hit >= 0) {
      used.add(hit);
    }
    const found = hit >= 0 ? placements[hit] : undefined;
    return part(
      item || `Item ${index + 1}`,
      bucket,
      found === undefined ? "" : found[1],
      hit >= 0,
      perPart.points,
    );
  });
  const won = parts.length > 0 && parts.every((entry) => entry.correct);
  const points = won
    ? questionMaxScore(question)
    : round2(
        parts
          .filter((entry) => entry.correct)
          .reduce((total, entry) => total + entry.points, 0),
      );
  const answered = placements.length > 0;
  return {
    questionId: question.id,
    answered,
    correct: won,
    kind: won
      ? GradeKind.Correct
      : !answered
        ? GradeKind.Unanswered
        : points > 0
          ? GradeKind.Partial
          : GradeKind.Wrong,
    points,
    maxPoints: questionMaxScore(question),
    parts,
    normalizedGiven: placements.map((entry) => `${entry[0]} ${entry[1]}`),
    normalizedCorrect: expected.map((entry) => `${entry[0]} ${entry[1]}`),
  };
}

/** Labels onto targets. Explicit `Correct` wins; answer order pairs them. */
function expectedLabels(question: QuestionModel): Array<[string, string]> {
  const declared = mappingsOf(question.correct);
  if (declared.length > 0) {
    return declared;
  }
  return question.answers.map((value, index) => [
    value.text.trim(),
    question.targets[index]?.label ?? "",
  ]);
}

export function gradeDiagram(
  question: QuestionModel,
  response: Response,
): GradeResult {
  const placements = response.kind === ResponseKind.Match ? response.pairs : [];
  const expected = expectedLabels(question);
  const perPart = closePoints(questionMaxScore(question), expected.length);
  const used = new Set<number>();
  const parts = expected.map(([label, target], index) => {
    let hit = -1;
    for (let cursor = 0; cursor < placements.length; cursor += 1) {
      if (used.has(cursor)) {
        continue;
      }
      const candidate = placements[cursor];
      if (
        candidate !== undefined &&
        candidate[0] === label &&
        candidate[1] === target
      ) {
        hit = cursor;
        break;
      }
    }
    if (hit >= 0) {
      used.add(hit);
    }
    const found = hit >= 0 ? placements[hit] : undefined;
    return part(
      label || `Label ${index + 1}`,
      target,
      found === undefined ? "" : found[1],
      hit >= 0,
      perPart.points,
    );
  });
  const won = parts.length > 0 && parts.every((entry) => entry.correct);
  const points = won
    ? questionMaxScore(question)
    : round2(
        parts
          .filter((entry) => entry.correct)
          .reduce((total, entry) => total + entry.points, 0),
      );
  const answered = placements.length > 0;
  return {
    questionId: question.id,
    answered,
    correct: won,
    kind: won
      ? GradeKind.Correct
      : !answered
        ? GradeKind.Unanswered
        : points > 0
          ? GradeKind.Partial
          : GradeKind.Wrong,
    points,
    maxPoints: questionMaxScore(question),
    parts,
    normalizedGiven: placements.map((entry) => `${entry[0]} ${entry[1]}`),
    normalizedCorrect: expected.map((entry) => `${entry[0]} ${entry[1]}`),
  };
}
