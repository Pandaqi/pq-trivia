/**
 * Screen view models.
 *
 * The renderer contract. A Preact app, a plain DOM app and a custom app all get
 * the same plain data. In question mode there are no correct answers in here.
 * That is what makes DOM inspection useless in classroom mode.
 */

import { InlineKind, parseInline, type InlineNode } from "../format/inline";
import { answerRefs } from "../model/answers";
import { OrderMode } from "../model/question";
import { derivedRng, shuffleWith } from "../plan/shuffle";
import type { QuizMeta } from "../model/quiz";
import {
  QuestionType,
  ScoringMethod,
  type QuestionModel,
} from "../model/question";
import type { QuizPlan } from "../plan/plan";
import type { GradeReport } from "../grading/report";
import { PlayMode, type Progress, type SessionState } from "./session";
import {
  mediaForConfig,
  MediaKind,
  parseMediaDescriptor,
  type MediaDescriptor,
  type MediaOptions,
} from "../values/media";

export enum ScreenKind {
  Start = "start",
  Question = "question",
  End = "end",
  Results = "results",
}

export interface AnswerViewModel {
  readonly id: string;
  readonly text: string;
  /** The same inline tree the question uses. Links and emphasis work here too. */
  readonly nodes: readonly InlineNode[];
  /** Set when the answer is a media file, like V2 allowed. Otherwise null. */
  readonly media: MediaViewModel | null;
  /** Null in question mode. True or false once answers may be shown. */
  readonly correct: boolean | null;
  /** Points this answer earns, shown in a corner bubble. Null until revealed. */
  readonly points: number | null;
}

export interface MediaViewModel {
  readonly path: string;
  readonly kind: MediaKind;
  readonly alt: string | null;
  readonly credit: string | null;
  /** `name-640.jpg 640w, name-1280.jpg 1280w`, straight from the descriptor. */
  readonly srcset: string | null;
  readonly poster: string | null;
  /** A WebVTT file. Audio without captions excludes people. */
  readonly captions: string | null;
}

export function toMediaViewModel(
  descriptor: MediaDescriptor,
  fallbackAlt: string | null = null,
  media: MediaOptions = {},
): MediaViewModel {
  const resolved = mediaForConfig(descriptor, media);
  const options = resolved.options;
  return {
    path: resolved.path,
    kind: resolved.kind,
    alt: options["alt"] ?? fallbackAlt,
    credit: options["credit"] ?? null,
    srcset: options["srcset"] ?? null,
    poster: options["poster"] ?? null,
    captions: options["captions"] ?? null,
  };
}

