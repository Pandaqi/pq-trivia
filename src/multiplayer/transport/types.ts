/** One small contract. BroadcastChannel, Trystero and tests all fit it. */

import type { Envelope } from "../types";

export type Unsubscribe = () => void;

export interface RoomMessage {
  readonly envelope: Envelope;
  readonly from: string;
}

export interface Room {
  /** Our transport id. The host uses it to answer a specific peer. */
  readonly selfId: string;
  send(envelope: Envelope, to?: string): void;
  onMessage(handler: (message: RoomMessage) => void): Unsubscribe;
  onPeerJoin(handler: (peerId: string) => void): Unsubscribe;
  onPeerLeave(handler: (peerId: string) => void): Unsubscribe;
  leave(): void;
}

export interface RoomTransport {
  create(code: string): Promise<Room>;
  join(code: string): Promise<Room>;
}
