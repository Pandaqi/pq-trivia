/**
 * Click on the image. Hotspot and diagram share the frame.
 *
 * The image is a shortcut, never the only way in. Every region and every
 * target is also a button in a visible list, so a keyboard and a screen reader
 * can answer the same question. Clicking the image is extra, not required.
 */

import type { ComponentChildren, JSX } from "preact";
import { useState } from "preact/hooks";
import { inlineToPlainText, parseInline } from "../../core/format/inline";
import {
  ResponseKind,
  setHotspotPoint,
  setMatchPairs,
} from "../../core/session/responses";
import { parsePoint } from "../../core/values/point";
import type { QuestionViewModel } from "../../core/session/viewModel";
import { useT } from "../preact/i18n";
import { Inline } from "../preact/components/Inline";
import { Media } from "../preact/components/Media";
import { allowDrop, connectPair, dragPayload } from "./drag";
import { FieldError } from "./fields";
import type { InputProps } from "./fields";

interface MapClick {
  readonly clientX: number;
  readonly clientY: number;
  readonly currentTarget: {
    getBoundingClientRect(): {
      readonly left: number;
      readonly top: number;
      readonly width: number;
      readonly height: number;
    };
  };
}

function percentOf(event: MapClick): { x: number; y: number } | null {
  const box = event.currentTarget.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) {
    return null;
  }
  const x = ((event.clientX - box.left) / box.width) * 100;
  const y = ((event.clientY - box.top) / box.height) * 100;
  return {
    x: Math.round(Math.min(100, Math.max(0, x))),
    y: Math.round(Math.min(100, Math.max(0, y))),
  };
}

function MapFrame({
  screen,
  onPick,
  children,
}: {
  readonly screen: QuestionViewModel;
  readonly onPick?: (event: MapClick) => void;
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
          onClick={(event) => {
            const point = percentOf(event);
            if (point !== null) {
              onPick(event);
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
  const regions = screen.answers
    .map((answer, index) => ({
      answer,
      index,
      point: parsePoint(answer.text.replace(/^.*@/, "")),
    }))
    .filter((entry) => entry.point !== null);
  return (
    <div class="pq-hotspot">
      <MapFrame
        screen={screen}
        onPick={(event) => {
          const point = percentOf(event);
          if (point !== null) {
            quiz.setResponse(screen.id, setHotspotPoint(response, point));
          }
        }}
      >
        {chosen === null ? null : (
          <span
            class="pq-map-marker"
            style={`left:${chosen.x}%;top:${chosen.y}%`}
            aria-hidden="true"
          />
        )}
      </MapFrame>
      <p class="pq-map-status" role="status">
        {chosen === null
          ? t("mapHint")
          : t("mapPicked", { x: chosen.x, y: chosen.y })}
      </p>
      <div class="pq-regions">
        <p class="pq-field-label" id={`pq-regions-${screen.id}`}>
          {t("regionList")}
        </p>
        <ul aria-labelledby={`pq-regions-${screen.id}`}>
          {regions.map((entry) => (
            <li key={entry.answer.id}>
              <button
                type="button"
                class="pq-region"
                aria-pressed={
                  chosen !== null &&
                  entry.point !== null &&
                  chosen.x === entry.point.x &&
                  chosen.y === entry.point.y
                }
                onClick={() => {
                  if (entry.point !== null) {
                    quiz.setResponse(
                      screen.id,
                      setHotspotPoint(response, entry.point),
                    );
                  }
                }}
              >
                {entry.answer.text.includes("@")
                  ? entry.answer.text.split("@")[0]
                  : t("region", { number: entry.index + 1 })}
              </button>
            </li>
          ))}
        </ul>
      </div>
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
