/**
 * Responses. Typed, per question ID, never an index.
 */

import { countBlanks, parseInline } from "../format/inline";
import { QuestionType, type QuestionModel } from "../model/question";
import type { Point } from "../values/point";

export enum ResponseKind {
  Open = "open",
  Range = "range",
  Choice = "choice",
  List = "list",
  Sort = "sort",
  Match = "match",
  Cloze = "cloze",
  /** Odd one out: a pick plus the reason it is odd. */
  Reasoned = "reasoned",
  Hotspot = "hotspot",
  Matrix = "matrix",
  Parts = "parts",
  Buckets = "buckets",
  Custom = "custom",
}

/** A guess at how sure the player is. Stored, never scored, for now. */
export enum Confidence {
  Low = "low",
  Medium = "medium",
  High = "high",
}

export const CONFIDENCE_LEVELS: readonly Confidence[] = [
  Confidence.Low,
  Confidence.Medium,
  Confidence.High,
];

export type Response =
  | { readonly kind: ResponseKind.Open; readonly text: string }
  | { readonly kind: ResponseKind.Range; readonly value: number | null }
  | { readonly kind: ResponseKind.Choice; readonly selected: readonly string[] }
  | { readonly kind: ResponseKind.List; readonly items: readonly string[] }
  | { readonly kind: ResponseKind.Sort; readonly order: readonly string[] }
  | {
      readonly kind: ResponseKind.Match;
      readonly pairs: readonly (readonly [string, string])[];
    }
  | { readonly kind: ResponseKind.Cloze; readonly blanks: readonly string[] }
  | {
      readonly kind: ResponseKind.Reasoned;
      readonly selected: readonly string[];
      readonly reason: string;
    }
  | { readonly kind: ResponseKind.Hotspot; readonly point: Point | null }
  | {
      readonly kind: ResponseKind.Matrix;
      readonly rows: readonly (readonly string[])[];
    }
  | { readonly kind: ResponseKind.Parts; readonly values: readonly string[] }
  | {
      readonly kind: ResponseKind.Buckets;
      readonly placements: readonly (readonly [string, string])[];
    }
  | { readonly kind: ResponseKind.Custom; readonly value: unknown };

export type ResponseMap = Readonly<Record<string, Response>>;

export function defaultResponse(question: QuestionModel): Response {
  switch (question.type) {
    case QuestionType.Choice:
      return { kind: ResponseKind.Choice, selected: [] };
    case QuestionType.Range:
    case QuestionType.Estimate:
      return { kind: ResponseKind.Range, value: null };
    case QuestionType.List:
      return { kind: ResponseKind.List, items: [] };
    case QuestionType.Sort:
    case QuestionType.Rank:
      // Empty means "the author order is showing". The first move fills it in,
      // so an untouched sort question counts as unanswered.
      return { kind: ResponseKind.Sort, order: [] };
    case QuestionType.Match:
    case QuestionType.Diagram:
      return { kind: ResponseKind.Match, pairs: [] };
    case QuestionType.OddOneOut:
      return { kind: ResponseKind.Reasoned, selected: [], reason: "" };
    case QuestionType.Hotspot:
      return { kind: ResponseKind.Hotspot, point: null };
    case QuestionType.Matrix:
      return { kind: ResponseKind.Matrix, rows: [] };
    case QuestionType.Parts:
      return {
        kind: ResponseKind.Parts,
        values: Array.from({ length: question.parts.length }, () => ""),
      };
    case QuestionType.Classification:
      return { kind: ResponseKind.Buckets, placements: [] };
    case QuestionType.Cloze: {
      const blanks = question.text.reduce(
        (total, value) => total + countBlanks(parseInline(value.text).nodes),
        0,
      );
      return {
        kind: ResponseKind.Cloze,
        blanks: Array.from({ length: blanks }, () => ""),
      };
    }
    case QuestionType.Custom:
      return { kind: ResponseKind.Custom, value: null };
    default:
      return { kind: ResponseKind.Open, text: "" };
  }
}

export function isEmptyResponse(response: Response): boolean {
  switch (response.kind) {
    case ResponseKind.Open:
      return response.text.trim().length === 0;
    case ResponseKind.Range:
      return response.value === null;
    case ResponseKind.Choice:
      return response.selected.length === 0;
    case ResponseKind.Sort:
      return response.order.length === 0;
    case ResponseKind.List:
      return response.items.every((item) => item.trim().length === 0);
    case ResponseKind.Match:
      return response.pairs.length === 0;
    case ResponseKind.Cloze:
      return response.blanks.every((blank) => blank.trim().length === 0);
    case ResponseKind.Reasoned:
      return (
        response.selected.length === 0 && response.reason.trim().length === 0
      );
    case ResponseKind.Hotspot:
      return response.point === null;
    case ResponseKind.Matrix:
      return response.rows.every((row) => row.length === 0);
    case ResponseKind.Parts:
      return response.values.every((value) => value.trim().length === 0);
    case ResponseKind.Buckets:
      return response.placements.length === 0;
    case ResponseKind.Custom:
      return response.value === null || response.value === undefined;
    default:
      return true;
  }
}

