/**
 * Protocol v1, the strict half.
 *
 * Everything that arrives from the network is untrusted. These functions turn
 * `unknown` into something typed, or into `null`.
 */

import {
  ResponseKind,
  type Response,
} from "../core/session/responses";
import {
  MAX_NAME_LENGTH,
  MessageType,
  PROTOCOL_VERSION,
  type Envelope,
} from "./types";

/** One message per player per quarter second. Faster is a script, not a finger. */
export const RATE_LIMIT_MS = 250;
export const MAX_RESPONSE_TEXT = 2000;
export const MAX_RESPONSE_ITEMS = 100;

const MESSAGE_TYPES: ReadonlySet<string> = new Set(
  Object.values(MessageType),
);

export function makeId(random: () => number = Math.random): string {
  return `${random().toString(36).slice(2, 10)}${random().toString(36).slice(2, 10)}`;
}

export function createEnvelope<T>(
  type: MessageType,
  payload: T,
  from: string,
  now: number = Date.now(),
): Envelope<T> {
  return {
    v: PROTOCOL_VERSION,
    type,
    id: makeId(),
    ts: now,
    from,
    payload,
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

export function parseEnvelope(value: unknown): Envelope | null {
  const entry = record(value);
  if (entry === null || entry["v"] !== PROTOCOL_VERSION) {
    return null;
  }
  const type = entry["type"];
  if (typeof type !== "string" || !MESSAGE_TYPES.has(type)) {
    return null;
  }
  const id = entry["id"];
  const ts = entry["ts"];
  const from = entry["from"];
  if (
    typeof id !== "string" ||
    typeof ts !== "number" ||
    typeof from !== "string" ||
    from.length === 0 ||
    !("payload" in entry)
  ) {
    return null;
  }
  return {
    v: PROTOCOL_VERSION,
    type: type as MessageType,
    id,
    ts,
    from,
    payload: entry["payload"],
  };
}

function stringList(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_RESPONSE_ITEMS &&
    value.every(
      (item) => typeof item === "string" && item.length <= MAX_RESPONSE_TEXT,
    )
  );
}

function pairList(value: unknown): value is readonly (readonly [string, string])[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_RESPONSE_ITEMS &&
    value.every(
      (item) =>
        Array.isArray(item) &&
        item.length === 2 &&
        item.every((part) => typeof part === "string"),
    )
  );
}

/** The one response shape the network may send. Custom widgets stay home. */
export function isResponse(value: unknown): value is Response {
  const entry = record(value);
  if (entry === null) {
    return false;
  }
  switch (entry["kind"]) {
    case ResponseKind.Open:
      return (
        typeof entry["text"] === "string" &&
        entry["text"].length <= MAX_RESPONSE_TEXT
      );
    case ResponseKind.Range:
      return (
        entry["value"] === null ||
        (typeof entry["value"] === "number" && Number.isFinite(entry["value"]))
      );
    case ResponseKind.Choice:
      return stringList(entry["selected"]);
    case ResponseKind.List:
      return stringList(entry["items"]);
    case ResponseKind.Sort:
      return stringList(entry["order"]);
    case ResponseKind.Cloze:
      return stringList(entry["blanks"]);
    case ResponseKind.Match:
      return pairList(entry["pairs"]);
    default:
      return false;
  }
}

export function cleanName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    return null;
  }
  return name;
}

export interface JoinRequest {
  readonly name: string;
  readonly token: string | null;
}

export function readJoin(payload: unknown): JoinRequest | null {
  const entry = record(payload);
  if (entry === null) {
    return null;
  }
  const name = cleanName(entry["name"]);
  if (name === null) {
    return null;
  }
  const token = entry["token"];
  return {
    name,
    token: typeof token === "string" && token.length > 0 ? token : null,
  };
}

export interface SubmitRequest {
  readonly questionId: string;
  readonly response: Response;
  readonly token: string | null;
}

export function readSubmit(payload: unknown): SubmitRequest | null {
  const entry = record(payload);
  if (entry === null) {
    return null;
  }
  const questionId = entry["questionId"];
  if (typeof questionId !== "string" || !isResponse(entry["response"])) {
    return null;
  }
  const token = entry["token"];
  return {
    questionId,
    response: entry["response"],
    token: typeof token === "string" && token.length > 0 ? token : null,
  };
}

export interface RateLimiter {
  allow(id: string, now?: number): boolean;
}

export function createRateLimiter(
  intervalMs: number = RATE_LIMIT_MS,
): RateLimiter {
  const last = new Map<string, number>();
  return {
    allow(id, now = Date.now()) {
      const previous = last.get(id);
      if (previous !== undefined && now - previous < intervalMs) {
        return false;
      }
      // A busy room must not grow this map forever.
      if (last.size > 2048) {
        last.clear();
      }
      last.set(id, now);
      return true;
    },
  };
}

/** 32 characters. Long enough that guessing is not a strategy. */
export function makeToken(random: () => number = Math.random): string {
  let token = "";
  while (token.length < 32) {
    token += random().toString(36).slice(2);
  }
  return token.slice(0, 32);
}
