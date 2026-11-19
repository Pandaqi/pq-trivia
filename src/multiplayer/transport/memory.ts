/**
 * An in-memory network. Two clients in one test, no browser, no timing games.
 *
 * Delivery is a microtask, so a test can await one tick and see the result.
 */

import { makeId } from "../protocol";
import type { Envelope } from "../types";
import type { Room, RoomMessage, RoomTransport, Unsubscribe } from "./types";

export interface MemoryNetwork extends RoomTransport {
  /** Peers currently in a room, for assertions. */
  peersIn(code: string): number;
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

export function memoryNetwork(): MemoryNetwork {
  const rooms = new Map<string, Set<MemoryRoom>>();

  class MemoryRoom implements Room {
    readonly selfId = `peer-${makeId()}`;
    readonly #code: string;
    readonly #messages = new Set<(message: RoomMessage) => void>();
    readonly #joins = new Set<(peerId: string) => void>();
    readonly #leaves = new Set<(peerId: string) => void>();

    constructor(code: string) {
      this.#code = code;
      const peers = rooms.get(code) ?? new Set<MemoryRoom>();
      rooms.set(code, peers);
      peers.add(this);
      queueMicrotask(() => {
        for (const peer of peers) {
          if (peer === this) {
            continue;
          }
          peer.#joins.forEach((handler) => handler(this.selfId));
          this.#joins.forEach((handler) => handler(peer.selfId));
        }
      });
    }

    deliver(message: RoomMessage): void {
      this.#messages.forEach((handler) => handler(message));
    }

    send(envelope: Envelope, to?: string): void {
      for (const peer of rooms.get(this.#code) ?? []) {
        if (peer === this || (to !== undefined && peer.selfId !== to)) {
          continue;
        }
        const message: RoomMessage = { envelope, from: this.selfId };
        queueMicrotask(() => peer.deliver(message));
      }
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
      const peers = rooms.get(this.#code);
      if (peers === undefined || !peers.delete(this)) {
        return;
      }
      for (const peer of peers) {
        peer.#leaves.forEach((handler) => handler(this.selfId));
      }
      if (peers.size === 0) {
        rooms.delete(this.#code);
      }
    }
  }

  return {
    async create(code) {
      return new MemoryRoom(code);
    },
    async join(code) {
      return new MemoryRoom(code);
    },
    peersIn(code) {
      return rooms.get(code)?.size ?? 0;
    },
  };
}
