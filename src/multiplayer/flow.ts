/**
 * The order of play, in slots.
 *
 * A slot is a plan position. Round cards are part of the flow when the host
 * wants them: a phone that says "Round 2" is a better experience than one that
 * looks stuck.
 */

import { QuestionType } from "../core/model/question";
import type { QuizPlan } from "../core/plan/plan";

export interface Range {
  readonly start: number;
  readonly end: number;
}

/** Plan positions in play, in plan order. */
export function flowSlots(plan: QuizPlan, withSections: boolean): number[] {
  const slots: number[] = [];
  plan.questions.forEach((question, at) => {
    if (withSections || question.type !== QuestionType.Section) {
      slots.push(at);
    }
  });
  return slots;
}

/** Each round as a range of slot numbers. Rounds are already in plan order. */
export function roundRanges(plan: QuizPlan, slots: readonly number[]): Range[] {
  const ranges: Range[] = [];
  let cursor = 0;
  for (const round of plan.rounds) {
    let start = -1;
    let end = -1;
    while (cursor < slots.length) {
      const at = slots[cursor] ?? 0;
      if (at >= round.index + round.count) {
        break;
      }
      if (at >= round.index) {
        start = start < 0 ? cursor : start;
        end = cursor;
      }
      cursor += 1;
    }
    if (start >= 0) {
      ranges.push({ start, end });
    }
  }
  return ranges;
}

/** The round a slot belongs to. A slot outside every round is its own. */
export function rangeOf(ranges: readonly Range[], position: number): Range {
  for (const range of ranges) {
    if (position >= range.start && position <= range.end) {
      return range;
    }
  }
  return { start: position, end: position };
}
