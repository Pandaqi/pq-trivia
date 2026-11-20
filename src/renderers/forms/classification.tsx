/** Classification: items into named buckets. Click first, drag too. */

import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { parseInline } from "../../core/format/inline";
import {
  ResponseKind,
  setBucketPlacements,
} from "../../core/session/responses";
import { useT } from "../preact/i18n";
import { Inline } from "../preact/components/Inline";
import { allowDrop, dragPayload, placeItem } from "./drag";
import { FieldError } from "./fields";
import type { InputProps } from "./fields";

export function ClassificationInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const [active, setActive] = useState<string | null>(null);
  const placements =
    response.kind === ResponseKind.Buckets ? response.placements : [];
  const bucketOf = new Map(placements.map((pair) => [pair[0], pair[1]]));

  const place = (item: string, bucket: string): void => {
    quiz.setResponse(
      screen.id,
      setBucketPlacements(response, placeItem(placements, item, bucket)),
    );
    setActive(null);
  };

  const remove = (item: string): void => {
    quiz.setResponse(
      screen.id,
      setBucketPlacements(
        response,
        placements.filter((pair) => pair[0] !== item),
      ),
    );
  };

  return (
    <div class="pq-classification">
      <ul class="pq-items" aria-label={t("itemList")}>
        {screen.answers.map((answer) => {
          const bucket = bucketOf.get(answer.text);
          return (
            <li key={answer.id}>
              <button
                type="button"
                class="pq-label"
                draggable
                aria-pressed={active === answer.text}
                data-pq-placed={bucket === undefined ? "false" : "true"}
                onClick={() =>
                  setActive(active === answer.text ? null : answer.text)
                }
                onDragStart={(event) =>
                  event.dataTransfer?.setData("text/plain", answer.text)
                }
              >
                <Inline nodes={parseInline(answer.text).nodes} />
              </button>
            </li>
          );
        })}
      </ul>
      <div class="pq-buckets">
        {screen.buckets.map((bucket) => (
          <section
            key={bucket}
            class="pq-bucket"
            aria-label={bucket}
            onDragOver={allowDrop}
            onDrop={(event) => {
              event.preventDefault();
              const item = dragPayload(event) ?? active;
              if (item !== null) {
                place(item, bucket);
              }
            }}
          >
            <button
              type="button"
              class="pq-bucket-name"
              onClick={() => {
                if (active !== null) {
                  place(active, bucket);
                }
              }}
            >
              {bucket}
            </button>
            <ul>
              {placements
                .filter((pair) => pair[1] === bucket)
                .map((pair) => (
                  <li key={pair[0]}>
                    <button
                      type="button"
                      class="pq-label pq-placed"
                      title={t("removeItem")}
                      onClick={() => remove(pair[0])}
                    >
                      {pair[0]}
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      <FieldError issues={issues} field="answer" />
    </div>
  );
}
