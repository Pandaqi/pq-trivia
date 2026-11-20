/** Grade shapes. Plain data, JSON-safe, shared by browser and CLI. */

import type { GradingMode } from "../model/question";
import type { QuestionTypeRegistry } from "./plugins";

export enum GradeKind {
  Correct = "correct",
  Partial = "partial",
  Wrong = "wrong",
  Unanswered = "unanswered",
}

export interface GradePart {
  /** What this part is: "Blank 2", "Pair 1", "Position 3". */
  readonly label: string;
  readonly expected: string;
  readonly given: string;
  readonly correct: boolean;
  readonly points: number;
  readonly maxPoints: number;
}

export interface GradeResult {
  readonly questionId: string;
  readonly answered: boolean;
  readonly correct: boolean;
  readonly kind: GradeKind;
  readonly points: number;
  readonly maxPoints: number;
  readonly parts: readonly GradePart[];
  readonly normalizedGiven: readonly string[];
  readonly normalizedCorrect: readonly string[];
}

export interface GradeOptions {
  /** Overrides every question's own `Grading` attribute. */
  readonly grading?: GradingMode;
  /** Overrides every question's own `FuzzyDistance`. */
  readonly fuzzyDistance?: number | null;
  /** Registered custom types. Empty means a custom question self-reports. */
  readonly plugins?: QuestionTypeRegistry;
}
