/**
 * Screen view models.
 *
 * The renderer contract. A Preact app, a plain DOM app and a custom app all get
 * the same plain data. In question mode there are no correct answers in here.
 * That is what makes DOM inspection useless in classroom mode.
 */

import { parseInline, type InlineNode } from "../format/inline";
import { numberPrefix } from "../format/numbering";
import type { QuestionPart } from "../model/parts";
import { OrderMode } from "../model/question";
import { typeHintOf, type QuestionTypeHint } from "../model/typeHint";
import {
  buildAnswers,
  inlineValue,
  type AnswerViewModel,
} from "../values/answerView";
import { derivedRng, shuffleWith } from "../plan/shuffle";
import type { QuizMeta } from "../model/quiz";
import {
  QuestionType,
  questionMaxScore,
  type QuestionModel,
} from "../model/question";
import type { QuizPlan } from "../plan/plan";
import { bankAt, type GradeReport } from "../grading/report";
import { stakingLimit } from "../grading/wager";
import { PlayMode, type Progress, type SessionState } from "./session";
import { stepViewOf, type StepViewModel } from "../model/steps";
import { MediaKind, type MediaOptions } from "../values/media";
import { toMediaViewModel, type MediaViewModel } from "../values/mediaView";
import type { HotspotTarget, SliderRange } from "../values/point";
import type { Confidence } from "./responses";
import { fiftyFifty, Lifeline } from "../grading/aids";

export { toMediaViewModel };
export type { AnswerViewModel, MediaViewModel };
export { typeHintOf };
export type { QuestionTypeHint };

export enum ScreenKind {
  Start = "start",
  Question = "question",
  End = "end",
  Results = "results",
}

/**
 * What the question wants from the player, as numbers only.
 *
 * V2 printed a line like "This is an open question!". The renderer turns this
 * into words, so the core stays free of interface strings. Answer identities
 * never travel here: only how many there are.
 */
export interface QuestionViewModel {
  readonly kind: ScreenKind.Question;
  readonly id: string;
  readonly type: QuestionType;
  /** A registered plugin id when the type is `Custom`. Null otherwise. */
  readonly plugin: string | null;
  readonly title: readonly InlineNode[];
  readonly body: readonly InlineNode[];
  readonly answers: readonly AnswerViewModel[];
  readonly media: readonly MediaViewModel[];
  /** The image a hotspot or diagram sits on. Null for every other type. */
  readonly map: MediaViewModel | null;
  /** Choice with `Negate => true`: pick the false one. */
  readonly negated: boolean;
  /** Answer IDs a 50/50 took away. Empty when none were. */
  readonly eliminated: readonly string[];
  /** Autocomplete suggestions. Empty when the author gave none. */
  readonly suggestions: readonly string[];
  readonly slider: SliderRange | null;
  readonly unit: string | null;
  readonly tolerance: number | null;
  readonly rows: readonly string[];
  readonly scale: readonly string[];
  readonly multiple: boolean;
  readonly parts: readonly QuestionPart[];
  readonly buckets: readonly string[];
  readonly targets: readonly HotspotTarget[];
  readonly hitRadius: number;
  readonly wager: boolean;
  readonly wagerMax: number;
  readonly wagerValue: number | null;
  readonly confidence: Confidence | null;
  readonly noIdea: boolean;
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
  /** One part at a time. `total` of 1 means everything shows at once. */
  readonly steps: StepViewModel;
  readonly variant: string | null;
  readonly background: string | null;
  readonly index: number;
  /** Number among the questions that count, starting at one. Zero for a section. */
  readonly number: number;
  /** `3. ` in front of the title. Empty when numbering is off. */
  readonly numberPrefix: string;
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
  /** Null for sections, start and end screens, and script widgets. */
  readonly typeHint: QuestionTypeHint | null;
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

export interface QuestionScreenView {
  readonly index: number;
  /** Playable number. Defaults to `index + 1`. */
  readonly number?: number;
  /** The host turned `questionNumbers` off. On when unset. */
  readonly numbers?: boolean;
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
  /** Quiz-wide defaults, from `DefaultSteps` and `DefaultStepTransition`. */
  readonly defaultSteps?: readonly string[];
  readonly defaultStepTransition?: string | null;
  /** Whether the player may show sources. Hidden by default. */
  readonly showSources?: boolean;
}

export type { StepViewModel } from "../model/steps";

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
  const formatText = question.formatText;
  const answers = buildAnswers(
    question,
    showAnswers,
    mediaOptions,
    state.mediaPlays[question.id] ?? 0,
  );

  const typeHint = typeHintOf(question);
  const hintCount = state.hints[question.id] ?? 0;
  const hints = question.hints.slice(0, hintCount);
  const declaredMedia = question.media.map((item) =>
    toMediaViewModel(
      item,
      question.alt,
      mediaOptions,
      question.playLimit,
      state.mediaPlays[question.id] ?? 0,
    ),
  );
  const media =
    question.mediaOrder === OrderMode.Shuffle
      ? shuffleWith(declaredMedia, derivedRng(question.id, "media"))
      : declaredMedia;
  const isMapType =
    question.type === QuestionType.Hotspot ||
    question.type === QuestionType.Diagram;

  return {
    kind: ScreenKind.Question,
    id: question.id,
    type: question.type,
    plugin: question.plugin,
    title: inlineValue(
      { text: title, keepAsIs: titleValue?.keepAsIs ?? false },
      formatText,
    ),
    body: bodyValues.flatMap((value) => inlineValue(value, formatText)),
    answers,
    media,
    map: isMapType
      ? (declaredMedia.find((item) => item.kind === MediaKind.Image) ?? null)
      : null,
    negated: question.negate,
    eliminated: (state.lifelines[question.id] ?? []).includes(
      Lifeline.FiftyFifty,
    )
      ? fiftyFifty(question, state.plan?.seed ?? "")
      : [],
    suggestions: question.suggestions,
    slider: question.slider,
    unit: question.unit,
    tolerance: question.tolerance,
    rows: question.rows,
    scale: question.scale,
    multiple: question.multiple,
    parts: question.parts,
    buckets: question.buckets,
    targets: question.targets,
    hitRadius: question.hitRadius,
    wager: question.wager,
    // Stake up to the question's points, and only as far as the score reaches.
    wagerMax:
      state.plan === null
        ? 0
        : stakingLimit(
            questionMaxScore(question),
            bankAt(state.plan, state.responses, view.index, {
              wagers: state.wagers,
            }),
          ),
    wagerValue: state.wagers[question.id] ?? null,
    confidence: state.confidence[question.id] ?? null,
    noIdea: state.noIdea.includes(question.id),
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
    // The answer is up, or the host asked for everything: one step, all parts.
    steps: stepViewOf({
      steps: question.steps,
      transition: question.stepTransition,
      defaults: view,
      step: state.step,
      complete: showAnswers,
      hideSources: view.showSources === false,
    }),
    variant: question.variant,
    background: question.background,
    index,
    number: view.number ?? index + 1,
    numberPrefix: numberPrefix(
      // A round screen wears the round's number, not a question number.
      question.type === QuestionType.Section
        ? (view.roundNumber ?? null)
        : (view.number ?? index + 1),
      view.numbers !== false,
    ),
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
    typeHint,
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
