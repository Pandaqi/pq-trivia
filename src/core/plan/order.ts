/**
 * Placement constraints. Authors keep control, even after a shuffle.
 *
 * `PlaceAt` is 1-based, because authors count from one. Constraints win over
 * the shuffle. Unknown targets become a warning, never a drop.
 */

import {
  DiagnosticCodes,
  syntaxWarning,
  type Diagnostic,
} from "../syntax/diagnostics";
import type { QuestionModel } from "../model/question";

type Placement = "before" | "after";

function moveTo(
  items: QuestionModel[],
  id: string,
  targetId: string,
  placement: Placement,
): boolean {
  const from = items.findIndex((item) => item.id === id);
  const target = items.findIndex((item) => item.id === targetId);
  if (from < 0 || target < 0 || from === target) {
    return false;
  }
  const [moved] = items.splice(from, 1);
  if (moved === undefined) {
    return false;
  }
  const targetAfterRemoval = items.findIndex((item) => item.id === targetId);
  const insertAt =
    placement === "before" ? targetAfterRemoval : targetAfterRemoval + 1;
  items.splice(Math.max(0, insertAt), 0, moved);
  return true;
}

export function applyPlacement(
  questions: readonly QuestionModel[],
  diagnostics: Diagnostic[],
): QuestionModel[] {
  const items = [...questions];
  const known = new Set(items.map((question) => question.id));

  const placed = [...items].sort(
    (a, b) =>
      (a.placeAt ?? Number.POSITIVE_INFINITY) -
      (b.placeAt ?? Number.POSITIVE_INFINITY),
  );
  for (const question of placed) {
    if (question.placeAt === null) {
      continue;
    }
    const from = items.findIndex((item) => item.id === question.id);
    if (from < 0) {
      continue;
    }
    const [moved] = items.splice(from, 1);
    if (moved === undefined) {
      continue;
    }
    const index = Math.min(
      items.length,
      Math.max(0, Math.floor(question.placeAt) - 1),
    );
    items.splice(index, 0, moved);
  }

  for (const question of [...items]) {
    for (const target of question.placeBefore) {
      if (!known.has(target)) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.UnknownPlacement,
            `PlaceBefore points at "${target}", which does not exist.`,
            {
              location: question.location,
            },
          ),
        );
        continue;
      }
      moveTo(items, question.id, target, "before");
    }
    for (const target of question.placeAfter) {
      if (!known.has(target)) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.UnknownPlacement,
            `PlaceAfter points at "${target}", which does not exist.`,
            {
              location: question.location,
            },
          ),
        );
        continue;
      }
      moveTo(items, question.id, target, "after");
    }
  }

  return items;
}
