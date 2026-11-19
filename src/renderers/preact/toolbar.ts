/** V2's `toolbar`: an empty or missing list means every default button. */

import type { Quiz } from "../../core/session/quiz";

export function showsAction(quiz: Quiz, id: string): boolean {
  const list = quiz.config.toolbar;
  return list === undefined || list.length === 0 || list.includes(id);
}