export interface QuestionViewModel {
  readonly kind: ScreenKind.Question;
  readonly id: string;
  readonly type: QuestionType;
  readonly title: readonly InlineNode[];
  readonly body: readonly InlineNode[];
  readonly answers: readonly AnswerViewModel[];
  readonly media: readonly MediaViewModel[];
  readonly hints: {
    readonly revealed: readonly {
      readonly text: string;
      readonly nodes: readonly InlineNode[];
    }[];
    readonly total: number;
  };
  /** False when the question asked for its text to stay exactly as written. */
  readonly formatText: boolean;
  /** Parsed like every other value, so `**bold**` actually turns bold. */
  readonly explanation: readonly InlineNode[] | null;
  readonly comments: readonly InlineNode[];
  readonly sources: readonly string[];
  readonly timerMs: number | null;
  readonly layout: string | null;
  readonly classes: readonly string[];
  readonly colorScheme: string | null;
  readonly transition: string | null;
  readonly reveal: string | null;
  readonly variant: string | null;
  readonly background: string | null;
  readonly index: number;
  /** Number among the questions that count, starting at one. Zero for a section. */
  readonly number: number;
  readonly total: number;
  readonly round: string | null;
  readonly roundName: string | null;
  readonly roundSecret: string | null;
  readonly roundNumber: number | null;
  /** Where this question sits in its round, used for the colour shade. */
  readonly roundPosition: number;
  readonly roundQuestionCount: number;
  readonly roundPoints: number;
  readonly seed: string;
  readonly isRoundStart: boolean;
  readonly interactive: boolean;
  readonly authors: readonly string[];
  readonly categories: readonly string[];
  readonly authorsDiverse: boolean;
  readonly categoriesDiverse: boolean;
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
  readonly descriptionNodes: readonly InlineNode[];
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

/** `$` and `FormatText => false` both mean: show the characters, nothing else. */
function inlineValue(
  value: { readonly text: string; readonly keepAsIs: boolean },
  formatText: boolean,
): readonly InlineNode[] {
  return formatText && !value.keepAsIs
    ? parseInline(value.text).nodes
    : [{ kind: InlineKind.Text, text: value.text }];
}

export interface QuestionScreenView {
  readonly index: number;
  /** Playable number. Defaults to `index + 1`. */
  readonly number?: number;
  readonly total: number;
  readonly progress: Progress;
  readonly roundName: string | null;
  readonly roundSecret: string | null;
  readonly roundNumber: number | null;
  readonly roundPosition: number;
  readonly roundQuestionCount: number;
  readonly roundPoints: number;
  readonly seed: string;
  readonly isRoundStart: boolean;
  readonly authorsDiverse: boolean;
  readonly categoriesDiverse: boolean;
}

export function questionScreen(
  question: QuestionModel,
  state: SessionState,
  view: QuestionScreenView,
  mediaOptions: MediaOptions = {},
): QuestionViewModel {
  const { index, total, progress } = view;
  const titleValue = question.text[0];
  const title = titleValue?.text ?? "";
  const bodyValues = question.text.slice(1);
  const revealed = state.revealed.includes(question.id);
  const showAnswers = state.mode === PlayMode.Answers || revealed;
  const correctTexts = new Set(question.correct.map((value) => value.text));
  const formatText = question.formatText;

  const declared = answerRefs(question);
  const refs =
    question.answersOrder === OrderMode.Shuffle
      ? shuffleWith(declared, derivedRng(question.id, "answers"))
      : declared;
  const parts = Math.max(question.correct.length, 1);
  const pointsPerAnswer =
    question.scoring === ScoringMethod.Partial
      ? Math.round((question.score / parts) * 10) / 10
      : question.score;
  const answers: AnswerViewModel[] = refs.map((ref) => {
    const correct = showAnswers ? correctTexts.has(ref.value.text) : null;
    const descriptor = parseMediaDescriptor(ref.value.text);
    const resolved = mediaForConfig(descriptor, mediaOptions);
    const isMedia = !ref.value.keepAsIs && resolved.kind !== MediaKind.File;
    return {
      id: ref.id,
      text: ref.value.text,
      nodes: inlineValue(ref.value, formatText),
      media: isMedia
        ? toMediaViewModel(descriptor, question.alt, mediaOptions)
        : null,
      correct,
      points: correct === true ? pointsPerAnswer : null,
    };
  });

  const hintCount = state.hints[question.id] ?? 0;
  const hints = question.hints.slice(0, hintCount);
  const declaredMedia = question.media.map((item) =>
    toMediaViewModel(item, question.alt, mediaOptions),
  );
  const media =
    question.mediaOrder === OrderMode.Shuffle
      ? shuffleWith(declaredMedia, derivedRng(question.id, "media"))
      : declaredMedia;

  return {
    kind: ScreenKind.Question,
    id: question.id,
    type: question.type,
    title: inlineValue(
      { text: title, keepAsIs: titleValue?.keepAsIs ?? false },
      formatText,
    ),
    body: bodyValues.flatMap((value) => inlineValue(value, formatText)),
    answers,
    media,
    hints: {
      revealed: hints.map((value) => ({
        text: value.text,
        nodes: inlineValue(value, formatText),
      })),
      total: question.hints.length,
    },
    formatText,
    explanation:
      showAnswers && question.explanation !== null
        ? inlineValue(
            { text: question.explanation, keepAsIs: false },
            formatText,
          )
        : null,
    comments: screenComments(question),
    sources: question.sources,
    timerMs: question.timerMs,
    layout: question.layout,
    classes: question.classes,
    colorScheme: question.colorScheme,
    transition: question.transition,
    reveal: question.reveal,
    variant: question.variant,
    background: question.background,
    index,
    number: view.number ?? index + 1,
    total,
    round: question.round,
    roundName: view.roundName,
    roundSecret: view.isRoundStart ? view.roundSecret : null,
    roundNumber: view.roundNumber,
    roundPosition: view.roundPosition,
    roundQuestionCount: view.roundQuestionCount,
    roundPoints: view.roundPoints,
    seed: view.seed,
    isRoundStart: view.isRoundStart,
    interactive: state.interactive,
    authors: question.authors,
    categories: question.categories,
    authorsDiverse: view.authorsDiverse,
    categoriesDiverse: view.categoriesDiverse,
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

function screenMedia(
  question: QuestionModel | null,
  media: MediaOptions = {},
): MediaViewModel[] {
  if (question === null) {
    return [];
  }
  return question.media.map((item) =>
    toMediaViewModel(item, question.alt, media),
  );
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
  mediaOptions: MediaOptions = {},
): StartViewModel {
  return {
    kind: ScreenKind.Start,
    title: meta.title,
    description: meta.description,
    author: meta.authors.join(", "),
    questionCount: plan?.total ?? 0,
    roundCount: plan?.rounds.length ?? 0,
    seed: plan?.seed ?? "",
    language: language ?? meta.language,
    resume,
    descriptionNodes:
      meta.description === null ? [] : parseInline(meta.description).nodes,
    comments: screenComments(intro),
    media: screenMedia(intro, mediaOptions),
    buttons: screenButtons(intro),
    credits: screenCredits(intro),
  };
}

export function endScreen(
  meta: QuizMeta,
  progress: Progress,
  outro: QuestionModel | null = null,
  mediaOptions: MediaOptions = {},
): EndViewModel {
  return {
    kind: ScreenKind.End,
    title:
      outro !== null && outro.text.length > 0
        ? (outro.text[0]?.text ?? meta.title)
        : meta.title,
    questionCount: progress.total,
    answered: progress.answered,
    progress,
    comments: screenComments(outro),
    media: screenMedia(outro, mediaOptions),
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
    title: meta.title,
    report,
  };
}
