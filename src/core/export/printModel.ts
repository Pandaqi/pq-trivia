/**
 * The print model. Static pages, built from the plan, no renderer needed.
 *
 * The Preact print sheet uses this too, so screen and paper never disagree about
 * what a page contains.
 */

import { answerRefs } from "../model/answers";
import type { QuizMeta } from "../model/quiz";
import type { QuestionModel } from "../model/question";
import type { QuizPlan } from "../plan/plan";
import { visiblePlan } from "./visible";

export enum PrintPageKind {
  Cover = "cover",
  Round = "round",
  Question = "question",
}

export interface PrintAnswer {
  readonly text: string;
  readonly correct: boolean;
  readonly points: number | null;
}

export interface PrintQuestion {
  readonly index: number;
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly body: readonly string[];
  readonly answers: readonly PrintAnswer[];
  readonly media: readonly { readonly path: string; readonly kind: string }[];
  readonly hints: readonly string[];
  readonly explanation: string | null;
  readonly sources: readonly string[];
  readonly points: number;
  readonly roundName: string | null;
}

export interface PrintPage {
  readonly kind: PrintPageKind;
  readonly number: number;
  readonly title: string;
  readonly subtitle: string | null;
  readonly roundName: string | null;
  readonly questions: readonly PrintQuestion[];
}

export interface PrintDocument {
  readonly title: string;
  readonly subtitle: string | null;
  readonly seed: string;
  readonly maxScore: number;
  readonly pages: readonly PrintPage[];
}

export interface PrintModelOptions {
  readonly variant?: "questions" | "answers" | "form" | "grade";
  readonly perPage?: 1 | 2 | 4;
  readonly includeHints?: boolean;
  readonly includeExplanations?: boolean;
}

function printsOnPaper(question: QuestionModel): boolean {
  return !question.printFlags.some(
    (flag) => flag.trim().toLowerCase() === "hide",
  );
}

function questionFor(
  question: QuestionModel,
  index: number,
  plan: QuizPlan,
  options: PrintModelOptions,
): PrintQuestion {
  const showCorrect =
    options.variant === "answers" || options.variant === "grade";
  const refs = answerRefs(question);
  const correct = new Set(question.correct.map((value) => value.text));
  const parts = Math.max(question.correct.length, 1);
  const perAnswer = Math.round((question.score / parts) * 10) / 10;
  const [title = "", ...body] = question.text.map((value) => value.text);
  return {
    index,
    id: question.id,
    type: question.type,
    title,
    body,
    answers: refs.map((ref) => ({
      text: ref.value.text,
      correct: showCorrect ? correct.has(ref.value.text) : false,
      points: showCorrect && correct.has(ref.value.text) ? perAnswer : null,
    })),
    media: question.media.map((descriptor) => ({
      path: descriptor.path,
      kind: descriptor.kind,
    })),
    hints:
      options.includeHints === true
        ? question.hints.map((value) => value.text)
        : [],
    explanation:
      options.includeExplanations === true || showCorrect
        ? question.explanation
        : null,
    sources: question.sources,
    points: question.score,
    roundName:
      plan.rounds.find((round) => round.id === question.round)?.name ?? null,
  };
}

export function buildPrintModel(
  plan: QuizPlan,
  meta: QuizMeta,
  options: PrintModelOptions = {},
): PrintDocument {
  plan = visiblePlan(plan);
  const perPage = options.perPage ?? 1;
  const pages: PrintPage[] = [];
  let number = 0;

  const push = (
    kind: PrintPageKind,
    title: string,
    subtitle: string | null,
    roundName: string | null,
    questions: readonly PrintQuestion[],
  ): void => {
    number += 1;
    pages.push({
      kind,
      number,
      title,
      subtitle,
      roundName,
      questions,
    });
  };

  push(
    PrintPageKind.Cover,
    meta.title.length > 0 ? meta.title : "Untitled quiz",
    meta.description,
    null,
    [],
  );

  for (const round of plan.rounds) {
    push(PrintPageKind.Round, round.name, round.secret, round.name, []);
    const items = plan.questions.filter(
      (question) => question.round === round.id && printsOnPaper(question),
    );
    for (let index = 0; index < items.length; index += perPage) {
      const slice = items.slice(index, index + perPage);
      const printed = slice.map((question) =>
        questionFor(question, plan.questions.indexOf(question), plan, options),
      );
      const first = printed[0];
      push(
        PrintPageKind.Question,
        first?.title ?? round.name,
        null,
        round.name,
        printed,
      );
    }
  }

  return {
    title: meta.title.length > 0 ? meta.title : "Untitled quiz",
    subtitle: meta.description,
    seed: plan.seed,
    maxScore: plan.maxScore,
    pages,
  };
}
