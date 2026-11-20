/** Multi-part: one stem, several inputs, one total. */

import type { JSX } from "preact";
import { PartKind } from "../../core/model/parts";
import { ResponseKind, setPartValue } from "../../core/session/responses";
import { useT } from "../preact/i18n";
import { FieldError, messageFor } from "./fields";
import type { InputProps } from "./fields";

export function PartsInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const values = response.kind === ResponseKind.Parts ? response.values : [];
  if (screen.parts.length === 0) {
    return <p class="pq-field-note">{t("needParts")}</p>;
  }
  return (
    <div class="pq-parts">
      {screen.parts.map((part, index) => {
        const onInput = (event: { currentTarget: HTMLInputElement }): void =>
          quiz.setResponse(
            screen.id,
            setPartValue(response, index, event.currentTarget.value),
          );
        return (
          <label key={`${index}-${part.label}`} class="pq-field">
            <span class="pq-field-label">{part.label}</span>
            {part.kind === PartKind.Number ? (
              <input
                class="pq-input"
                type="number"
                inputMode="decimal"
                value={values[index] ?? ""}
                autocomplete="off"
                aria-invalid={messageFor(issues, "answer") !== null}
                onInput={onInput}
              />
            ) : (
              <input
                class="pq-input"
                type="text"
                value={values[index] ?? ""}
                autocomplete="off"
                aria-invalid={messageFor(issues, "answer") !== null}
                onInput={onInput}
              />
            )}
          </label>
        );
      })}
      <FieldError issues={issues} field="answer" />
    </div>
  );
}
