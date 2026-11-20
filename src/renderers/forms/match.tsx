/** Match: two columns. Click left then right, or drag left onto right. */

import type { JSX } from "preact";
import { useMemo, useState } from "preact/hooks";
import { parseInline } from "../../core/format/inline";
import { derivedRng, shuffleAway } from "../../core/plan/shuffle";
import { ResponseKind, setMatchPairs } from "../../core/session/responses";
import { useT } from "../preact/i18n";
import { Inline } from "../preact/components/Inline";
import { allowDrop, connectPair, dragPayload } from "./drag";
import { FieldError, messageFor } from "./fields";
import type { InputProps } from "./fields";

function splitPair(text: string): [string, string] {
  const index = text.indexOf("~");
  if (index < 0) {
    return [text.trim(), ""];
  }
  return [text.slice(0, index).trim(), text.slice(index + 1).trim()];
}

export function MatchInput({
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
      shuffleAway(
        parsed.map((pair) => pair[1]),
        derivedRng(screen.id, "match-right"),
      ),
    [parsed, screen.id],
  );
  const connected = new Map(pairs.map((pair) => [pair[0], pair[1]]));
  const usedRights = new Set(pairs.map((pair) => pair[1]));
  const invalid = messageFor(issues, "pairs") !== null;

  const connect = (left: string, right: string): void => {
    quiz.setResponse(
      screen.id,
      setMatchPairs(response, connectPair(pairs, left, right)),
    );
    setActive(null);
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
    if (active !== null) {
      connect(active, right);
    }
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
                  draggable
                  aria-pressed={active === left}
                  data-pq-connected={match === undefined ? "false" : "true"}
                  onClick={() => setActive(active === left ? null : left)}
                  onDragStart={(event) =>
                    event.dataTransfer?.setData("text/plain", left)
                  }
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
                onDragOver={allowDrop}
                onDrop={(event) => {
                  event.preventDefault();
                  const left = dragPayload(event) ?? active;
                  if (left !== null) {
                    connect(left, right);
                  }
                }}
              >
                <Inline nodes={parseInline(right).nodes} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p class="pq-match-hint">
        {active === null ? t("pickLeft") : t("pickMatch", { text: active })}
      </p>
      <FieldError issues={issues} field="pairs" />
    </>
  );
}
