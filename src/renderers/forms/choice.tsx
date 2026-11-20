/** Choice, and odd one out: a pick plus a reason. */

import type { JSX } from "preact";
import type { Quiz } from "../../core/session/quiz";
import {
  ResponseKind,
  setReasonedPick,
  setReasonedText,
  toggleChoice,
} from "../../core/session/responses";
import { useT } from "../preact/i18n";
import { answerLabel } from "../preact/components/answerLabels";
import { AnswerText, Feedback, FieldError, messageFor } from "./fields";
import type { InputProps } from "./fields";
import { markKey, markOf, pluralKey } from "../../core/values/marks";

function AnswerButton({
  quiz,
  screen,
  answer,
  index,
  chosen,
}: {
  readonly quiz: Quiz;
  readonly screen: InputProps["screen"];
  readonly answer: InputProps["screen"]["answers"][number];
  readonly index: number;
  readonly chosen: boolean;
}): JSX.Element {
  const t = useT();
  return (
    <button
      type="button"
      class="pq-answer"
      aria-pressed={chosen}
      data-pq-selected={chosen ? "true" : "false"}
      data-pq-eliminated={
        screen.eliminated.includes(answer.id) ? "true" : "false"
      }
      disabled={screen.eliminated.includes(answer.id)}
      data-pq-correct={
        answer.correct === null ? undefined : String(answer.correct)
      }
      onClick={() => {
        const response = quiz.state.responses[screen.id];
        if (response?.kind === ResponseKind.Choice) {
          quiz.setResponse(screen.id, toggleChoice(response, answer.id));
        }
      }}
    >
      {answerLabel(index, quiz.config.answerLabels) === "" ? null : (
        <span class="pq-answer-number" aria-hidden="true">
          {answerLabel(index, quiz.config.answerLabels)}
        </span>
      )}
      <span class="pq-answer-text">
        <AnswerText answer={answer} />
        <Feedback answer={answer} />
      </span>
      {answer.points === null ? null : (
        <span
          class="pq-answer-score"
          aria-label={t("pointsLabel", {
            points: answer.points,
            unit: t(pluralKey(answer.points, "point_one", "point_other")),
          })}
        >
          +{answer.points}
        </span>
      )}
      {answer.correct === null ? null : (
        <span class="pq-mark" aria-hidden="true">
          {markOf(answer.correct)}
        </span>
      )}
      {answer.correct === null ? null : (
        <span class="pq-visually-hidden">{t(markKey(answer.correct))}</span>
      )}
    </button>
  );
}

export function ChoiceInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const selected =
    response.kind === ResponseKind.Choice ? response.selected : [];
  const invalid = messageFor(issues, "answer") !== null;
  return (
    <>
      {screen.negated ? <p class="pq-field-note">{t("pickFalse")}</p> : null}
      <ul class="pq-answers" aria-invalid={invalid}>
        {screen.answers.map((answer, index) => (
          <li key={answer.id}>
            <AnswerButton
              quiz={quiz}
              screen={screen}
              answer={answer}
              index={index}
              chosen={selected.includes(answer.id)}
            />
          </li>
        ))}
      </ul>
      <FieldError issues={issues} field="answer" />
    </>
  );
}

/** Odd one out: the pick is half the points, the reason is the other half. */
export function ReasonedInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const selected =
    response.kind === ResponseKind.Reasoned ? response.selected : [];
  const reason = response.kind === ResponseKind.Reasoned ? response.reason : "";
  return (
    <>
      <ul
        class="pq-answers"
        aria-invalid={messageFor(issues, "answer") !== null}
      >
        {screen.answers.map((answer, index) => (
          <li key={answer.id}>
            <button
              type="button"
              class="pq-answer"
              aria-pressed={selected.includes(answer.id)}
              data-pq-selected={selected.includes(answer.id) ? "true" : "false"}
              data-pq-eliminated={
                screen.eliminated.includes(answer.id) ? "true" : "false"
              }
              disabled={screen.eliminated.includes(answer.id)}
              data-pq-correct={
                answer.correct === null ? undefined : String(answer.correct)
              }
              onClick={() =>
                quiz.setResponse(
                  screen.id,
                  setReasonedPick(response, answer.id),
                )
              }
            >
              {answerLabel(index, quiz.config.answerLabels) === "" ? null : (
                <span class="pq-answer-number" aria-hidden="true">
                  {answerLabel(index, quiz.config.answerLabels)}
                </span>
              )}
              <span class="pq-answer-text">
                <AnswerText answer={answer} />
                <Feedback answer={answer} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <FieldError issues={issues} field="answer" />
      <label class="pq-field">
        <span class="pq-field-label">{t("reasonPlaceholder")}</span>
        <input
          class="pq-input"
          type="text"
          value={reason}
          autocomplete="off"
          aria-invalid={messageFor(issues, "reason") !== null}
          onInput={(event) =>
            quiz.setResponse(
              screen.id,
              setReasonedText(response, event.currentTarget.value),
            )
          }
        />
        <FieldError issues={issues} field="reason" />
      </label>
    </>
  );
}
