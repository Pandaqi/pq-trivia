/** A round: a name, an optional secret theme, and its questions in author order. */

import type { QuestionModel } from "./question";

export interface RoundModel {
  readonly id: string;
  readonly name: string;
  readonly secret: string | null;
  readonly questions: readonly QuestionModel[];
  /** The section block that opened this round, so its comments survive. */
  readonly source: QuestionModel | null;
  /** A round the parser made up because the file named none. */
  readonly implicit: boolean;
}

export function createRound(
  id: string,
  name: string,
  secret: string | null,
  questions: readonly QuestionModel[] = [],
  source: QuestionModel | null = null,
  implicit = false,
): RoundModel {
  return { id, name, secret, questions, source, implicit };
}
