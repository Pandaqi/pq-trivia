/**
 * Stable IDs.
 *
 * V2 numbered questions while loading files in parallel. Two machines gave
 * two answers. These IDs come from content, so they never move.
 */

export function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, "0").slice(-7);
}

export function stableId(prefix: string, parts: readonly string[]): string {
  return `${prefix}-${hashText(parts.join("\u0001"))}`;
}
