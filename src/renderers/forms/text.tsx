/**
 * The typing widgets: open, range, estimate, list and cloze.
 *
 * Range and estimate share the number field, the slider and the phone keypad.
 * One parser, one place where "1,5" becomes 1.5.
 */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { Quiz } from "../../core/session/quiz";
import {
  ResponseKind,
  setClozeBlanks,
  setListItems,
  setOpenText,
  setRangeValue,
} from "../../core/session/responses";
import {
  speechSupported,
  startDictation,
  type Dictation,
} from "../../platform/speech";
import { useT } from "../preact/i18n";
import { FieldError, messageFor } from "./fields";
import type { InputProps } from "./fields";

/** A tight slider gets halves; a wide one stays on whole numbers. */
const SLIDER_HALF_STEP_SPAN = 20;
const SLIDER_HALF_STEP = 0.5;
const SLIDER_WHOLE_STEP = 1;

function sliderStep(min: number, max: number): number {
  return max - min <= SLIDER_HALF_STEP_SPAN
    ? SLIDER_HALF_STEP
    : SLIDER_WHOLE_STEP;
}

/** The parser both numeric widgets use. `1,5` is one and a half. */
export function parseNumberText(raw: string): number | null {
  const text = raw.trim();
  if (text.length === 0) {
    return null;
  }
  const value = Number(text.replaceAll(" ", "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function NumberPad({
  onKey,
}: {
  readonly onKey: (key: string) => void;
}): JSX.Element {
  const t = useT();
  return (
    <div class="pq-numpad pq-center" role="group" aria-label={t("numberPad")}>
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
        <button
          key={digit}
          type="button"
          class="pq-numpad-key"
          onClick={() => onKey(digit)}
        >
          {digit}
        </button>
      ))}
      <button type="button" class="pq-numpad-key" onClick={() => onKey(".")}>
        .
      </button>
      <button type="button" class="pq-numpad-key" onClick={() => onKey("0")}>
        0
      </button>
      <button type="button" class="pq-numpad-key" onClick={() => onKey("-")}>
        −
      </button>
      <button
        type="button"
        class="pq-numpad-key pq-numpad-wide"
        onClick={() => onKey("back")}
      >
        {t("backspace")}
      </button>
      <button
        type="button"
        class="pq-numpad-key pq-numpad-wide"
        onClick={() => onKey("clear")}
      >
        {t("clearValue")}
      </button>
    </div>
  );
}

function useNumericField(
  quiz: Quiz,
  screen: InputProps["screen"],
  response: InputProps["response"],
): {
  readonly raw: string;
  readonly apply: (text: string) => void;
  readonly key: (name: string) => void;
} {
  const value = response.kind === ResponseKind.Range ? response.value : null;
  const [raw, setRaw] = useState(value === null ? "" : String(value));

  // A new question means a new number. The old text must not follow it.
  useEffect(() => {
    setRaw(value === null ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.id]);

  const apply = (text: string): void => {
    setRaw(text);
    quiz.setResponse(screen.id, setRangeValue(response, parseNumberText(text)));
  };

  const key = (name: string): void => {
    if (name === "clear") {
      apply("");
      return;
    }
    if (name === "back") {
      apply(raw.slice(0, -1));
      return;
    }
    apply(`${raw}${name}`);
  };

  return { raw, apply, key };
}

function NumberField({
  quiz,
  screen,
  response,
  issues,
  field,
  label,
}: InputProps & {
  readonly field: string;
  readonly label: string;
}): JSX.Element {
  const { raw, apply, key } = useNumericField(quiz, screen, response);
  return (
    <>
      <label class="pq-field">
        <span class="pq-field-label">{label}</span>
        <span class="pq-input-row">
          <input
            class="pq-input pq-input-number"
            type="number"
            inputMode="decimal"
            value={raw}
            aria-invalid={messageFor(issues, field) !== null}
            onInput={(event) => apply(event.currentTarget.value)}
          />
          {screen.unit === null ? null : (
            <span class="pq-unit">{screen.unit}</span>
          )}
        </span>
        <FieldError issues={issues} field={field} />
      </label>
      <NumberPad onKey={key} />
    </>
  );
}

export function OpenInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const value = response.kind === ResponseKind.Open ? response.text : "";
  const [mic, setMic] = useState<Dictation | null>(null);
  const listId = `pq-suggest-${screen.id}`;
  const supported = speechSupported();
  return (
    <label class="pq-field">
      <span class="pq-field-label">{t("answerPlaceholder")}</span>
      <span class="pq-input-row">
        <input
          class="pq-input"
          type="text"
          value={value}
          autocomplete="off"
          list={screen.suggestions.length > 0 ? listId : undefined}
          aria-invalid={messageFor(issues, "answer") !== null}
          onInput={(event) =>
            quiz.setResponse(
              screen.id,
              setOpenText(response, event.currentTarget.value),
            )
          }
        />
        {supported ? (
          <button
            type="button"
            class="pq-mic"
            aria-pressed={mic !== null}
            title={t("speechHint")}
            onClick={() => {
              if (mic !== null) {
                mic.stop();
                setMic(null);
                return;
              }
              setMic(
                startDictation({
                  onText: (text) => {
                    quiz.setResponse(screen.id, setOpenText(response, text));
                    setMic(null);
                  },
                  onEnd: () => setMic(null),
                }),
              );
            }}
          >
            {t("speak")}
          </button>
        ) : null}
      </span>
      {screen.suggestions.length === 0 ? null : (
        <datalist id={listId}>
          {screen.suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}
      <FieldError issues={issues} field="answer" />
    </label>
  );
}

export function RangeInput(props: InputProps): JSX.Element {
  const t = useT();
  const value =
    props.response.kind === ResponseKind.Range ? props.response.value : null;
  return (
    <>
      {props.screen.slider === null ? null : (
        <label class="pq-field pq-field-slider">
          <span class="pq-field-label">{t("sliderLabel")}</span>
          <input
            class="pq-slider"
            type="range"
            min={props.screen.slider.min}
            max={props.screen.slider.max}
            step={sliderStep(props.screen.slider.min, props.screen.slider.max)}
            value={value ?? props.screen.slider.min}
            onInput={(event) =>
              props.quiz.setResponse(
                props.screen.id,
                setRangeValue(
                  props.response,
                  parseNumberText(event.currentTarget.value),
                ),
              )
            }
          />
          <output class="pq-slider-value">
            {value ?? props.screen.slider.min}
          </output>
        </label>
      )}
      <NumberField {...props} field="number" label={t("numberPlaceholder")} />
    </>
  );
}

export function EstimateInput(props: InputProps): JSX.Element {
  const t = useT();
  const { tolerance, unit } = props.screen;
  const hint =
    tolerance === null
      ? null
      : t("toleranceHint", {
          tolerance,
          unit: unit ?? "",
        });
  return (
    <>
      {props.screen.slider === null ? null : <RangeInput {...props} />}
      {props.screen.slider === null ? (
        <NumberField {...props} field="number" label={t("numberPlaceholder")} />
      ) : null}
      {hint === null ? null : <p class="pq-field-note">{hint}</p>}
    </>
  );
}

export function ListInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const items = response.kind === ResponseKind.List ? response.items : [];
  return (
    <label class="pq-field">
      <span class="pq-field-label">{t("listPlaceholder")}</span>
      <textarea
        class="pq-input"
        rows={3}
        value={items.join("\n")}
        aria-invalid={messageFor(issues, "answer") !== null}
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

export function ClozeInput({
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
