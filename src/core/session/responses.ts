/**
 * Responses. Typed, per question ID, never an index.
 */

import { countBlanks, parseInline } from "../format/inline";
import { QuestionType, type QuestionModel } from "../model/question";

export enum ResponseKind {
  Open = "open",
  Range = "range",
  Choice = "choice",
  List = "list",
  Sort = "sort",
  Match = "match",
  Cloze = "cloze",
  Custom = "custom",
}

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
  | { readonly kind: ResponseKind.Custom; readonly value: unknown };

export type ResponseMap = Readonly<Record<string, Response>>;

export function defaultResponse(question: QuestionModel): Response {
  switch (question.type) {
    case QuestionType.Choice:
      return { kind: ResponseKind.Choice, selected: [] };
    case QuestionType.Range:
      return { kind: ResponseKind.Range, value: null };
    case QuestionType.List:
      return { kind: ResponseKind.List, items: [] };
    case QuestionType.Sort:
      // Empty means "the author order is showing". The first move fills it in,
      // so an untouched sort question counts as unanswered.
      return { kind: ResponseKind.Sort, order: [] };
    case QuestionType.Match:
      return { kind: ResponseKind.Match, pairs: [] };
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
