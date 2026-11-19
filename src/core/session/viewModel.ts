/**
 * Screen view models.
 *
 * The renderer contract. A Preact app, a plain DOM app and a custom app all get
 * the same plain data. In question mode there are no correct answers in here.
 * That is what makes DOM inspection useless in classroom mode.
 */

import { parseInline, type InlineNode } from "../format/inline";
import { answerRefs } from "../model/answers";
import type { QuizMeta } from "../model/quiz";
import {
  QuestionType,
  ScoringMethod,
  type QuestionModel,
} from "../model/question";
import type { QuizPlan } from "../plan/plan";
import type { GradeReport } from "../grading/report";
import { PlayMode, type Progress, type SessionState } from "./session";
import type { MediaKind } from "../values/media";

export enum ScreenKind {
  Start = "start",
  Question = "question",
  End = "end",
  Results = "results",
}

export interface AnswerViewModel {
  readonly id: string;
  readonly text: string;
  /** Null in question mode. True or false once answers may be shown. */
  readonly correct: boolean | null;
  /** Points this answer earns, shown in a corner bubble. Null until revealed. */
  readonly points: number | null;
}

export interface MediaViewModel {
  readonly path: string;
  readonly kind: MediaKind;
  readonly alt: string | null;
}

export interface QuestionViewModel {
  readonly kind: ScreenKind.Question;
  readonly id: string;
  readonly type: QuestionType;
  readonly heading: string;
  readonly title: readonly InlineNode[];
  readonly body: readonly InlineNode[];
  readonly answers: readonly AnswerViewModel[];
  readonly media: readonly MediaViewModel[];
  readonly hints: {
    readonly revealed: readonly string[];
    readonly total: number;
  };
  readonly explanation: string | null;
  readonly timerMs: number | null;
  readonly layout: string | null;
  readonly classes: readonly string[];
  readonly colorScheme: string | null;
  readonly transition: string | null;
  readonly background: string | null;
  readonly index: number;
  readonly total: number;
  readonly round: string | null;
  readonly roundName: string | null;
  readonly roundSecret: string | null;
  readonly roundNumber: number | null;
  readonly isRoundStart: boolean;
  readonly authors: readonly string[];
  readonly categories: readonly string[];
  readonly points: number;
  readonly language: string | null;
  readonly progress: Progress;
  readonly revealable: boolean;
  readonly revealed: boolean;
  readonly answered: boolean;
  readonly expired: boolean;
  /** Sandboxed widget. Only rendered when the host allows scripts. */
  readonly script: { readonly path: string; readonly height: string } | null;
}

export interface ResumeViewModel {
  readonly savedAt: number;
  readonly answered: number;
  readonly total: number;
}

export interface StartViewModel {
  readonly kind: ScreenKind.Start;
  readonly title: string;
  readonly description: string | null;
  readonly author: string;
  readonly questionCount: number;
  readonly roundCount: number;
  readonly seed: string;
  readonly language: string | null;
  readonly resume: ResumeViewModel | null;
  readonly comments: readonly InlineNode[];
  readonly media: readonly MediaViewModel[];
  readonly buttons: readonly string[];
  readonly credits: readonly string[];
}

export interface EndViewModel {
  readonly kind: ScreenKind.End;
  readonly title: string;
  readonly questionCount: number;
  readonly answered: number;
  readonly progress: Progress;
  readonly comments: readonly InlineNode[];
  readonly media: readonly MediaViewModel[];
  readonly buttons: readonly string[];
  readonly credits: readonly string[];
}

export interface ResultsViewModel {
  readonly kind: ScreenKind.Results;
  readonly title: string;
  readonly report: GradeReport;
}

export type ScreenViewModel =
  QuestionViewModel | StartViewModel | EndViewModel | ResultsViewModel;

export {
  ViewRegistry,
  ActionRegistry,
  type ToolbarAction,
  type ViewRenderer,
} from "./registry";

function textOf(question: QuestionModel): string[] {
  return question.text.map((value) => value.text);
}

export interface QuestionScreenView {
  readonly index: number;
  readonly total: number;
  readonly progress: Progress;
  readonly roundName: string | null;
  readonly roundSecret: string | null;
  readonly roundNumber: number | null;
  readonly isRoundStart: boolean;
}

