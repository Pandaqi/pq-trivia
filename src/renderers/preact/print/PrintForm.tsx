/**
 * The answer form: a table a player writes on.
 *
 * Choice questions get letter boxes. Typed questions get a ruled line, because
 * a blank cell is not something you can write an answer in.
 */

import type { JSX } from "preact";
import { answerRefs } from "../../../core/model/answers";
import { QuestionType, type QuestionModel } from "../../../core/model/question";
import { useT } from "../i18n";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export interface FormRound {
  readonly id: string;
  readonly name: string;
  readonly secret: string | null;
}

export function PrintForm({
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
  const t = useT();
  return (
    <section
      class={`pq-print-page pq-print-form${compact ? " pq-form-compact" : ""}`}
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
              class={`pq-form${roundPageBreak ? " pq-form-new-page" : ""}`}
              key={round.id}
            >
              <caption>
                {round.name} · {items.length}{" "}
                {t(items.length === 1 ? "question_one" : "question_other")} ·{" "}
                {points} {t(points === 1 ? "point_one" : "point_other")}
              </caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">{t("printQuestion")}</th>
                  <th scope="col">{t("printAnswer")}</th>
                  <th scope="col">{t("printPoints")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((question, index) => {
                  const refs = answerRefs(question);
                  const isChoice = question.type === QuestionType.Choice;
                  return (
                    <tr key={question.id}>
                      <td class="pq-form-number">{index + 1}</td>
                      <td>
                        {question.text.map((value) => value.text).join(" ")}
                      </td>
                      <td class="pq-form-answer">
                        {isChoice ? (
                          refs.map((ref, answerIndex) => (
                            <span class="pq-form-option" key={ref.id}>
                              <span class="pq-form-box" aria-hidden="true" />
                              {LETTERS[answerIndex] ?? answerIndex + 1}
                            </span>
                          ))
                        ) : (
                          <span class="pq-form-line" aria-hidden="true" />
                        )}
                      </td>
                      <td class="pq-form-points">{question.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })}
      </div>
    </section>
  );
}