export function setResponse(
  map: ResponseMap,
  questionId: string,
  response: Response,
): ResponseMap {
  return { ...map, [questionId]: response };
}

/** Choice input as a set. Order does not matter, index does not exist. */
export function toggleChoice(response: Response, answerId: string): Response {
  if (response.kind !== ResponseKind.Choice) {
    return response;
  }
  const selected = response.selected.includes(answerId)
    ? response.selected.filter((id) => id !== answerId)
    : [...response.selected, answerId];
  return { kind: ResponseKind.Choice, selected };
}

export function setOpenText(response: Response, text: string): Response {
  return response.kind === ResponseKind.Open
    ? { kind: ResponseKind.Open, text }
    : response;
}

export function setRangeValue(
  response: Response,
  value: number | null,
): Response {
  return response.kind === ResponseKind.Range
    ? { kind: ResponseKind.Range, value }
    : response;
}

export function setListItems(
  response: Response,
  items: readonly string[],
): Response {
  return response.kind === ResponseKind.List
    ? { kind: ResponseKind.List, items }
    : response;
}

export function setSortOrder(
  response: Response,
  order: readonly string[],
): Response {
  return response.kind === ResponseKind.Sort
    ? { kind: ResponseKind.Sort, order }
    : response;
}

export function setMatchPairs(
  response: Response,
  pairs: readonly (readonly [string, string])[],
): Response {
  return response.kind === ResponseKind.Match
    ? { kind: ResponseKind.Match, pairs }
    : response;
}

export function setClozeBlanks(
  response: Response,
  blanks: readonly string[],
): Response {
  return response.kind === ResponseKind.Cloze
    ? { kind: ResponseKind.Cloze, blanks }
    : response;
}

export function setReasonedPick(
  response: Response,
  answerId: string,
): Response {
  return response.kind === ResponseKind.Reasoned
    ? {
        kind: ResponseKind.Reasoned,
        selected: [answerId],
        reason: response.reason,
      }
    : response;
}

export function setReasonedText(response: Response, reason: string): Response {
  return response.kind === ResponseKind.Reasoned
    ? { kind: ResponseKind.Reasoned, selected: response.selected, reason }
    : response;
}

export function setHotspotPoint(response: Response, point: Point): Response {
  return response.kind === ResponseKind.Hotspot
    ? { kind: ResponseKind.Hotspot, point }
    : response;
}

/** One row's selection. A radio row replaces, a checkbox row toggles. */
export function setMatrixRow(
  response: Response,
  index: number,
  selected: readonly string[],
): Response {
  if (response.kind !== ResponseKind.Matrix) {
    return response;
  }
  const rows = [...response.rows];
  while (rows.length <= index) {
    rows.push([]);
  }
  rows[index] = selected;
  return { kind: ResponseKind.Matrix, rows };
}

/** One cell: a tick removes, a radio row replaces, a checkbox row adds. */
function toggleCell(
  current: readonly string[],
  answerId: string,
  multiple: boolean,
): string[] {
  if (current.includes(answerId)) {
    return current.filter((id) => id !== answerId);
  }
  return multiple ? [...current, answerId] : [answerId];
}

export function toggleMatrixCell(
  response: Response,
  index: number,
  answerId: string,
  multiple: boolean,
): Response {
  if (response.kind !== ResponseKind.Matrix) {
    return response;
  }
  const current = response.rows[index] ?? [];
  return setMatrixRow(response, index, toggleCell(current, answerId, multiple));
}

export function setPartValue(
  response: Response,
  index: number,
  value: string,
): Response {
  if (response.kind !== ResponseKind.Parts) {
    return response;
  }
  const values = [...response.values];
  while (values.length <= index) {
    values.push("");
  }
  values[index] = value;
  return { kind: ResponseKind.Parts, values };
}

export function setBucketPlacements(
  response: Response,
  placements: readonly (readonly [string, string])[],
): Response {
  return response.kind === ResponseKind.Buckets
    ? { kind: ResponseKind.Buckets, placements }
    : response;
}
