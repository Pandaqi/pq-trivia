/**
 * The grade table, V2's fourth export.
 *
 * V2 showed question, correct answer and points per row, with the player's own
 * answer as a column when grading a played quiz. Printing happens before anyone
 * has answered, so this is the marking copy: correct answers filled in, a scored
 * column and a tick box for each question.
 */

import type { JSX } from "preact";
import { QuestionType, type QuestionModel } from "../../../core/model/question";
import type { FormRound } from "./PrintForm";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function label(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function correctText(question: QuestionModel): string {
  if (
    question.type === QuestionType.Sort ||
    question.type === QuestionType.Match
  ) {
    // Sort answers and match pairs read as a mapping, not a list of winners.
    return question.correct.map((value) => value.text).join(" → ");
  }
  return question.correct.map((value) => value.text).join(", ");
}

export function PrintGrade({
  questions,
  rounds,
  compact,
  roundPageBreak,
}: {
  readonly questions: readonly QuestionModel[];
  readonly rounds: readonly FormRound[];
  readonly compact: boolean;
  readonly roundPageBreak: boolean;
}): JSX.Element {
  return (
    <section
      class={`pq-print-page pq-print-grade${compact ? " pq-form-compact" : ""}`}
    >
      <div class="pq-print-page-inner">
        {rounds.map((round) => {
          const items = questions.filter(
            (question) => question.round === round.id,
          );
          if (items.length === 0) {
            return null;
          }
          const points = items.reduce(
            (total, question) => total + question.score,
            0,
          );
          return (
            <table
              class={`pq-grade${roundPageBreak ? " pq-form-new-page" : ""}`}
              key={round.id}
            >
              <caption>
                {round.name} · {label(items.length, "question")} ·{" "}
                {label(points, "point")}
              </caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Question</th>
                  <th scope="col">Correct</th>
                  <th scope="col">Points</th>
                  <th scope="col">Score</th>
                </tr>
              </thead>
              <tbody>
                {items.map((question, index) => (
                  <tr key={question.id}>
                    <td class="pq-grade-number">{index + 1}</td>
                    <td>
                      {question.text.map((value) => value.text).join(" ")}
                    </td>
                    <td class="pq-grade-correct">
                      {correctText(question)}
                      {question.type === QuestionType.Choice
                        ? `\u00A0(${question.correct
                            .map((value) => {
                              const index = question.answers.findIndex(
                                (answer) => answer.text === value.text,
                              );
                              return index < 0 ? null : LETTERS[index];
                            })
                            .filter((letter) => letter !== null)
                            .join(", ")})`
                        : ""}
                    </td>
                    <td class="pq-grade-points">{question.score}</td>
                    <td class="pq-grade-tick">
                      <span class="pq-form-box" aria-hidden="true" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <td class="pq-grade-points">{points}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          );
        })}
      </div>
    </section>
  );
}
