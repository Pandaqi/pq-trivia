import type { Translate } from "../i18n/types";

/**
 * The wizard's layout: which panes are up, and how wide they are.
 *
 * Panes are ordered once, here, so a saved layout can never reorder them or
 * invent one. Sizes are fractions of the row, like `1.4fr`.
 */

export enum EditorPane {
  Slides = "slides",
  Form = "form",
  Syntax = "syntax",
  Preview = "preview",
}

export interface EditorLayout {
  readonly panes: readonly EditorPane[];
  readonly sizes: Readonly<Partial<Record<EditorPane, number>>>;
}

/** Display order. A layout only decides what is on, never what comes first. */
export const PANE_ORDER: readonly EditorPane[] = [
  EditorPane.Slides,
  EditorPane.Form,
  EditorPane.Syntax,
  EditorPane.Preview,
];

export const PANE_LABEL_KEYS: Readonly<Record<EditorPane, string>> = {
  [EditorPane.Slides]: "paneSlides",
  [EditorPane.Form]: "paneDetails",
  [EditorPane.Syntax]: "paneSyntax",
  [EditorPane.Preview]: "panePreview",
};

/** A pane's name in the page's language. */
export function paneLabel(t: Translate, pane: EditorPane): string {
  return t(PANE_LABEL_KEYS[pane]);
}

/** A pane will not be dragged narrower than this, in pixels. */
export const MIN_PANE_WIDTH = 150;

const DEFAULT_SIZES: Readonly<Record<EditorPane, number>> = {
  [EditorPane.Slides]: 1.1,
  [EditorPane.Form]: 1.8,
  [EditorPane.Syntax]: 1.5,
  [EditorPane.Preview]: 1.7,
};

const STORAGE_KEY = "pq-editor-layout";

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Slides and the preview. The two things you look at most. */
export function defaultLayout(hasPreview: boolean): EditorLayout {
  return {
    panes: hasPreview
      ? [EditorPane.Slides, EditorPane.Preview]
      : [EditorPane.Slides, EditorPane.Form],
    sizes: {},
  };
}

/** Known panes, in display order, with the preview dropped when it cannot run. */
export function normalizePanes(
  panes: readonly EditorPane[],
  hasPreview: boolean,
): readonly EditorPane[] {
  const wanted = new Set(panes);
  return PANE_ORDER.filter(
    (pane) => wanted.has(pane) && (pane !== EditorPane.Preview || hasPreview),
  );
}

function knownPane(value: unknown): value is EditorPane {
  return typeof value === "string" && PANE_ORDER.some((pane) => pane === value);
}

function readSizes(value: unknown): Partial<Record<EditorPane, number>> {
  const sizes: Partial<Record<EditorPane, number>> = {};
  if (typeof value !== "object" || value === null) {
    return sizes;
  }
  const record = value as Record<string, unknown>;
  for (const pane of PANE_ORDER) {
    const size = record[pane];
    if (typeof size === "number" && Number.isFinite(size) && size > 0) {
      sizes[pane] = size;
    }
  }
  return sizes;
}

/** The last visit, or null when there is nothing worth reading. */
function readStored(hasPreview: boolean): EditorLayout | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const panes = (parsed as { panes?: unknown }).panes;
    if (!Array.isArray(panes)) {
      return null;
    }
    const kept = normalizePanes(panes.filter(knownPane), hasPreview);
    if (kept.length === 0) {
      return null;
    }
    return {
      panes: kept,
      sizes: readSizes((parsed as { sizes?: unknown }).sizes),
    };
  } catch {
    // Private mode, a full quota, a lock: the wizard still has to open.
    return null;
  }
}

/** What a host may say about the opening layout. `EditorOptions` fits this. */
export interface LayoutChoice {
  readonly layout?: EditorLayout | undefined;
  readonly rememberLayout?: boolean | undefined;
  readonly previewOpen?: boolean | undefined;
}

/**
 * The layout to open with. A host wins, then the last visit, then the default.
 * One door, so nothing else has to know the order.
 */
export function startLayout(
  choice: LayoutChoice,
  hasPreview: boolean,
): EditorLayout {
  const remembered =
    choice.rememberLayout === false ? null : readStored(hasPreview);
  const chosen =
    choice.layout !== undefined
      ? {
          panes: normalizePanes(choice.layout.panes, hasPreview),
          sizes: choice.layout.sizes,
        }
      : (remembered ?? defaultLayout(hasPreview));
  const panes =
    chosen.panes.length === 0 ? defaultLayout(hasPreview).panes : chosen.panes;
  const kept =
    choice.previewOpen === false
      ? panes.filter((pane) => pane !== EditorPane.Preview)
      : panes;
  // A host that turns the preview off still gets a pane to look at.
  return { panes: kept.length === 0 ? panes : kept, sizes: chosen.sizes };
}

export function writeLayout(layout: EditorLayout): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ panes: layout.panes, sizes: layout.sizes }),
    );
  } catch {
    // Nothing saved is not an error here.
  }
}

/** Add or remove one pane, keeping the display order. */
export function togglePane(
  layout: EditorLayout,
  pane: EditorPane,
): EditorLayout {
  const on = layout.panes.includes(pane);
  const next = on
    ? layout.panes.filter((entry) => entry !== pane)
    : [...layout.panes, pane];
  // One pane is a page, not a layout. Keep the last one up.
  if (next.length === 0) {
    return layout;
  }
  return { ...layout, panes: normalizePanes(next, true) };
}

/**
 * New fractions for two neighbours after a drag. Their sum stays put, so the
 * panes further along do not jump when one divider moves.
 */
export function dragPair(
  sizes: Readonly<Partial<Record<EditorPane, number>>>,
  left: EditorPane,
  right: EditorPane,
  widthLeft: number,
  widthRight: number,
  delta: number,
): Partial<Record<EditorPane, number>> | null {
  const total = widthLeft + widthRight;
  if (total < MIN_PANE_WIDTH * 2) {
    return null;
  }
  const pair =
    (sizes[left] ?? DEFAULT_SIZES[left]) +
    (sizes[right] ?? DEFAULT_SIZES[right]);
  const wanted = clampNumber(
    widthLeft + delta,
    MIN_PANE_WIDTH,
    total - MIN_PANE_WIDTH,
  );
  const share = (pair * wanted) / total;
  return { [left]: share, [right]: pair - share };
}

/** The grid template for the panes that are up. */
export function columnTemplate(layout: EditorLayout): string {
  return layout.panes
    .map((pane) => {
      const size = layout.sizes[pane] ?? DEFAULT_SIZES[pane];
      return `minmax(0, ${size.toFixed(3)}fr)`;
    })
    .join(" ");
}
