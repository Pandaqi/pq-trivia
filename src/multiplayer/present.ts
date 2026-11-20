/**
 * Turning a question into something a phone may see.
 *
 * One allowlist, in one place. If a field is not here, the player never gets it.
 */

import { countBlanks, parseInline } from "../core/format/inline";
import { answerRefs } from "../core/model/answers";
import { questionMaxScore, type QuestionModel } from "../core/model/question";
import type { QuizPlan } from "../core/plan/plan";
import { ResponseKind, type Response } from "../core/session/responses";
import type { LiveQuestion } from "./types";

export interface RoundInfo {
  readonly name: string | null;
  readonly questions: number;
  readonly points: number;
  readonly secret: string | null;
}

/** The round a plan position sits in, with the numbers a round card shows. */
export function roundInfoOf(
  plan: QuizPlan,
  position: number,
  hideSecret = false,
): RoundInfo {
  for (const round of plan.rounds) {
    if (position >= round.index && position < round.index + round.count) {
      return {
        name: round.name,
        questions: round.questionCount,
        points: round.points,
        // A quiz may keep its theme off the phones.
        secret: hideSecret ? null : round.secret,
      };
    }
  }
  return { name: null, questions: 0, points: 0, secret: null };
}

export function liveQuestion(
  question: QuestionModel,
  index: number,
  total: number,
  roundNameValue: string | null,
  deadline: number | null,
  round: RoundInfo = {
    name: roundNameValue,
    questions: 0,
    points: 0,
    secret: null,
  },
): LiveQuestion {
  const refs = answerRefs(question);
  return {
    id: question.id,
    index,
    total,
    type: question.type,
    title: question.text[0]?.text ?? "",
    body: question.text.slice(1).map((value) => value.text),
    answers: refs.map((ref) => ({ id: ref.id, text: ref.value.text })),
    media: question.media.map((descriptor) => ({
      path: descriptor.path,
      kind: descriptor.kind,
      alt: descriptor.options["alt"] ?? null,
      credit: descriptor.options["credit"] ?? null,
    })),
    points: question.score,
    timerMs: question.timerMs,
    deadline,
    blanks: question.text.reduce(
      (count, value) => count + countBlanks(parseInline(value.text).nodes),
      0,
    ),
    roundName: roundNameValue,
    roundQuestions: round.questions,
    roundPoints: round.points,
    roundSecret: round.secret,
    buzzer: question.buzzer,
    wager: question.wager,
    wagerMax: questionMaxScore(question),
  };
}

/** One line for the results table. No HTML, no surprises. */
export function describeResponse(
  question: QuestionModel,
  response: Response,
): string {
  const byId = new Map(
    answerRefs(question).map((ref) => [ref.id, ref.value.text]),
  );
  switch (response.kind) {
    case ResponseKind.Choice:
      return response.selected.map((id) => byId.get(id) ?? id).join(" | ");
    case ResponseKind.Range:
      return response.value === null ? "" : String(response.value);
    case ResponseKind.List:
      return response.items.join(" | ");
    case ResponseKind.Sort:
      return response.order.map((id) => byId.get(id) ?? id).join(" > ");
    case ResponseKind.Match:
      return response.pairs
        .map((pair) => `${pair[0]} ~ ${pair[1]}`)
        .join(" | ");
    case ResponseKind.Cloze:
      return response.blanks.join(" | ");
    case ResponseKind.Open:
      return response.text;
    case ResponseKind.Reasoned:
      return [
        ...response.selected.map((id) => byId.get(id) ?? id),
        response.reason,
      ]
        .filter((part) => part.length > 0)
        .join(" — ");
    case ResponseKind.Hotspot:
      return response.point === null
        ? ""
        : `${response.point.x},${response.point.y}`;
    case ResponseKind.Matrix:
      return response.rows
        .map((row) => row.map((id) => byId.get(id) ?? id).join(" + "))
        .join(" | ");
    case ResponseKind.Parts:
      return response.values.join(" | ");
    case ResponseKind.Buckets:
      return response.placements
        .map((pair) => `${pair[0]} → ${pair[1]}`)
        .join(" | ");
    default:
      return "";
  }
}

export function roundNameOf(plan: QuizPlan, index: number): string | null {
  for (const round of plan.rounds) {
    if (index >= round.index && index < round.index + round.count) {
      return round.name;
    }
  }
  return null;
}
