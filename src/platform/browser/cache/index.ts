/** One cache per page. Opening the same database twice is wasted work. */

import { browserTextCache, type TextCache } from "./textCache";

let shared: TextCache | null = null;

export function sharedTextCache(): TextCache {
  shared ??= browserTextCache();
  return shared;
}

export { fetchTextCached } from "./fetchCached";
export {
  browserTextCache,
  DEFAULT_CACHE_BYTES,
  memoryTextCache,
  type TextCache,
  type TextEntry,
} from "./textCache";
