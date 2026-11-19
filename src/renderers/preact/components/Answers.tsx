/** One input per question type, chosen from a table. */

import type { JSX } from "preact";
import { useMemo, useState } from "preact/hooks";
import { parseInline } from "../../../core/format/inline";
import { QuestionType } from "../../../core/model/question";
import { derivedRng, shuffleWith } from "../../../core/plan/shuffle";
import type { Quiz } from "../../../core/session/quiz";
import type { ResponseIssue } from "../../../core/session/policies";
import {
  ResponseKind,
  setClozeBlanks,
  setListItems,
  setMatchPairs,
  setOpenText,
  setRangeValue,
  setSortOrder,
  toggleChoice,
  type Response,
} from "../../../core/session/responses";
import type { QuestionViewModel } from "../../../core/session/viewModel";
import { Inline } from "./Inline";
import { Media } from "./Media";
import { useT } from "../i18n";

interface InputProps {
  readonly quiz: Quiz;
  readonly screen: QuestionViewModel;
  readonly response: Response;
  readonly issues: readonly ResponseIssue[];
}

function messageFor(
  issues: readonly ResponseIssue[],
  field: string,
): string | null {
  return issues.find((issue) => issue.field === field)?.message ?? null;
}

function issueFor(
  issues: readonly ResponseIssue[],
  field: string,
): ResponseIssue | null {
  return issues.find((issue) => issue.field === field) ?? null;
}

function FieldError({
  issues,
  field,
}: {
  readonly issues: readonly ResponseIssue[];
  readonly field: string;
}): JSX.Element | null {
  const t = useT();
  const found = issueFor(issues, field);
  if (found === null) {
    return null;
  }
  const params =
    found.key === "needBlank"
      ? { number: Number(field.replace("blank-", "")) + 1 }
      : {};
  return (
    <span class="pq-field-error" role="alert">
      {t(found.key, params)}
    </span>
  );
}

function ChoiceInput({
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
      <ul class="pq-answers" aria-invalid={invalid}>
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
                <span class="pq-answer-text">
                  {answer.media === null ? (
                    <Inline nodes={answer.nodes} />
                  ) : (
                    <Media item={answer.media} />
                  )}
                </span>
                {answer.points === null ? null : (
                  <span
                    class="pq-answer-score"
                    aria-label={t("pointsLabel", {
                      points: answer.points,
                      unit: t(
                        answer.points === 1 ? "point_one" : "point_other",
                      ),
                    })}
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
                    {answer.correct ? t("correct") : t("notCorrect")}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <FieldError issues={issues} field="answer" />
    </>
  );
}

function OpenInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const value = response.kind === ResponseKind.Open ? response.text : "";
  const invalid = messageFor(issues, "answer") !== null;
  return (
    <label class="pq-field">
      <span class="pq-field-label">{t("answerPlaceholder")}</span>
      <input
        class="pq-input"
        type="text"
        value={value}
        autocomplete="off"
        aria-invalid={invalid}
        onInput={(event) =>
          quiz.setResponse(
            screen.id,
            setOpenText(response, event.currentTarget.value),
          )
        }
      />
      <FieldError issues={issues} field="answer" />
    </label>
  );
}

function RangeInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const value = response.kind === ResponseKind.Range ? response.value : null;
  const invalid = messageFor(issues, "number") !== null;
  return (
    <label class="pq-field">
      <span class="pq-field-label">{t("numberPlaceholder")}</span>
      <input
        class="pq-input pq-input-number"
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        aria-invalid={invalid}
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
      <FieldError issues={issues} field="number" />
    </label>
  );
}

function ListInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const items = response.kind === ResponseKind.List ? response.items : [];
  const invalid = messageFor(issues, "answer") !== null;
  return (
    <label class="pq-field">
      <span class="pq-field-label">{t("listPlaceholder")}</span>
      <textarea
        class="pq-input"
        rows={3}
        value={items.join("\n")}
        aria-invalid={invalid}
        onInput={(event) =>
          quiz.setResponse(
            screen.id,
            setListItems(response, event.currentTarget.value.split("\n")),
          )
        }
      />
      <FieldError issues={issues} field="answer" />
    </label>
  );
}

function ClozeInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const blanks = response.kind === ResponseKind.Cloze ? response.blanks : [];
  return (
    <div class="pq-cloze">
      {blanks.map((blank, index) => {
        const field = `blank-${index}`;
        return (
          <label key={index} class="pq-field pq-field-inline">
            <span class="pq-field-label">
              {t("blank", { number: index + 1 })}
            </span>
            <input
              class="pq-input"
              type="text"
              value={blank}
              autocomplete="off"
              aria-invalid={messageFor(issues, field) !== null}
              onInput={(event) => {
                const next = [...blanks];
                next[index] = event.currentTarget.value;
                quiz.setResponse(screen.id, setClozeBlanks(response, next));
              }}
            />
            <FieldError issues={issues} field={field} />
          </label>
        );
      })}
    </div>
  );
}

