/** Match: two columns. Click left then right, or drag left onto right. */

import type { JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
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

/** One line, and the two dots that anchor it. */
interface MatchLine {
  readonly key: string;
  readonly color: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

// A different colour per left-hand item, so crossing lines stay readable.
const MATCH_COLORS: readonly string[] = [
  "#b03a2e",
  "#1f6f8b",
  "#2e7d32",
  "#7b4fa3",
  "#b26a00",
  "#0f766e",
  "#a21caf",
  "#475569",
];

function sameLines(
  left: readonly MatchLine[],
  right: readonly MatchLine[],
): boolean {
  return (
    left.length === right.length &&
    left.every((line, index) => {
      const other = right[index];
      return (
        other !== undefined &&
        line.key === other.key &&
        line.x1 === other.x1 &&
        line.y1 === other.y1 &&
        line.x2 === other.x2 &&
        line.y2 === other.y2 &&
        line.color === other.color
      );
    })
  );
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
  const pairKey = JSON.stringify(pairs);
  const connected = new Map(pairs.map((pair) => [pair[0], pair[1]]));
  const usedRights = new Set(pairs.map((pair) => pair[1]));
  const invalid = messageFor(issues, "pairs") !== null;
  const boxRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef(new Map<string, HTMLButtonElement>());
  const rightRefs = useRef(new Map<string, HTMLButtonElement>());
  const [lines, setLines] = useState<readonly MatchLine[]>([]);
  const measureRef = useRef<() => void>(() => undefined);

  const measure = (): void => {
    const box = boxRef.current;
    if (box === null) {
      return;
    }
    const frame = box.getBoundingClientRect();
    const next: MatchLine[] = [];
    for (const [left, right] of pairs) {
      const leftItem = leftRefs.current.get(left);
      const rightItem = rightRefs.current.get(right);
      if (leftItem === undefined || rightItem === undefined) {
        continue;
      }
      const a = leftItem.getBoundingClientRect();
      const b = rightItem.getBoundingClientRect();
      const colourIndex = lefts.indexOf(left);
      next.push({
        key: `${left}\u0000${right}`,
        color: MATCH_COLORS[colourIndex % MATCH_COLORS.length] ?? "#b03a2e",
        x1: a.right - frame.left,
        y1: a.top + a.height / 2 - frame.top,
        x2: b.left - frame.left,
        y2: b.top + b.height / 2 - frame.top,
      });
    }
    setLines((previous) => (sameLines(previous, next) ? previous : next));
  };

  measureRef.current = measure;

  useEffect(() => {
    measureRef.current();
  }, [pairKey, screen.id]);

  useEffect(() => {
    const box = boxRef.current;
    if (box === null) {
      return;
    }
    const update = (): void => measureRef.current();
    update();
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => update())
        : null;
    observer?.observe(box);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

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
      <div class="pq-match-wrap" ref={boxRef}>
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
                    ref={(element) => {
                      if (element === null) {
                        leftRefs.current.delete(left);
                      } else {
                        leftRefs.current.set(left, element);
                      }
                    }}
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
                  ref={(element) => {
                    if (element === null) {
                      rightRefs.current.delete(right);
                    } else {
                      rightRefs.current.set(right, element);
                    }
                  }}
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
        <svg class="pq-match-lines" aria-hidden="true">
          {lines.map((line) => (
            <g key={line.key}>
              <line
                class="pq-match-line"
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.color}
                stroke-width="2.5"
                stroke-linecap="round"
              />
              <circle
                class="pq-match-dot"
                cx={line.x1}
                cy={line.y1}
                r="5"
                fill={line.color}
                stroke="var(--pq-slide, #fff)"
                stroke-width="2"
              />
              <circle
                class="pq-match-dot"
                cx={line.x2}
                cy={line.y2}
                r="5"
                fill={line.color}
                stroke="var(--pq-slide, #fff)"
                stroke-width="2"
              />
            </g>
          ))}
        </svg>
      </div>
      <FieldError issues={issues} field="pairs" />
    </>
  );
}
