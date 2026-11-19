/** List, sort and match. The types where order or pairing is the answer. */

import {
  GradingMode,
  questionMaxScore,
  type QuestionModel,
} from "../model/question";
import { answerRefs } from "../model/answers";
import { ResponseKind, type Response } from "../session/responses";
import { matchText, normalizeText } from "./normalize";
import { closePoints, part, scoringPoints } from "./parts";
import { GradeKind, type GradeOptions, type GradeResult } from "./types";

const PAIR_SYMBOL = "~";

export function splitPair(text: string): [string, string] | null {
  const index = text.indexOf(PAIR_SYMBOL);
  if (index < 0) {
    return null;
  }
  return [
    text.slice(0, index).trim(),
    text.slice(index + PAIR_SYMBOL.length).trim(),
  ];
}

export function gradeList(
  question: QuestionModel,
  response: Response,
  options: GradeOptions,
  mode: GradingMode,
): GradeResult {
  const given =
    response.kind === ResponseKind.List ? response.items : ([] as string[]);
  const expected = question.correct.map((value) => value.text);
  const perPart = closePoints(questionMaxScore(question), expected.length);
  const used = new Set<number>();
  const normalizedGiven: string[] = [];
  const parts = expected.map((wanted, index) => {
    let hit = -1;
    for (let cursor = 0; cursor < given.length; cursor += 1) {
      if (used.has(cursor)) {
        continue;
      }
      const candidate = given[cursor] ?? "";
      const match = matchText(candidate, [wanted], {
        mode: question.grading === GradingMode.Fuzzy ? GradingMode.Fuzzy : mode,
        fuzzyDistance: options.fuzzyDistance ?? question.fuzzyDistance,
        reject: question.reject,
      });
      if (match.correct) {
        hit = cursor;
        break;
      }
    }
    if (hit >= 0) {
      used.add(hit);
    }
    const answer = hit >= 0 ? (given[hit] ?? "") : "";
    return part(`Item ${index + 1}`, wanted, answer, hit >= 0, perPart.points);
  });
  for (const item of given) {
    if (item.trim().length > 0) {
      normalizedGiven.push(normalizeText(item, mode));
    }
  }
  const won = parts.every((entry) => entry.correct);
  const points = scoringPoints(question, parts);
  return {
    questionId: question.id,
    answered: given.some((item) => item.trim().length > 0),
    correct: won,
    kind: won
      ? GradeKind.Correct
      : given.every((item) => item.trim().length === 0)
        ? GradeKind.Unanswered
        : points > 0
          ? GradeKind.Partial
          : GradeKind.Wrong,
    points,
    maxPoints: questionMaxScore(question),
    parts,
    normalizedGiven,
    normalizedCorrect: expected.map((text) => normalizeText(text, mode)),
  };
}

export function gradeSort(
  question: QuestionModel,
  response: Response,
): GradeResult {
  const refs = answerRefs(question);
  const given =
    response.kind === ResponseKind.Sort ? response.order : ([] as string[]);
  const expected = refs.map((ref) => ref.id);
  const textOf = new Map(refs.map((ref) => [ref.id, ref.value.text]));
  const perPart = closePoints(questionMaxScore(question), expected.length);
  const parts = expected.map((id, index) => {
    const actual = given[index] ?? "";
    return part(
      `Position ${index + 1}`,
      textOf.get(id) ?? "",
      textOf.get(actual) ?? "",
      actual === id,
      perPart.points,
    );
  });
  const won = parts.every((entry) => entry.correct);
  const points = scoringPoints(question, parts);
  return {
    questionId: question.id,
    answered: given.length > 0,
    correct: won,
    kind: won
      ? GradeKind.Correct
      : given.length === 0
        ? GradeKind.Unanswered
        : points > 0
          ? GradeKind.Partial
          : GradeKind.Wrong,
    points,
    maxPoints: questionMaxScore(question),
    parts,
    normalizedGiven: given.map((id) => textOf.get(id) ?? id),
    normalizedCorrect: expected.map((id) => textOf.get(id) ?? id),
  };
}

export function gradeMatch(
  question: QuestionModel,
  response: Response,
): GradeResult {
  const given = response.kind === ResponseKind.Match ? response.pairs : [];
  const expected = question.answers
    .map((value) => splitPair(value.text))
    .filter((pair): pair is [string, string] => pair !== null);
  const perPart = closePoints(questionMaxScore(question), expected.length);
  const used = new Set<number>();
  const parts = expected.map((pair, index) => {
    const wanted = `${pair[0]} ${PAIR_SYMBOL} ${pair[1]}`;
    let hit = -1;
    for (let cursor = 0; cursor < given.length; cursor += 1) {
      if (used.has(cursor)) {
        continue;
      }
      const candidate = given[cursor];
      if (candidate === undefined) {
        continue;
      }
      const left = candidate[0]?.trim().toLowerCase() ?? "";
      const right = candidate[1]?.trim().toLowerCase() ?? "";
      if (left === pair[0].toLowerCase() && right === pair[1].toLowerCase()) {
        hit = cursor;
        break;
      }
    }
    if (hit >= 0) {
      used.add(hit);
    }
    const found = hit >= 0 ? given[hit] : undefined;
    const answer =
      found === undefined ? "" : `${found[0]} ${PAIR_SYMBOL} ${found[1]}`;
    return part(`Pair ${index + 1}`, wanted, answer, hit >= 0, perPart.points);
  });
  const won = parts.every((entry) => entry.correct);
  const points = scoringPoints(question, parts);
  return {
    questionId: question.id,
    answered: given.length > 0,
    correct: won,
    kind: won
      ? GradeKind.Correct
      : given.length === 0
        ? GradeKind.Unanswered
        : points > 0
          ? GradeKind.Partial
          : GradeKind.Wrong,
    points,
    maxPoints: questionMaxScore(question),
    parts,
    normalizedGiven: given.map((pair) => `${pair[0]} ${pair[1]}`),
    normalizedCorrect: expected.map((pair) => `${pair[0]} ${pair[1]}`),
  };
}