export function questionScreen(
  question: QuestionModel,
  state: SessionState,
  view: QuestionScreenView,
): QuestionViewModel {
  const { index, total, progress } = view;
  const texts = textOf(question);
  const [title = "", ...bodyLines] = texts;
  const revealed = state.revealed.includes(question.id);
  const showAnswers = state.mode === PlayMode.Answers || revealed;
  const correctTexts = new Set(question.correct.map((value) => value.text));

  const refs = answerRefs(question);
  const parts = Math.max(question.correct.length, 1);
  const pointsPerAnswer =
    question.scoring === ScoringMethod.Partial
      ? Math.round((question.score / parts) * 10) / 10
      : question.score;
  const answers: AnswerViewModel[] = refs.map((ref) => {
    const correct = showAnswers ? correctTexts.has(ref.value.text) : null;
    return {
      id: ref.id,
      text: ref.value.text,
      correct,
      points: correct === true ? pointsPerAnswer : null,
    };
  });

  const hintCount = state.hints[question.id] ?? 0;
  const media: MediaViewModel[] = question.media.map((descriptor) => ({
    path: descriptor.path,
    kind: descriptor.kind,
    alt: descriptor.options["alt"] ?? null,
  }));

  return {
    kind: ScreenKind.Question,
    id: question.id,
    type: question.type,
    heading: `Question ${index + 1} of ${total}`,
    title: parseInline(title).nodes,
    body: bodyLines.flatMap((line) => parseInline(line).nodes),
    answers,
    media,
    hints: {
      revealed: question.hints.slice(0, hintCount).map((value) => value.text),
      total: question.hints.length,
    },
    explanation: showAnswers ? question.explanation : null,
    timerMs: question.timerMs,
    layout: question.layout,
    classes: question.classes,
    colorScheme: question.colorScheme,
    transition: question.transition,
    background: question.background,
    index,
    total,
    round: question.round,
    roundName: view.roundName,
    roundSecret: view.isRoundStart ? view.roundSecret : null,
    roundNumber: view.roundNumber,
    isRoundStart: view.isRoundStart,
    authors: question.authors,
    categories: question.categories,
    points: question.score,
    language: question.language,
    progress,
    revealable: !showAnswers,
    revealed,
    answered: state.responses[question.id] !== undefined,
    expired: state.expired.includes(question.id),
    script:
      question.script === null
        ? null
        : { path: question.script, height: question.height ?? "24em" },
  };
}

function screenMedia(question: QuestionModel | null): MediaViewModel[] {
  if (question === null) {
    return [];
  }
  return question.media.map((descriptor) => ({
    path: descriptor.path,
    kind: descriptor.kind,
    alt: descriptor.options["alt"] ?? null,
  }));
}

function screenComments(question: QuestionModel | null): InlineNode[] {
  if (question === null) {
    return [];
  }
  return question.comments.flatMap((value) => parseInline(value.text).nodes);
}

function screenButtons(question: QuestionModel | null): readonly string[] {
  return question?.buttons ?? [];
}

function screenCredits(question: QuestionModel | null): readonly string[] {
  return question?.credits ?? [];
}

export function startScreen(
  meta: QuizMeta,
  plan: QuizPlan | null,
  language: string | null,
  resume: ResumeViewModel | null = null,
  intro: QuestionModel | null = null,
): StartViewModel {
  return {
    kind: ScreenKind.Start,
    title: meta.title.length > 0 ? meta.title : "Untitled quiz",
    description: meta.description,
    author: meta.authors.join(", "),
    questionCount: plan?.total ?? 0,
    roundCount: plan?.rounds.length ?? 0,
    seed: plan?.seed ?? "",
    language: language ?? meta.language,
    resume,
    comments: screenComments(intro),
    media: screenMedia(intro),
    buttons: screenButtons(intro),
    credits: screenCredits(intro),
  };
}

export function endScreen(
  meta: QuizMeta,
  progress: Progress,
  outro: QuestionModel | null = null,
): EndViewModel {
  return {
    kind: ScreenKind.End,
    title:
      outro !== null && outro.text.length > 0
        ? (outro.text[0]?.text ?? meta.title)
        : meta.title.length > 0
          ? meta.title
          : "Untitled quiz",
    questionCount: progress.total,
    answered: progress.answered,
    progress,
    comments: screenComments(outro),
    media: screenMedia(outro),
    buttons: screenButtons(outro),
    credits: screenCredits(outro),
  };
}

export function resultsScreen(
  meta: QuizMeta,
  report: GradeReport,
): ResultsViewModel {
  return {
    kind: ScreenKind.Results,
    title: meta.title.length > 0 ? meta.title : "Untitled quiz",
    report,
  };
}
