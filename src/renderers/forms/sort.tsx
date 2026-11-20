/** Sort and rank. Drag to move, or use the two arrow buttons. */

import type { JSX } from "preact";
import { useMemo, useState } from "preact/hooks";
import { derivedRng, shuffleAway } from "../../core/plan/shuffle";
import { ResponseKind, setSortOrder } from "../../core/session/responses";
import { useT } from "../preact/i18n";
import { Inline } from "../preact/components/Inline";
import { allowDrop, dragPayload, moveItem } from "./drag";
import { FieldError, messageFor } from "./fields";
import type { InputProps } from "./fields";

export function SortInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const [dragging, setDragging] = useState<string | null>(null);
  const stored = response.kind === ResponseKind.Sort ? response.order : [];
  // The authored order is the correct order. Showing it would hand out the
  // answer for free, so an untouched question starts shuffled.
  const startOrder = useMemo(
    () =>
      shuffleAway(
        screen.answers.map((answer) => answer.id),
        derivedRng(screen.id, "sort-start"),
      ),
    [screen],
  );
  const order = stored.length === 0 ? startOrder : stored;
  const textOf = new Map(
    screen.answers.map((answer) => [answer.id, answer.text]),
  );
  const nodesOf = new Map(
    screen.answers.map((answer) => [answer.id, answer.nodes]),
  );
  const invalid = messageFor(issues, "order") !== null;

  const setOrder = (next: readonly string[]): void => {
    quiz.setResponse(screen.id, setSortOrder(response, next));
  };

  const move = (index: number, delta: number): void => {
    setOrder(moveItem(order, index, index + delta));
  };

  const drop = (event: DragEvent, index: number): void => {
    event.preventDefault();
    const id = dragPayload(event) ?? dragging;
    setDragging(null);
    if (id === null) {
      return;
    }
    setOrder(moveItem(order, order.indexOf(id), index));
  };

  return (
    <>
      <ol class="pq-sort" aria-invalid={invalid}>
        {order.map((id, index) => (
          <li
            key={id}
            class="pq-sort-item"
            draggable
            data-pq-dragging={dragging === id ? "true" : "false"}
            onDragStart={(event) => {
              setDragging(id);
              event.dataTransfer?.setData("text/plain", id);
            }}
            onDragEnd={() => setDragging(null)}
            onDragOver={allowDrop}
            onDrop={(event) => drop(event, index)}
          >
            <span class="pq-sort-rank" aria-hidden="true">
              {index + 1}
            </span>
            <span class="pq-sort-text">
              {nodesOf.has(id) ? <Inline nodes={nodesOf.get(id) ?? []} /> : id}
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
