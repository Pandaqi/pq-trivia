/**
 * Click on the image. Hotspot and diagram share the frame.
 *
 * A hotspot has one job: pick a spot. Do not list the answers beside it; that
 * turns the map into a giveaway. A diagram still lists its draggable labels.
 */

import type { ComponentChildren, JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { inlineToPlainText, parseInline } from "../../core/format/inline";
import {
  ResponseKind,
  setHotspotPoint,
  setMatchPairs,
} from "../../core/session/responses";
import type { QuestionViewModel } from "../../core/session/viewModel";
import { useT } from "../preact/i18n";
import { Inline } from "../preact/components/Inline";
import { Media } from "../preact/components/Media";
import type { Point } from "../../core/values/point";
import { allowDrop, connectPair, dragPayload } from "./drag";
import { FieldError } from "./fields";
import type { InputProps } from "./fields";

interface MapClick {
  readonly clientX: number;
  readonly clientY: number;
  readonly detail?: number;
  readonly currentTarget: {
    getBoundingClientRect(): {
      readonly left: number;
      readonly top: number;
      readonly width: number;
      readonly height: number;
    };
  };
}

function clampPercent(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}

function percentOf(event: MapClick): Point | null {
  const box = event.currentTarget.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) {
    return null;
  }
  return {
    x: clampPercent(((event.clientX - box.left) / box.width) * 100),
    y: clampPercent(((event.clientY - box.top) / box.height) * 100),
  };
}

function MapFrame({
  screen,
  onPick,
  onKeyDown,
  keyboardPoint = null,
  describedBy,
  children,
}: {
  readonly screen: QuestionViewModel;
  readonly onPick?: (point: Point) => void;
  readonly onKeyDown?: (event: KeyboardEvent) => void;
  readonly keyboardPoint?: Point | null;
  readonly describedBy?: string;
  readonly children?: ComponentChildren;
}): JSX.Element | null {
  if (screen.map === null) {
    return null;
  }
  return (
    <div class="pq-map pq-center">
      {onPick === undefined ? (
        <div class="pq-map-surface pq-map-static">
          <Media item={screen.map} />
          {children}
        </div>
      ) : (
        <button
          type="button"
          class="pq-map-surface"
          aria-label={inlineToPlainText(screen.title)}
          aria-describedby={describedBy}
          onKeyDown={onKeyDown}
          onClick={(event) => {
            // Keyboard activation has no pointer coordinates. Use the
            // crosshair instead of the top-left corner.
            if (event.detail === 0) {
              onPick(keyboardPoint ?? { x: 50, y: 50 });
              return;
            }
            const point = percentOf(event);
            if (point !== null) {
              onPick(point);
            }
          }}
        >
          <img
            src={screen.map.path}
            alt={screen.map.alt ?? ""}
            loading="lazy"
            decoding="async"
          />
          {children}
        </button>
      )}
    </div>
  );
}

/** Hotspot: one spot on the map. A wrong click is still a click. */
export function HotspotInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const chosen = response.kind === ResponseKind.Hotspot ? response.point : null;
  const [cursor, setCursor] = useState<Point | null>(null);
  const statusId = `pq-map-status-${screen.id}`;

  useEffect(() => {
    setCursor(null);
  }, [screen.id]);

  const pick = (point: Point): void => {
    setCursor(null);
    quiz.setResponse(screen.id, setHotspotPoint(response, point));
  };

  // Arrow keys move a neutral crosshair. Enter or Space drops it. No list of
  // answer locations: the player has to know the map, as with a mouse.
  const onMapKey = (event: KeyboardEvent): void => {
    const step = event.shiftKey ? 10 : 2;
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") {
      dx = -step;
    } else if (event.key === "ArrowRight") {
      dx = step;
    } else if (event.key === "ArrowUp") {
      dy = -step;
    } else if (event.key === "ArrowDown") {
      dy = step;
    }
    if (dx !== 0 || dy !== 0) {
      event.preventDefault();
      event.stopPropagation();
      const start = cursor ?? chosen ?? { x: 50, y: 50 };
      setCursor({
        x: clampPercent(start.x + dx),
        y: clampPercent(start.y + dy),
      });
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      pick(cursor ?? chosen ?? { x: 50, y: 50 });
    }
  };

  const shown = cursor ?? chosen;
  return (
    <div class="pq-hotspot">
      <MapFrame
        screen={screen}
        onPick={pick}
        onKeyDown={onMapKey}
        keyboardPoint={cursor}
        describedBy={statusId}
      >
        {shown === null ? null : (
          <span
            class={`pq-map-marker${cursor === null ? "" : " pq-map-cursor"}`}
            style={`left:${shown.x}%;top:${shown.y}%`}
            aria-hidden="true"
          />
        )}
      </MapFrame>
      <p class="pq-map-status" id={statusId} role="status">
        {cursor !== null
          ? t("mapMoveHint", { x: cursor.x, y: cursor.y })
          : chosen === null
            ? t("mapHint")
            : t("mapPicked", { x: chosen.x, y: chosen.y })}
      </p>
      <FieldError issues={issues} field="answer" />
    </div>
  );
}

/** Diagram: labels onto targets. Drag one, or pick a label and a target. */
export function DiagramInput({
  quiz,
  screen,
  response,
  issues,
}: InputProps): JSX.Element {
  const t = useT();
  const pairs = response.kind === ResponseKind.Match ? response.pairs : [];
  const [active, setActive] = useState<string | null>(null);
  const placed = new Map(pairs.map((pair) => [pair[0], pair[1]]));
  const used = new Set(pairs.map((pair) => pair[1]));

  const place = (label: string, target: string): void => {
    quiz.setResponse(
      screen.id,
      setMatchPairs(response, connectPair(pairs, label, target)),
    );
    setActive(null);
  };

  return (
    <div class="pq-diagram">
      <MapFrame screen={screen}>
        {screen.targets.map((target) => {
          const owner = pairs.find((pair) => pair[1] === target.label);
          return (
            <button
              key={target.label}
              type="button"
              class="pq-target"
              style={`left:${target.x}%;top:${target.y}%`}
              aria-pressed={active !== null}
              data-pq-used={used.has(target.label) ? "true" : "false"}
              onClick={() => {
                if (active !== null) {
                  place(active, target.label);
                }
              }}
              onDragOver={allowDrop}
              onDrop={(event) => {
                event.preventDefault();
                const label = dragPayload(event) ?? active;
                if (label !== null) {
                  place(label, target.label);
                }
              }}
            >
              <span class="pq-target-label">{target.label}</span>
              {owner === undefined ? null : (
                <span class="pq-target-owner">{owner[0]}</span>
              )}
            </button>
          );
        })}
      </MapFrame>
      <ul class="pq-labels" aria-label={t("labelList")}>
        {screen.answers.map((answer) => {
          const target = placed.get(answer.text);
          return (
            <li key={answer.id}>
              <button
                type="button"
                class="pq-label"
                draggable
                aria-pressed={active === answer.text}
                data-pq-placed={target === undefined ? "false" : "true"}
                onClick={() =>
                  setActive(active === answer.text ? null : answer.text)
                }
                onDragStart={(event) =>
                  event.dataTransfer?.setData("text/plain", answer.text)
                }
              >
                <Inline nodes={parseInline(answer.text).nodes} />
                {target === undefined ? null : (
                  <span class="pq-label-target"> → {target}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <FieldError issues={issues} field="pairs" />
    </div>
  );
}
