/** One big tap target per answer. Typing only where typing is required. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { QuestionType } from "../../core/model/question";
import { ResponseKind, type Response } from "../../core/session/responses";
import { useT } from "../../renderers/preact/i18n";
import type { LiveQuestion } from "../types";

interface InputProps {
  readonly question: LiveQuestion;
  readonly disabled: boolean;
  readonly onSubmit: (response: Response) => void;
}

function SubmitButton({
  label,
  disabled,
  onClick,
}: {
  readonly label: string;
  readonly disabled: boolean;
  readonly onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      class="pq-primary pq-live-submit"
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ChoiceInput({
  question,
  disabled,
  onSubmit,
}: InputProps): JSX.Element {
  const t = useT();
  const [selected, setSelected] = useState<readonly string[]>([]);
  useEffect(() => setSelected([]), [question.id]);

  const toggle = (id: string): void => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  return (
    <>
      <ul class="pq-answers pq-live-answers">
        {question.answers.map((answer, index) => {
          const chosen = selected.includes(answer.id);
          return (
            <li key={answer.id}>
              <button
                type="button"
                class="pq-answer"
                aria-pressed={chosen}
                data-pq-selected={chosen ? "true" : "false"}
                disabled={disabled}
                onClick={() => toggle(answer.id)}
              >
                <span class="pq-answer-number" aria-hidden="true">
                  {index + 1}
                </span>
                <span class="pq-answer-text">{answer.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <SubmitButton
        label={t("liveLockIn")}
        disabled={disabled || selected.length === 0}
        onClick={() => onSubmit({ kind: ResponseKind.Choice, selected })}
      />
    </>
  );
}

function OpenInput({ question, disabled, onSubmit }: InputProps): JSX.Element {
  const t = useT();
  const [text, setText] = useState("");
  useEffect(() => setText(""), [question.id]);
  return (
    <>
      <label class="pq-field">
        <span class="pq-field-label">{t("answerPlaceholder")}</span>
        <input
          class="pq-input"
          type="text"
          autocomplete="off"
          value={text}
          disabled={disabled}
          onInput={(event) => setText(event.currentTarget.value)}
        />
      </label>
      <SubmitButton
        label={t("liveLockIn")}
        disabled={disabled || text.trim().length === 0}
        onClick={() => onSubmit({ kind: ResponseKind.Open, text })}
      />
    </>
  );
}

function RangeInput({ question, disabled, onSubmit }: InputProps): JSX.Element {
  const t = useT();
  const [value, setValue] = useState("");
  useEffect(() => setValue(""), [question.id]);
  const parsed = Number(value.replace(",", "."));
  return (
    <>
      <label class="pq-field">
        <span class="pq-field-label">{t("numberPlaceholder")}</span>
        <input
          class="pq-input pq-input-number"
          type="number"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onInput={(event) => setValue(event.currentTarget.value)}
        />
      </label>
      <SubmitButton
        label={t("liveLockIn")}
        disabled={
          disabled || value.trim().length === 0 || !Number.isFinite(parsed)
        }
        onClick={() => onSubmit({ kind: ResponseKind.Range, value: parsed })}
      />
    </>
  );
}

function ListInput({ question, disabled, onSubmit }: InputProps): JSX.Element {
  const t = useT();
  const [text, setText] = useState("");
  useEffect(() => setText(""), [question.id]);
  const items = text.split("\n").map((item) => item.trim());
  return (
    <>
      <label class="pq-field">
        <span class="pq-field-label">{t("listPlaceholder")}</span>
        <textarea
          class="pq-input"
          rows={4}
          value={text}
          disabled={disabled}
          onInput={(event) => setText(event.currentTarget.value)}
        />
      </label>
      <SubmitButton
        label={t("liveLockIn")}
        disabled={disabled || items.every((item) => item.length === 0)}
        onClick={() => onSubmit({ kind: ResponseKind.List, items })}
      />
    </>
  );
}

function ClozeInput({ question, disabled, onSubmit }: InputProps): JSX.Element {
  const t = useT();
  const [blanks, setBlanks] = useState<readonly string[]>([]);
  useEffect(
    () => setBlanks(Array.from({ length: question.blanks }, () => "")),
    [question.id, question.blanks],
  );
  const setBlank = (index: number, value: string): void => {
    setBlanks((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };
  return (
    <>
      {blanks.map((blank, index) => (
        <label key={index} class="pq-field pq-field-inline">
          <span class="pq-field-label">
            {t("blank", { number: index + 1 })}
          </span>
          <input
            class="pq-input"
            type="text"
            autocomplete="off"
            value={blank}
            disabled={disabled}
            onInput={(event) => setBlank(index, event.currentTarget.value)}
          />
        </label>
      ))}
      <SubmitButton
        label={t("liveLockIn")}
        disabled={
          disabled || blanks.every((blank) => blank.trim().length === 0)
        }
        onClick={() => onSubmit({ kind: ResponseKind.Cloze, blanks })}
      />
    </>
  );
}

function SortInput({ question, disabled, onSubmit }: InputProps): JSX.Element {
  const t = useT();
  const [order, setOrder] = useState<readonly string[]>([]);
  useEffect(
    () => setOrder(question.answers.map((answer) => answer.id)),
    [question.id, question.answers],
  );
  const textOf = new Map(
    question.answers.map((answer) => [answer.id, answer.text]),
  );
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
    setOrder(next);
  };
  return (
    <>
      <ol class="pq-sort">
        {order.map((id, index) => (
          <li key={id} class="pq-sort-item">
            <span class="pq-sort-rank" aria-hidden="true">
              {index + 1}
            </span>
            <span class="pq-sort-text">{textOf.get(id) ?? id}</span>
            <button
              type="button"
              class="pq-sort-button"
              aria-label={t("moveUp", { text: textOf.get(id) ?? id })}
              disabled={disabled || index === 0}
              onClick={() => move(index, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              class="pq-sort-button"
              aria-label={t("moveDown", { text: textOf.get(id) ?? id })}
              disabled={disabled || index === order.length - 1}
              onClick={() => move(index, 1)}
            >
              ↓
            </button>
          </li>
        ))}
      </ol>
      <SubmitButton
        label={t("liveLockIn")}
        disabled={disabled}
        onClick={() => onSubmit({ kind: ResponseKind.Sort, order })}
      />
    </>
  );
}

function MatchInput({ question, disabled, onSubmit }: InputProps): JSX.Element {
  const t = useT();
  const parsed = question.answers.map((answer) => {
    const at = answer.text.indexOf("~");
    return at < 0
      ? { left: answer.text.trim(), right: "" }
      : {
          left: answer.text.slice(0, at).trim(),
          right: answer.text.slice(at + 1).trim(),
        };
  });
  const rights = parsed.map((pair) => pair.right);
  const [picked, setPicked] = useState<Readonly<Record<string, string>>>({});
  useEffect(() => setPicked({}), [question.id]);

  return (
    <>
      {parsed.map((pair) => (
        <label key={pair.left} class="pq-field">
          <span class="pq-field-label">{pair.left}</span>
          <select
            class="pq-input"
            value={picked[pair.left] ?? ""}
            disabled={disabled}
            onChange={(event) =>
              setPicked((current) => ({
                ...current,
                [pair.left]: event.currentTarget.value,
              }))
            }
          >
            <option value="">{t("livePickOne")}</option>
            {rights.map((right) => (
              <option key={right} value={right}>
                {right}
              </option>
            ))}
          </select>
        </label>
      ))}
      <SubmitButton
        label={t("liveLockIn")}
        disabled={disabled || parsed.some((pair) => !picked[pair.left])}
        onClick={() =>
          onSubmit({
            kind: ResponseKind.Match,
            pairs: parsed.map((pair) => [pair.left, picked[pair.left] ?? ""]),
          })
        }
      />
    </>
  );
}

const INPUTS: Readonly<
  Partial<Record<QuestionType, (props: InputProps) => JSX.Element>>
> = {
  [QuestionType.Choice]: ChoiceInput,
  [QuestionType.Open]: OpenInput,
  [QuestionType.Range]: RangeInput,
  [QuestionType.List]: ListInput,
  [QuestionType.Cloze]: ClozeInput,
  [QuestionType.Sort]: SortInput,
  [QuestionType.Match]: MatchInput,
};

export function PlayerAnswer(props: InputProps): JSX.Element {
  const Input = INPUTS[props.question.type] ?? OpenInput;
  return <Input {...props} />;
}
