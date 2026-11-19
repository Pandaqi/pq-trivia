/**
 * Two tabs, one browser. No network, no server, no dependency.
 *
 * Useful for the host view and a test player on the same machine, and it is
 * the honest starting point before a real P2P adapter.
 */

import { makeId } from "../protocol";
import type { Envelope } from "../types";
import type { Room, RoomMessage, RoomTransport, Unsubscribe } from "./types";

interface Wire {
  readonly kind: "hello" | "bye" | "data";
  readonly peer: string;
  readonly envelope?: Envelope;
  readonly to?: string;
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

class BroadcastRoom implements Room {
  readonly selfId = makeId();
  readonly #channel: BroadcastChannel;
  readonly #peers = new Set<string>();
  readonly #messages = new Set<(message: RoomMessage) => void>();
  readonly #joins = new Set<(peerId: string) => void>();
  readonly #leaves = new Set<(peerId: string) => void>();

  constructor(code: string) {
    this.#channel = new BroadcastChannel(`pq-live-${code}`);
    this.#channel.onmessage = (event: MessageEvent<Wire>) => {
      this.#receive(event.data);
    };
    this.#post({ kind: "hello", peer: this.selfId });
  }

  #post(wire: Wire): void {
    this.#channel.postMessage(wire);
  }

  #receive(wire: Wire): void {
    if (wire.peer === this.selfId) {
      return;
    }
    if (wire.kind === "hello") {
      if (this.#peers.has(wire.peer)) {
        return;
      }
      this.#peers.add(wire.peer);
      // Answer once, so the newcomer learns about us too.
      this.#post({ kind: "hello", peer: this.selfId });
      this.#joins.forEach((handler) => handler(wire.peer));
      return;
    }
    if (wire.kind === "bye") {
      if (this.#peers.delete(wire.peer)) {
        this.#leaves.forEach((handler) => handler(wire.peer));
      }
      return;
    }
    if (wire.envelope === undefined) {
      return;
    }
    if (wire.to !== undefined && wire.to !== this.selfId) {
      return;
    }
    const message: RoomMessage = { envelope: wire.envelope, from: wire.peer };
    this.#messages.forEach((handler) => handler(message));
  }

  send(envelope: Envelope, to?: string): void {
    this.#post({
      kind: "data",
      peer: this.selfId,
      envelope,
      ...(to === undefined ? {} : { to }),
    });
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
    this.#post({ kind: "bye", peer: this.selfId });
    this.#channel.close();
  }
}

export function createBroadcastTransport(): RoomTransport {
  if (typeof BroadcastChannel === "undefined") {
    throw new Error(
      "This browser has no BroadcastChannel. Use Trystero, or run the host and player in one browser.",
    );
  }
  return {
    async create(code) {
      return new BroadcastRoom(code);
    },
    async join(code) {
      return new BroadcastRoom(code);
    },
  };
}
