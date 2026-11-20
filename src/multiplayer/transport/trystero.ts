/**
 * Trystero: P2P rooms over WebRTC. No server, no account.
 *
 * Optional peer dependency. It is loaded with a dynamic import, so a build
 * without Trystero still works and only the multiplayer bundle ever asks.
 */

import { parseEnvelope } from "../protocol";
import type { Envelope } from "../types";
import type { Room, RoomMessage, RoomTransport, Unsubscribe } from "./types";

export interface TrysteroOptions {
  /** Namespace for the room. Two quizzes with one appId still do not mix. */
  readonly appId: string;
  /** Optional relay URLs for a self-hosted signalling setup. */
  readonly relayUrls?: readonly string[];
}

interface TrysteroRoom {
  onPeerJoin(callback: (peerId: string) => void): void;
  onPeerLeave(callback: (peerId: string) => void): void;
  makeAction(name: string): unknown;
  leave(): void;
}

type JoinRoom = (config: unknown, roomId: string) => TrysteroRoom;
type SendAction = (data: unknown, to?: string | readonly string[]) => void;
type ReceiveAction = (callback: (data: unknown, from: string) => void) => void;

interface TrysteroModule {
  readonly joinRoom: JoinRoom;
  readonly selfId: string;
}

const ACTION_NAME = "pq-message";
const MODULE_NAME = "trystero";

/** A non-literal specifier, so a build without Trystero never resolves it. */
async function loadModule(name: string): Promise<unknown> {
  return await import(name);
}

function isJoinRoom(value: unknown): value is JoinRoom {
  return typeof value === "function";
}

function actionPair(value: unknown): [SendAction, ReceiveAction] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const send = value[0];
  const receive = value[1];
  if (typeof send !== "function" || typeof receive !== "function") {
    return null;
  }
  return [send as SendAction, receive as ReceiveAction];
}

function asModule(value: unknown): TrysteroModule | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const joinRoom = record["joinRoom"];
  const selfId = record["selfId"];
  if (!isJoinRoom(joinRoom) || typeof selfId !== "string") {
    return null;
  }
  return { joinRoom, selfId };
}

let registered: TrysteroModule | null = null;

/**
 * Hand Trystero over instead of letting this module import it.
 *
 * A one-file bundle cannot resolve a bare specifier at runtime, so its page
 * loads Trystero itself and calls this. Returns false when the object is not
 * Trystero, which is the only check that matters.
 */
export function registerTrysteroModule(value: unknown): boolean {
  const parsed = asModule(value);
  if (parsed === null) {
    return false;
  }
  registered = parsed;
  return true;
}

export async function loadTrystero(
  name: string = MODULE_NAME,
): Promise<TrysteroModule> {
  if (registered !== null) {
    return registered;
  }
  let module: unknown;
  try {
    module = await loadModule(name);
  } catch {
    throw new Error(
      "Trystero is not installed. Run `bun add trystero`, or use the BroadcastChannel transport.",
    );
  }
  const parsed = asModule(module);
  if (parsed === null) {
    throw new Error("Trystero loaded, but joinRoom or selfId is missing.");
  }
  return parsed;
}

function subscribe<T>(
  handlers: Set<(value: T) => void>,
  handler: (value: T) => void,
): Unsubscribe {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

class TrysteroRoomAdapter implements Room {
  readonly selfId: string;
  readonly #room: TrysteroRoom;
  readonly #send: SendAction;
  readonly #messages = new Set<(message: RoomMessage) => void>();
  readonly #joins = new Set<(peerId: string) => void>();
  readonly #leaves = new Set<(peerId: string) => void>();

  constructor(room: TrysteroRoom, selfId: string) {
    this.#room = room;
    this.selfId = selfId;
    const pair = actionPair(room.makeAction(ACTION_NAME));
    if (pair === null) {
      throw new Error("Trystero did not return a data action.");
    }
    const [send, receive] = pair;
    this.#send = send;
    receive((data, from) => {
      const envelope = parseEnvelope(data);
      if (envelope === null) {
        return;
      }
      this.#messages.forEach((handler) => handler({ envelope, from }));
    });
    room.onPeerJoin((peerId) => {
      this.#joins.forEach((handler) => handler(peerId));
    });
    room.onPeerLeave((peerId) => {
      this.#leaves.forEach((handler) => handler(peerId));
    });
  }

  send(envelope: Envelope, to?: string): void {
    if (to === undefined) {
      this.#send(envelope);
      return;
    }
    this.#send(envelope, [to]);
  }

  onMessage(handler: (message: RoomMessage) => void): Unsubscribe {
    return subscribe(this.#messages, handler);
  }

  onPeerJoin(handler: (peerId: string) => void): Unsubscribe {
    return subscribe(this.#joins, handler);
  }

  onPeerLeave(handler: (peerId: string) => void): Unsubscribe {
    return subscribe(this.#leaves, handler);
  }

  leave(): void {
    this.#room.leave();
  }
}

export async function createTrysteroTransport(
  options: TrysteroOptions,
): Promise<RoomTransport> {
  const module = await loadTrystero();
  const config: Record<string, unknown> = { appId: options.appId };
  if (options.relayUrls !== undefined) {
    config["relayUrls"] = options.relayUrls;
  }
  function connect(code: string): Room {
    return new TrysteroRoomAdapter(
      module.joinRoom(config, `pq-live-${code}`),
      module.selfId,
    );
  }
  return {
    async create(code) {
      return connect(code);
    },
    async join(code) {
      return connect(code);
    },
  };
}
