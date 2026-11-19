/** One input per question type, chosen from a table. */

import type { JSX } from "preact";
import { QuestionType } from "../../../core/model/question";
import type { Quiz } from "../../../core/session/quiz";
import {
  ResponseKind,
  setClozeBlanks,
  setListItems,
  setOpenText,
  setRangeValue,
  toggleChoice,
  type Response,
} from "../../../core/session/responses";
import type { QuestionViewModel } from "../../../core/session/viewModel";

interface InputProps {
  readonly quiz: Quiz;
  readonly screen: QuestionViewModel;
  readonly response: Response;
}

function ChoiceInput({ quiz, screen, response }: InputProps): JSX.Element {
  const selected =
    response.kind === ResponseKind.Choice ? response.selected : [];
  return (
    <ul class="pq-answers">
      {screen.answers.map((answer, index) => {
        const chosen = selected.includes(answer.id);
        return (
          <li key={answer.id}>
            <button
              type="button"
              class="pq-answer"
              aria-pressed={chosen}
              data-pq-selected={chosen ? "true" : "false"}
              data-pq-correct={
                answer.correct === null ? undefined : String(answer.correct)
              }
              onClick={() => {
                if (response.kind === ResponseKind.Choice) {
                  quiz.setResponse(
                    screen.id,
                    toggleChoice(response, answer.id),
                  );
                }
              }}
            >
              <span class="pq-answer-number" aria-hidden="true">
                {index + 1}
              </span>
              <span class="pq-answer-text">{answer.text}</span>
              {answer.points === null ? null : (
                <span
                  class="pq-answer-score"
                  aria-label={`${answer.points} ${answer.points === 1 ? "point" : "points"}`}
                >
                  +{answer.points}
                </span>
              )}
              {answer.correct === null ? null : (
                <span class="pq-mark" aria-hidden="true">
                  {answer.correct ? "✓" : "✗"}
                </span>
              )}
              {answer.correct === null ? null : (
                <span class="pq-visually-hidden">
                  {answer.correct ? "Correct" : "Not correct"}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function OpenInput({ quiz, screen, response }: InputProps): JSX.Element {
  const value = response.kind === ResponseKind.Open ? response.text : "";
  return (
    <label class="pq-field">
      <span class="pq-field-label">Your answer</span>
      <input
        class="pq-input"
        type="text"
        value={value}
        autocomplete="off"
        onInput={(event) =>
          quiz.setResponse(
            screen.id,
            setOpenText(response, event.currentTarget.value),
          )
        }
      />
    </label>
  );
}

function RangeInput({ quiz, screen, response }: InputProps): JSX.Element {
  const value = response.kind === ResponseKind.Range ? response.value : null;
  return (
    <label class="pq-field">
      <span class="pq-field-label">Number</span>
      <input
        class="pq-input pq-input-number"
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onInput={(event) => {
          const raw = event.currentTarget.value;
          const parsed =
            raw.trim().length === 0 ? null : Number(raw.replace(",", "."));
          quiz.setResponse(
            screen.id,
            setRangeValue(response, Number.isFinite(parsed) ? parsed : null),
          );
        }}
      />
    </label>
  );
}

function ListInput({ quiz, screen, response }: InputProps): JSX.Element {
  const items = response.kind === ResponseKind.List ? response.items : [];
  return (
    <label class="pq-field">
      <span class="pq-field-label">One answer per line</span>
      <textarea
        class="pq-input"
        rows={3}
        value={items.join("\n")}
        onInput={(event) =>
          quiz.setResponse(
            screen.id,
            setListItems(response, event.currentTarget.value.split("\n")),
          )
        }
      />
    </label>
  );
}

function ClozeInput({ quiz, screen, response }: InputProps): JSX.Element {
  const blanks = response.kind === ResponseKind.Cloze ? response.blanks : [];
  return (
    <div class="pq-cloze">
      {blanks.map((blank, index) => (
        <label key={index} class="pq-field pq-field-inline">
          <span class="pq-field-label">Blank {index + 1}</span>
          <input
            class="pq-input"
            type="text"
            value={blank}
            autocomplete="off"
            onInput={(event) => {
              const next = [...blanks];
              next[index] = event.currentTarget.value;
              quiz.setResponse(screen.id, setClozeBlanks(response, next));
            }}
          />
        </label>
      ))}
    </div>
  );
}

function OrderedAnswers({ screen }: InputProps): JSX.Element {
  return (
    <ol class="pq-answers pq-answers-plain">
      {screen.answers.map((answer) => (
        <li key={answer.id}>{answer.text}</li>
      ))}
    </ol>
  );
}

const INPUTS: Readonly<Record<string, (props: InputProps) => JSX.Element>> = {
  [QuestionType.Choice]: ChoiceInput,
  [QuestionType.Open]: OpenInput,
  [QuestionType.Range]: RangeInput,
  [QuestionType.List]: ListInput,
  [QuestionType.Cloze]: ClozeInput,
  [QuestionType.Sort]: OrderedAnswers,
  [QuestionType.Match]: OrderedAnswers,
};

export function Answers(props: InputProps): JSX.Element {
  const Input = INPUTS[props.screen.type] ?? OpenInput;
  return <Input {...props} />;
}