/** Ordering by ID. Positions move, IDs do not. */
function SortInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const stored = response.kind === ResponseKind.Sort ? response.order : [];
  const authorOrder = screen.answers.map((answer) => answer.id);
  const order = stored.length === 0 ? authorOrder : stored;
  const textOf = new Map(
    screen.answers.map((answer) => [answer.id, answer.text]),
  );
  const nodesOf = new Map(
    screen.answers.map((answer) => [answer.id, answer.nodes]),
  );
  const invalid = messageFor(issues, "order") !== null;

  const move = (index: number, delta: number): void => {
    const target = index + delta;
    if (target < 0 || target >= order.length) {
      return;
    }
    const next = [...order];
    const a = next[index];
    const b = next[target];
    if (a === undefined || b === undefined) {
      return;
    }
    next[index] = b;
    next[target] = a;
    quiz.setResponse(screen.id, setSortOrder(response, next));
  };

  return (
    <>
      <ol class="pq-sort" aria-invalid={invalid}>
        {order.map((id, index) => (
          <li key={id} class="pq-sort-item">
            <span class="pq-sort-rank" aria-hidden="true">
              {index + 1}
            </span>
            <span class="pq-sort-text">
              {nodesOf.has(id) ? (
                <Inline nodes={nodesOf.get(id) ?? []} />
              ) : (
                id
              )}
            </span>
            <button
              type="button"
              class="pq-sort-button"
              aria-label={t("moveUp", { text: textOf.get(id) ?? id })}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              class="pq-sort-button"
              aria-label={t("moveDown", { text: textOf.get(id) ?? id })}
              disabled={index === order.length - 1}
              onClick={() => move(index, 1)}
            >
              ↓
            </button>
          </li>
        ))}
      </ol>
      <FieldError issues={issues} field="order" />
    </>
  );
}

function splitPair(text: string): [string, string] {
  const index = text.indexOf("~");
  if (index < 0) {
    return [text.trim(), ""];
  }
  return [text.slice(0, index).trim(), text.slice(index + 1).trim()];
}

/** Two columns. Click a left item, then its match on the right. */
function MatchInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const pairs = response.kind === ResponseKind.Match ? response.pairs : [];
  const [active, setActive] = useState<string | null>(null);
  const parsed = useMemo(
    () => screen.answers.map((answer) => splitPair(answer.text)),
    [screen.answers],
  );
  const lefts = parsed.map((pair) => pair[0]);
  const rights = useMemo(
    () =>
      shuffleWith(
        parsed.map((pair) => pair[1]),
        derivedRng(screen.id, "match-right"),
      ),
    [parsed, screen.id],
  );
  const connected = new Map(pairs.map((pair) => [pair[0], pair[1]]));
  const usedRights = new Set(pairs.map((pair) => pair[1]));
  const invalid = messageFor(issues, "pairs") !== null;

  const connect = (left: string): void => {
    setActive((current) => (current === left ? null : left));
  };

  const rightClick = (right: string): void => {
    if (response.kind !== ResponseKind.Match) {
      return;
    }
    const owner = pairs.find((pair) => pair[1] === right);
    if (owner !== undefined) {
      quiz.setResponse(
        screen.id,
        setMatchPairs(
          response,
          pairs.filter((pair) => pair[1] !== right),
        ),
      );
      return;
    }
    if (active === null) {
      return;
    }
    const next = [
      ...pairs.filter((pair) => pair[0] !== active),
      [active, right] as const,
    ];
    quiz.setResponse(screen.id, setMatchPairs(response, next));
    setActive(null);
  };

  return (
    <>
      <div class="pq-match" aria-invalid={invalid}>
        <ul class="pq-match-column" aria-label={t("left")}>
          {lefts.map((left) => {
            const match = connected.get(left);
            return (
              <li key={left}>
                <button
                  type="button"
                  class="pq-match-item"
                  aria-pressed={active === left}
                  data-pq-connected={match === undefined ? "false" : "true"}
                  onClick={() => connect(left)}
                >
                  <span>
                    <Inline nodes={parseInline(left).nodes} />
                  </span>
                  {match === undefined ? null : (
                    <span class="pq-match-pair">
                      → <Inline nodes={parseInline(match).nodes} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <ul class="pq-match-column" aria-label={t("right")}>
          {rights.map((right) => (
            <li key={right}>
              <button
                type="button"
                class="pq-match-item"
                data-pq-connected={usedRights.has(right) ? "true" : "false"}
                onClick={() => rightClick(right)}
              >
                <Inline nodes={parseInline(right).nodes} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p class="pq-match-hint">
        {active === null
          ? t("pickLeft")
          : t("pickMatch", { text: active })}
      </p>
      <FieldError issues={issues} field="pairs" />
    </>
  );
}

const INPUTS: Readonly<Record<string, (props: InputProps) => JSX.Element>> = {
  [QuestionType.Choice]: ChoiceInput,
  [QuestionType.Open]: OpenInput,
  [QuestionType.Range]: RangeInput,
  [QuestionType.List]: ListInput,
  [QuestionType.Cloze]: ClozeInput,
  [QuestionType.Sort]: SortInput,
  [QuestionType.Match]: MatchInput,
};

export function Answers(props: InputProps): JSX.Element {
  const Input = INPUTS[props.screen.type] ?? OpenInput;
  return <Input {...props} />;
}
