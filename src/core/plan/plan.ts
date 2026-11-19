/**
 * Plan: the order things appear in.
 *
 * Author order by default. Shuffle is opt-in. Same content plus seed plus
 * options gives the same plan everywhere.
 */

import type { QuizModel } from "../model/quiz";
import { questionMaxScore, type QuestionModel } from "../model/question";
import { applyPlacement } from "./order";
import { derivedRng, shuffleWith } from "./shuffle";
import type { Diagnostic } from "../syntax/diagnostics";

export interface PlannedRound {
  readonly id: string;
  readonly name: string;
  readonly secret: string | null;
  /** Index of this round's first question in `plan.questions`. */
  readonly index: number;
  readonly count: number;
}

export interface QuizPlan {
  readonly seed: string;
  readonly questions: readonly QuestionModel[];
  readonly rounds: readonly PlannedRound[];
  readonly maxScore: number;
  readonly total: number;
  readonly diagnostics: readonly Diagnostic[];
}

export interface PlanOptions {
  readonly seed?: string;
  readonly shuffleQuestions?: boolean;
  readonly shuffleRounds?: boolean;
  readonly includeHidden?: boolean;
}

export const DEFAULT_SEED = "pq";

export function planQuiz(quiz: QuizModel, options: PlanOptions = {}): QuizPlan {
  const seed = options.seed ?? quiz.meta.seed ?? DEFAULT_SEED;
  const shuffleQuestions = options.shuffleQuestions ?? false;
  const shuffleRounds = options.shuffleRounds ?? false;
  const includeHidden = options.includeHidden ?? false;

  const diagnostics: Diagnostic[] = [];
  const rounds = quiz.rounds.filter((round) => round.questions.length > 0);
  const orderedRounds = shuffleRounds
    ? shuffleWith(rounds, derivedRng(seed, "rounds"))
    : rounds;

  const questions: QuestionModel[] = [];
  const plannedRounds: PlannedRound[] = [];

  for (const round of orderedRounds) {
    const visible = includeHidden
      ? round.questions
      : round.questions.filter((question) => !question.hiddenAtPlay);
    const shuffled = shuffleQuestions
      ? shuffleWith(visible, derivedRng(seed, `round:${round.id}`))
      : [...visible];
    const items = applyPlacement(shuffled, diagnostics);
    plannedRounds.push({
      id: round.id,
      name: round.name,
      secret: round.secret,
      index: questions.length,
      count: items.length,
    });
    questions.push(...items);
  }

  const maxScore = questions.reduce(
    (total, question) => total + questionMaxScore(question),
    0,
  );

  return {
    seed,
    questions,
    rounds: plannedRounds,
    maxScore,
    total: questions.length,
    diagnostics,
  };
}
