/**
 * The number in front of a question or a round, as plain text.
 *
 * It exists for paper. A player writing an answer needs to know which line to
 * write it on, so the screen, the handout and the answer form agree.
 */

/** `3. ` for the third question. Empty when numbering is off. */
export function numberPrefix(number: number | null, enabled: boolean): string {
  if (!enabled || number === null || number < 1) {
    return "";
  }
  return `${number}. `;
}
