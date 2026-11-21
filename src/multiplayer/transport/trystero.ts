/**
 * Trystero: P2P rooms over WebRTC. No server, no account.
 *
 * Bundled with the multiplayer entry and the one-file build, so a host never
 * installs or imports it. `registerTrysteroModule` stays for a custom signal
 * stack, but the ordinary path needs nothing.
 */

import { joinRoom as bundledJoinRoom } from "trystero";
import { parseEnvelope } from "../protocol";
import type { Envelope } from "../types";
import type { Room, RoomMessage, RoomTransport, Unsubscribe } from "./types";

export interface TrysteroOptions {
  /** Namespace for the room. Two quizzes with one appId still do not mix. */
  readonly appId: string;
  /** Optional relay URLs for a self-hosted signalling setup. */
  readonly relayUrls?: readonly string[];
}

interface PeerContext {
  readonly peerId: string;
  readonly userId: string;
}

interface SelfInfo {
  readonly peerId: string;
  readonly userId: string;
}

interface MessageAction {
  send(data: unknown, options?: { readonly target?: string }): Promise<void>;
  onMessage(
    handler: (data: unknown, context: PeerContext) => unknown,
  ): Unsubscribe;
}

interface TrysteroRoom {
  getSelf(): Promise<SelfInfo>;
  onPeerJoin(handler: (context: PeerContext) => unknown): Unsubscribe;
  onPeerLeave(handler: (context: PeerContext) => unknown): Unsubscribe;
  makeAction(name: string): MessageAction;
  leave(): Promise<void>;
}

type JoinRoom = (config: unknown, roomId: string) => TrysteroRoom;

interface TrysteroModule {
  readonly joinRoom: JoinRoom;
}

const ACTION_NAME = "pq-message";

/** The copy that ships in the bundle. */
const BUNDLED: TrysteroModule = {
  joinRoom: bundledJoinRoom as unknown as JoinRoom,
};

let registered: TrysteroModule | null = null;

function isJoinRoom(value: unknown): value is JoinRoom {
  return typeof value === "function";
}

function asModule(value: unknown): TrysteroModule | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const joinRoom = record["joinRoom"];
  return isJoinRoom(joinRoom) ? { joinRoom } : null;
}

/**
 * Hand Trystero over instead of using the bundled copy.
 *
 * Returns false when the object is not Trystero, which is the only check that
 * matters.
 */
export function registerTrysteroModule(value: unknown): boolean {
  const parsed = asModule(value);
  if (parsed === null) {
    return false;
  }
  registered = parsed;
  return true;
}

export async function loadTrystero(): Promise<TrysteroModule> {
  return registered ?? BUNDLED;
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
  readonly #action: MessageAction;
  readonly #messages = new Set<(message: RoomMessage) => void>();
  readonly #joins = new Set<(peerId: string) => void>();
  readonly #leaves = new Set<(peerId: string) => void>();

  constructor(room: TrysteroRoom, selfId: string) {
    this.#room = room;
    this.selfId = selfId;
    this.#action = room.makeAction(ACTION_NAME);
    this.#action.onMessage((data, context) => {
      const envelope = parseEnvelope(data);
      if (envelope === null) {
        return;
      }
      this.#messages.forEach((handler) =>
        handler({ envelope, from: context.peerId }),
      );
    });
    room.onPeerJoin((context) => {
      this.#joins.forEach((handler) => handler(context.peerId));
    });
    room.onPeerLeave((context) => {
      this.#leaves.forEach((handler) => handler(context.peerId));
    });
  }

  send(envelope: Envelope, to?: string): void {
    const options = to === undefined ? undefined : { target: to };
    void this.#action.send(envelope, options).catch(() => undefined);
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
    void this.#room.leave();
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
  async function connect(code: string): Promise<Room> {
    const room = module.joinRoom(config, `pq-live-${code}`);
    const self = await room.getSelf();
    return new TrysteroRoomAdapter(room, self.peerId);
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
