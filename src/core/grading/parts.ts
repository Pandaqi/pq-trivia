/** Small shared pieces: rounding, one part, and the scoring methods. */

import {
  questionMaxScore,
  ScoringMethod,
  type QuestionModel,
} from "../model/question";
import { GradeKind, type GradePart } from "./types";

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The one place that names an outcome. Every grader ends here, so a partial
 * answer cannot be called wrong by one type and correct by another.
 */
export function gradeKind(
  correct: boolean,
  answered: boolean,
  points: number,
): GradeKind {
  if (correct) {
    return GradeKind.Correct;
  }
  if (!answered) {
    return GradeKind.Unanswered;
  }
  return points > 0 ? GradeKind.Partial : GradeKind.Wrong;
}

export function part(
  label: string,
  expected: string,
  given: string,
  correct: boolean,
  maxPoints: number,
): GradePart {
  return {
    label,
    expected,
    given,
    correct,
    points: correct ? maxPoints : 0,
    maxPoints,
  };
}

export function closePoints(
  maxPoints: number,
  count: number,
): { points: number } {
  return { points: round2(maxPoints / Math.max(count, 1)) };
}

/** `all-or-nothing`, `partial` and `per-correct`, applied to finished parts. */
export function scoringPoints(
  question: QuestionModel,
  parts: readonly GradePart[],
): number {
  const maxPoints = questionMaxScore(question);
  if (parts.length === 0) {
    return 0;
  }
  const won = parts.filter((entry) => entry.correct).length;
  switch (question.scoring) {
    case ScoringMethod.AllOrNothing:
      return won === parts.length ? maxPoints : 0;
    case ScoringMethod.PerCorrect:
      return round2(parts.reduce((total, entry) => total + entry.points, 0));
    case ScoringMethod.Partial:
    default:
      return round2((maxPoints * won) / parts.length);
  }
}
