/**
 * `pq-trivia/multiplayer`. Separate entry, separate bundle.
 *
 * The default player build imports none of this. Add it when a night needs
 * phones, not before.
 */

export * from "./types";
export * from "./code";
export {
  createEnvelope,
  parseEnvelope,
  isResponse,
  createRateLimiter,
  cleanName,
  makeToken,
  RATE_LIMIT_MS,
  type RateLimiter,
} from "./protocol";
export { createHost, type HostOptions, type HostRoom } from "./host";
export {
  createPlayer,
  type PlayerOptions,
  type PlayerRoom,
  type PlayerState,
} from "./player";
export { createBroadcastTransport } from "./transport/broadcast";
export {
  createTrysteroTransport,
  loadTrystero,
  type TrysteroOptions,
} from "./transport/trystero";
export { memoryNetwork, type MemoryNetwork } from "./transport/memory";
export type {
  Room,
  RoomMessage,
  RoomTransport,
  Unsubscribe,
} from "./transport/types";
export {
  mountLive,
  type MountLiveOptions,
  type MountedLive,
} from "./ui/mountLive";
export { HostView } from "./ui/HostView";
export { PlayerView } from "./ui/PlayerView";
export { NameForm } from "./ui/parts";
