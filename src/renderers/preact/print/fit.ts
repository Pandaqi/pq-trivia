/**
 * Fit each printed box into its page.
 *
 * Pages have a fixed A4 box. If content is taller, shrink it in steps until it
 * fits. Shrinking has a floor, because paper has no zoom button: past 70% the
 * type is too small to read in a room.
 *
 * A page holding a 2×2 or 1×2 grid is not shrunk as a whole. Its cells already
 * fill the page, so each slide is fitted inside its own cell instead. Shrinking
 * the page and the cells would scale the same text twice.
 */

import type { Translate } from "../../../i18n/types";
import type { PrintProblem } from "./printTypes";

/** Below this the type is too small for a printed page. Warn instead. */
const MIN_ZOOM = 0.7;
/** Shrunk below this and we still fit, but the page gets a readability nudge. */
const READABLE_MIN = 0.85;
const STEP = 0.05;
const SLACK = 0.98;

export interface FitSummary {
  readonly pages: number;
  readonly zoomed: number;
  readonly problems: readonly PrintProblem[];
}

interface BoxFit {
  readonly zoom: number;
  readonly neededPx: number;
  readonly availablePx: number;
  readonly fits: boolean;
}

/** Shrink `content` until `box` holds it, or until the floor. */
function fitBox(
  box: HTMLElement,
  content: HTMLElement,
  minZoom: number,
): BoxFit {
  content.style.zoom = "1";
  const available = box.clientHeight;
  if (available <= 0) {
    return { zoom: 1, neededPx: 0, availablePx: 0, fits: true };
  }

  const savedHeight = content.style.height;
  content.style.height = "auto";
  let height = content.getBoundingClientRect().height;
  const needed = height;
  let zoom = 1;

  while (height > available * SLACK && zoom > minZoom) {
    zoom = Math.max(minZoom, Math.round((zoom - STEP) * 100) / 100);
    content.style.zoom = String(zoom);
    height = content.getBoundingClientRect().height;
  }

  content.style.height = savedHeight;
  return {
    zoom,
    neededPx: Math.round(needed),
    availablePx: available,
    fits: height <= available + 1,
  };
}

export function fitPrintPages(
  root: ParentNode,
  onProblem?: (problem: PrintProblem) => void,
  t: Translate = (key) => key,
): FitSummary {
  const pages = [...root.querySelectorAll<HTMLElement>(".pq-print-page")];
  const problems: PrintProblem[] = [];
  let zoomed = 0;

  pages.forEach((page, index) => {
    const inner = page.querySelector<HTMLElement>(".pq-print-page-inner");
    if (inner === null) {
      return;
    }
    delete page.dataset["pqOverflow"];

    const report = (
      kind: PrintProblem["kind"],
      neededPx: number,
      availablePx: number,
      message: string,
    ): void => {
      if (kind === "overflow") {
        page.dataset["pqOverflow"] = "true";
      }
      const problem: PrintProblem = {
        kind,
        page: index + 1,
        questionId: page.dataset["pqQuestion"] ?? null,
        neededPx,
        availablePx,
        message,
      };
      problems.push(problem);
      onProblem?.(problem);
    };

    // Grid pages: the cells are the page. Fit each slide in its cell.
    const tiles = [...page.querySelectorAll<HTMLElement>(".pq-print-tile")];
    if (tiles.length > 0) {
      inner.style.zoom = "1";
      for (const tile of tiles) {
        const body = tile.querySelector<HTMLElement>(".pq-print-question-body");
        if (body === null) {
          continue;
        }
        const tileFit = fitBox(tile, body, MIN_ZOOM);
        if (tileFit.zoom < 1) {
          zoomed += 1;
        }
        if (!tileFit.fits) {
          report(
            "overflow",
            tileFit.neededPx,
            tileFit.availablePx,
            t("printTileOverflow", {
              page: index + 1,
              needed: Math.round(tileFit.neededPx),
              available: Math.round(tileFit.availablePx),
            }),
          );
          break;
        }
        if (tileFit.zoom < READABLE_MIN) {
          report(
            "readability",
            tileFit.neededPx,
            tileFit.availablePx,
            t("printTileShrunk", {
              page: index + 1,
              percent: Math.round(tileFit.zoom * 100),
            }),
          );
        }
      }
      return;
    }

    const result = fitBox(page, inner, MIN_ZOOM);
    if (result.zoom < 1) {
      zoomed += 1;
    }

    if (!result.fits) {
      report(
        "overflow",
        result.neededPx,
        result.availablePx,
        t("printPageOverflow", {
          page: index + 1,
          needed: Math.round(result.neededPx),
          available: Math.round(result.availablePx),
        }),
      );
    } else if (result.zoom < READABLE_MIN) {
      report(
        "readability",
        result.neededPx,
        result.availablePx,
        t("printPageShrunk", {
          page: index + 1,
          percent: Math.round(result.zoom * 100),
        }),
      );
    }
  });

  return { pages: pages.length, zoomed, problems };
}
