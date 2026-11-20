/** Matrix: rows of statements against one shared scale. */

import type { JSX } from "preact";
import {
  ResponseKind,
  setMatrixRow,
  toggleMatrixCell,
} from "../../core/session/responses";
import { parseInline } from "../../core/format/inline";
import { useT } from "../preact/i18n";
import { Inline } from "../preact/components/Inline";
import { FieldError, messageFor } from "./fields";
import type { InputProps } from "./fields";

export function MatrixInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const rows = response.kind === ResponseKind.Matrix ? response.rows : [];
  const invalid = messageFor(issues, "answer") !== null;
  const type = screen.multiple ? "checkbox" : "radio";
  return (
    <>
      <table class="pq-matrix" aria-invalid={invalid}>
        <thead>
          <tr>
            <td />
            {screen.answers.map((answer) => (
              <th key={answer.id} scope="col">
                <Inline nodes={answer.nodes} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {screen.rows.map((row, index) => {
            const selected = rows[index] ?? [];
            return (
              <tr key={`${index}-${row}`}>
                <th scope="row">
                  <Inline nodes={parseInline(row).nodes} />
                </th>
                {screen.answers.map((answer) => (
                  <td key={answer.id}>
                    <input
                      type={type}
                      name={`${screen.id}-row-${index}`}
                      checked={selected.includes(answer.id)}
                      aria-label={`${row}: ${answer.text}`}
                      onChange={() => {
                        if (response.kind !== ResponseKind.Matrix) {
                          return;
                        }
                        quiz.setResponse(
                          screen.id,
                          screen.multiple
                            ? toggleMatrixCell(response, index, answer.id, true)
                            : setMatrixRow(response, index, [answer.id]),
                        );
                      }}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p class="pq-field-note">
        {screen.multiple ? t("matrixMany") : t("matrixOne")}
      </p>
      <FieldError issues={issues} field="answer" />
    </>
  );
}
