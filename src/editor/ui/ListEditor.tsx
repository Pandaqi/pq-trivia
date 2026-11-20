/**
 * Rows of values: answers, media, tags.
 *
 * Every row can be moved with buttons and with Alt+↑/↓, so nothing here needs
 * a mouse. The optional checkbox marks a correct answer.
 */

import type { JSX } from "preact";
import { DraftText } from "./Field";

export interface ListEditorProps {
  readonly id: string;
  readonly values: readonly string[];
  readonly correct?: readonly string[] | undefined;
  readonly onToggleCorrect?: ((value: string) => void) | undefined;
  readonly onChange: (index: number, value: string) => void;
  readonly onAdd: () => void;
  readonly onRemove: (index: number) => void;
  readonly onMove: (index: number, delta: number) => void;
  readonly addLabel: string;
  readonly emptyText: string;
  readonly extra?: JSX.Element | null | undefined;
}

export function ListEditor({
  id,
  values,
  correct,
  onToggleCorrect,
  onChange,
  onAdd,
  onRemove,
  onMove,
  addLabel,
  emptyText,
  extra,
}: ListEditorProps): JSX.Element {
  const marks =
    correct !== undefined && onToggleCorrect !== undefined
      ? { correct, onToggleCorrect }
      : null;

  const altMove = (event: KeyboardEvent, index: number): void => {
    if (!event.altKey) {
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }
    event.preventDefault();
    onMove(index, event.key === "ArrowUp" ? -1 : 1);
  };

  return (
    <div class="pq-editor-list-editor">
      {values.length === 0 ? <p class="pq-editor-hint">{emptyText}</p> : null}
      <ul class="pq-editor-list">
        {values.map((value, index) => (
          <li class="pq-editor-row" key={`${id}-${index}`}>
            {marks === null ? null : (
              <input
                type="checkbox"
                id={`${id}-correct-${index}`}
                checked={marks.correct.includes(value)}
                onChange={() => marks.onToggleCorrect(value)}
              />
            )}
            <DraftText
              id={`${id}-value-${index}`}
              value={value}
              onCommit={(next) => onChange(index, next)}
            />
            <button
              type="button"
              onClick={() => onMove(index, -1)}
              disabled={index === 0}
              aria-label={`Move ${value} up`}
              onKeyDown={(event) => {
                altMove(event, index);
              }}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onMove(index, 1)}
              disabled={index === values.length - 1}
              aria-label={`Move ${value} down`}
              onKeyDown={(event) => {
                altMove(event, index);
              }}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${value}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div class="pq-editor-actions">
        <button type="button" onClick={onAdd}>
          {addLabel}
        </button>
        {extra ?? null}
      </div>
    </div>
  );
}
