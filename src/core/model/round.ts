/** A round: a name, an optional secret theme, and its questions in author order. */

import type { QuestionModel } from "./question";

export interface RoundModel {
  readonly id: string;
  readonly name: string;
  readonly secret: string | null;
  readonly questions: readonly QuestionModel[];
}

export function createRound(
  id: string,
  name: string,
  secret: string | null,
  questions: readonly QuestionModel[] = [],
): RoundModel {
  return { id, name, secret, questions };
}
