/**
 * Fetch, then cache. Serve the cached copy first and revalidate behind it.
 *
 * Offline then works after one visit, and a changed file on the server still
 * arrives on the next load.
 */

import { fetchText } from "../fetchText";
import type { TextCache } from "./textCache";

function revalidate(url: string, text: string, etag: string | null, cache: TextCache): void {
  const headers: Record<string, string> = {};
  if (etag !== null) {
    headers["If-None-Match"] = etag;
  }
  void fetch(url, { headers })
    .then(async (response) => {
      if (response.status === 304) {
        await cache.set({ key: url, text, etag, storedAt: Date.now() });
        return;
      }
      if (!response.ok) {
        return;
      }
      await cache.set({
        key: url,
        text: await response.text(),
        etag: response.headers.get("etag"),
        storedAt: Date.now(),
      });
    })
    .catch(() => undefined);
}

export async function fetchTextCached(
  url: string,
  cache: TextCache,
): Promise<string> {
  const hit = await cache.get(url);
  if (hit !== null) {
    revalidate(url, hit.text, hit.etag, cache);
    return hit.text;
  }
  const text = await fetchText(url);
  await cache.set({ key: url, text, etag: null, storedAt: Date.now() });
  return text;
}
