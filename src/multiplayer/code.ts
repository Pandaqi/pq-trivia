/** Room codes: four characters, no O/0 and no I/1. A pub is noisy. */

export const ROOM_CODE_LENGTH = 4;

/** 32 characters. No O, 0, I or 1, because nobody can tell those apart. */
export const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const ROOM_PATTERN = /^[A-HJ-NP-Z2-9]{4}$/;

export function createRoomCode(random: () => number = Math.random): string {
  let code = "";
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const pick = Math.floor(random() * ROOM_ALPHABET.length);
    code += ROOM_ALPHABET.charAt(Math.min(pick, ROOM_ALPHABET.length - 1));
  }
  return code;
}

export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase();
}

export function isRoomCode(value: string): boolean {
  return ROOM_PATTERN.test(normalizeRoomCode(value));
}

/** `?pq-live=ABCD` is enough to join. Nothing else is in the URL. */
export function joinUrl(
  code: string,
  base?: string,
): string {
  const root =
    base ??
    (typeof location === "undefined"
      ? ""
      : `${location.origin}${location.pathname}`);
  const separator = root.includes("?") ? "&" : "?";
  return `${root}${separator}pq-live=${encodeURIComponent(normalizeRoomCode(code))}`;
}

export function codeFromUrl(search: string): string | null {
  const params = new URLSearchParams(search);
  const value = params.get("pq-live");
  if (value === null || !isRoomCode(value)) {
    return null;
  }
  return normalizeRoomCode(value);
}
