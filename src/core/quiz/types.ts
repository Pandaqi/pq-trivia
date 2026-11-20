/** Public quiz types. The API is a promise; these are its words. */

import {
  CONFIG_CODE_ONLY,
  CONFIG_HEADER_ROWS,
} from "../syntax/configAttributes";

/** Light, dark, high contrast, or whatever the system prefers. */
export enum ThemeMode {
  Auto = "auto",
  Light = "light",
  Dark = "dark",
  HighContrast = "high-contrast",
}

/** How the quiz fills its host page. */
export type LayoutMode = "viewport" | "inline";

/** Letters by default, because A B C beats 1 2 3 in a pub quiz. */
export enum AnswerLabels {
  Letters = "letters",
  Lowercase = "lowercase",
  Numbers = "numbers",
  Roman = "roman",
  None = "none",
}

export interface QuizRoundInfo {
  readonly id: string;
  readonly name: string;
  readonly secret: string | null;
}

import type { Diagnostic } from "../syntax/diagnostics";
import type { SessionState, PlayMode, Progress } from "../session/session";
import type { SessionStatus } from "../session/session";
import type { ScreenViewModel } from "../session/viewModel";
import type { Confidence, Response } from "../session/responses";
import type { GradeReport } from "../grading/report";
import type { ResponseIssue } from "../session/policies";
import type { GradingMode } from "../model/question";
import type {
  BuildOptions,
  ParsedQuiz,
  QuizMeta,
  QuizModel,
} from "../model/quiz";
import type { AttemptJournal, AttemptRecord } from "../session/attempts";
import type { ActionRegistry, ViewRegistry } from "../session/registry";
import type {
  CustomQuestionType,
  QuestionTypeRegistry,
} from "../grading/plugins";
import type { Emitter, Unsubscribe } from "../session/events";
import type {
  AnswerKey,
  EmbeddedOptions,
  EmbeddedQuizV3,
} from "../export/embedded";
import type { InteractivePolicy, RevealMode } from "../session/policies";
import type { ScoringPreset } from "../grading/points";
import type { Standing } from "../grading/teams";
import type { Lifeline } from "../grading/aids";

export type QuizEventMap = {
  ready: { readonly version: string; readonly total: number };
  "state:change": { readonly from: SessionStatus; readonly to: SessionStatus };
  "screen:change": { readonly screen: ScreenViewModel };
  "question:enter": { readonly index: number; readonly id: string };
  "response:change": { readonly id: string; readonly response: Response };
  "hint:reveal": { readonly id: string; readonly remaining: number };
  "timer:tick": {
    readonly id: string;
    readonly remainingMs: number;
    readonly totalMs: number;
  };
  "timer:expire": { readonly id: string };
  "grade:ready": { readonly report: GradeReport };
  "mode:change": { readonly mode: PlayMode };
  "language:change": { readonly language: string };
  diagnostic: { readonly diagnostic: Diagnostic };
  destroy: Record<string, never>;
};

export type LoadInput =
  | { readonly type: "text"; readonly text: string; readonly file?: string }
  | {
      readonly type: "files";
      readonly files: readonly {
        readonly name: string;
        readonly text: string;
      }[];
    }
  | { readonly type: "inline"; readonly data: unknown }
  | { readonly type: "encrypted"; readonly data: unknown }
  | { readonly type: "model"; readonly quiz: QuizModel };

/**
 * Text to AST. The default is synchronous. A Worker parser returns a promise
 * and only the `parse` half moves off the main thread.
 */
export type ParseHook = (
  text: string,
  options: BuildOptions,
) => ParsedQuiz | Promise<ParsedQuiz>;

export interface QuizSettingOption {
  readonly id: string;
  readonly label: string;
  readonly type: "button" | "toggle" | "text";
  readonly value?: string | boolean;
  readonly placeholder?: string;
  readonly onChange?: (quiz: QuizApi, value: string | boolean) => void;
}

export interface QuizConfig {
  readonly seed?: string;
  /** The language on screen now. `setLanguage` changes it. */
  readonly language?: string | null;
  /** V2's `languageDefault`: the root language and the one shown first. */
  readonly languageDefault?: string;
  /** V2's `languages`: a shortlist, or empty for whatever the files say. */
  readonly languages?: readonly string[];
  /** V2's `translations`: extra or replaced UI strings per language. */
  readonly translations?: Readonly<
    Record<string, Readonly<Record<string, string>>>
  >;
  /** V2's `syncPropertiesWithTranslations`. */
  readonly syncPropertiesWithTranslations?: boolean;
  /** V2's `include`: property/value pairs a question must match. */
  readonly include?: Readonly<Record<string, string | readonly string[]>>;
  /** V2's `exclude`: property/value pairs that remove a question. */
  readonly exclude?: Readonly<Record<string, string | readonly string[]>>;
  /** V2's `groupBy`: keep questions of one property value together. */
  readonly groupBy?: string;
  /** V2's `questionTypesAllowed`. */
  readonly questionTypesAllowed?: readonly string[];
  readonly minAnswers?: number;
  readonly maxAnswers?: number;
  /** V2's `excludeSections`: ignore `#` rounds and play one list. */
  readonly excludeSections?: boolean;
  /** V2's `filterSections`: round names to hide. */
  readonly filterSections?: readonly string[];
  readonly minScore?: number;
  readonly maxScore?: number;
  readonly hideScore?: boolean;
  readonly hideScoreOnAnswers?: boolean;
  readonly defaultAuthor?: string;
  readonly possibleAuthors?: readonly string[];
  readonly hideAuthor?: boolean;
  readonly defaultCategory?: string;
  readonly possibleCategories?: readonly string[];
  readonly hideCategory?: boolean;
  readonly showPropertiesWithoutDiversity?: boolean;
  readonly dateCreation?: number;
  readonly addMissingSectionScreens?: boolean;
  readonly hideSecretThemeMessage?: boolean;
  readonly keepSectionOrder?: boolean;
  readonly keepQuestionOrder?: boolean;
  readonly keepAnswerOrder?: boolean;
  readonly randomizeMedia?: boolean;
  readonly forbidInlineLists?: boolean;
  /** V2's `symbols`: swap the syntax characters. */
  readonly symbols?: Readonly<Record<string, string>>;
  readonly hideErrors?: boolean;
  readonly hideDefaultStyles?: boolean;
  readonly hideDefaultSettings?: boolean;
  readonly themeDisabled?: boolean;
  readonly enableSafety?: boolean;
  readonly enableMouse?: boolean;
  readonly disableKeys?: boolean;
  readonly disableUI?: boolean;
  readonly disableTouch?: boolean;
  readonly hotkeys?: Readonly<Record<string, string | readonly string[]>>;
  readonly hotkeysForbidden?: readonly string[];
  readonly toolbar?: readonly string[];
  /** A, B, C (default), 1, 2, 3, i, ii, iii, or nothing. */
  readonly answerLabels?: AnswerLabels;
  /** Small icons in the metadata strip: points, author, category, round. */
  readonly metadataIcons?: boolean;
  /** V2's line under the question: "This is an open question." On by default. */
  readonly questionTypeHints?: boolean;
  /**
   * `3. Who is superman?` instead of the bare question. On by default: players
   * writing answers need the number in front of them.
   */
  readonly questionNumbers?: boolean;
  /** `Steps` for every question that does not set its own list. */
  readonly defaultSteps?: readonly string[];
  /** Animation between steps. `fade` when nobody says. */
  readonly defaultStepTransition?: string;
  /** Let the home screen offer interactive play. */
  readonly allowInput?: boolean;
  /** V2's `settings`: controls the host adds to the start screen. */
  readonly settings?: readonly QuizSettingOption[];
  readonly hideTimerGlobal?: boolean;
  readonly hideTimerQuestion?: boolean;
  readonly allowTimerOnSections?: boolean;
  readonly timerStrategy?: "expire" | "skip" | "continue";
  readonly mediaAutoPlay?: boolean;
  readonly loadExternalMediaAsIframe?: boolean;
  readonly linkPrefixes?: readonly string[];
  readonly mediaFormats?: readonly string[];
  readonly filenamePattern?: string;
  readonly filenames?: readonly string[];
  readonly fileExtensions?: readonly string[];
  readonly subFolderQuestions?: string;
  readonly subFolderMedia?: string;
  readonly subFolderTheme?: string;
  readonly url?: string;
  readonly title?: string;
  readonly id?: string;
  /** Shown on the start screen when set. */
  readonly bannerImage?: string;
  readonly icon?: string;
  readonly shuffleQuestions?: boolean;
  readonly shuffleRounds?: boolean;
  readonly defaultScore?: number;
  /** No answer mode, no reveal, no backwards. For tests and classrooms. */
  readonly restricted?: boolean;
  readonly revealMode?: RevealMode;
  readonly policy?: InteractivePolicy;
  /** One grading mode for the whole quiz. Question settings win when unset. */
  readonly grading?: GradingMode;
  /** Negative marking, all-or-nothing, partial, or nothing special. */
  readonly scoringPreset?: ScoringPreset;
  /** With the negative preset: the slice of a question a wrong answer costs. */
  readonly negativeMarking?: number;
  /** Three in a row, and the points start climbing. Off by default. */
  readonly streaks?: boolean;
  /** Lifelines the player may use. Empty means none at all. */
  readonly lifelines?: readonly string[];
  /** Team names a host prefilled. Empty means solo play, the default. */
  readonly teams?: readonly string[];
  /** A limit for the whole quiz, in milliseconds. Zero or absent means count up. */
  readonly quizLimit?: number;
  /** One timer for every round that names no `RoundTimer`. Milliseconds. */
  readonly roundTimer?: number;
  /** Draw this many questions from every round that names no `Pool`. */
  readonly pool?: number;
  /** Spread a pool across the difficulty tags instead of taking the shuffle. */
  readonly balanceDifficulty?: boolean;
  /** Sandboxed `Script` widgets. Off by default, on purpose. */
  readonly allowScripts?: boolean;
  /** Timer beeps. Off by default; a host opts in. */
  readonly timerSound?: boolean;
  /** Seconds for questions without their own `Timer`. V2's `defaultTimer`. */
  readonly defaultTimer?: number;
  /** V2's `disableTextFormatting`: show every value exactly as written. */
  readonly disableTextFormatting?: boolean;
  /** V2's `addSecretThemeQuestions`: ask the secret at the end of its round. */
  readonly addSecretThemeQuestions?: boolean;
  /** Opens encrypted files. Without it, a locked file stays locked. */
  readonly answersKey?: AnswerKey;
  /** Colour fenced code. Off by default; plain monospace otherwise. */
  readonly codeHighlight?: boolean;
  /** A theme folder or stylesheet, like V2's `theme`. Page-relative. */
  readonly theme?: string;
  /** Show "Insert a theme folder" on the start screen. On unless turned off. */
  readonly themeUpload?: boolean;
  /**
   * Ruled space on written-answer questions in print. Off by default: most
   * quizzes want the question, not a worksheet.
   */
  readonly printAnswerLines?: boolean;
  /**
   * The question type line on printed questions. On by default: paper says what
   * the screen says. `questionTypeHints: false` hides it on both.
   */
  readonly printTypeHints?: boolean;
  /** Light, dark or high contrast. `auto` follows the system. */
  readonly themeMode?: ThemeMode;
  /**
   * `viewport` fills the window and scrolls inside the slide. `inline` lets
   * the quiz grow with the page, with a sensible minimum height.
   */
  readonly layoutMode?: LayoutMode;
  /**
   * A prepared embedded quiz, like V2's `builtin`. When set, the start screen
   * offers "Play the built-in questions" and loads it without a fetch.
   */
  readonly builtin?: unknown;
}

type HeaderConfigKey = (typeof CONFIG_HEADER_ROWS)[number]["key"];
type CodeOnlyConfigKey = (typeof CONFIG_CODE_ONLY)[number]["key"];
type UncoveredConfigKey = Exclude<
  keyof QuizConfig,
  HeaderConfigKey | CodeOnlyConfigKey
>;

/**
 * Compile-time audit. A new config key without a header row or a code-only
 * reason makes this constant fail to typecheck with the missing names.
 */
export const CONFIG_COVERAGE: UncoveredConfigKey extends never
  ? true
  : UncoveredConfigKey = true;

export type OrderOptions = Partial<
  Pick<QuizConfig, "seed" | "shuffleQuestions" | "shuffleRounds">
>;

export type NextReason = "blocked" | "end" | "invalid" | "required";
export interface NavResult {
  readonly ok: boolean;
  readonly reason?: NextReason;
  readonly issues?: readonly ResponseIssue[];
}

export interface QuizApi {
  readonly state: Readonly<SessionState>;
  readonly config: Readonly<QuizConfig>;
  load(input: LoadInput): Promise<void>;
  /**
   * Settles when the load in flight has finished. Already resolved when there
   * is none, so `await quiz.loading` is always safe.
   */
  readonly loading: Promise<void>;
  ready(): Promise<void>;
  /** True after loading an encrypted file that has no passphrase yet. */
  locked(): boolean;
  unlock(passphrase: string): Promise<boolean>;
  next(): NavResult;
  prev(): NavResult;
  /** Show the next staged part. False when the question is already whole. */
  nextStep(): boolean;
  nextRound(): NavResult;
  prevRound(): NavResult;
  goTo(index: number): NavResult;
  goToStart(): NavResult;
  goToEnd(): NavResult;
  /** Interactive play asks for answers in the page. */
  setInteractive(interactive: boolean): void;
  restart(options?: { readonly keepResponses?: boolean }): void;
  setOrder(order: OrderOptions): void;
  /** UI string for the current language. */
  t(key: string, params?: Readonly<Record<string, string | number>>): string;
  /** Languages actually loaded, sorted. Empty on a single-language quiz. */
  languages(): readonly string[];
  /** Every round in the loaded file, including ones the settings hide. */
  rounds(): readonly QuizRoundInfo[];
  /** The Trivia Syntax text this quiz was loaded from, when there was one. */
  sourceText(): string | null;
  /** Switch the whole quiz, answers and screen, to another loaded language. */
  setLanguage(language: string): boolean;
  /** Change one setting without rebuilding the quiz. Content options replan. */
  configure(partial: Partial<QuizConfig>): void;
  setMode(mode: PlayMode): boolean;
  setResponse(questionId: string, response: Response): void;
  /** Low, medium or high. Pass null to clear it. */
  setConfidence(questionId: string, level: Confidence | null): void;
  /** A deliberate blank. Clears the field and keeps it out of the wrong count. */
  setNoIdea(questionId: string, value: boolean): void;
  /** Put points on the line. Clamped to the question's maximum. */
  setWager(questionId: string, value: number): void;
  /** Count one play of this question's clip. Defaults to the current one. */
  noteMediaPlay(questionId?: string): void;
  /** Start team play with these names. Solo stays the default. */
  setTeams(names: readonly string[]): readonly string[];
  /** Hand the page to another team. Returns the index that is active now. */
  setActiveTeam(index: number): number;
  /** Back to solo play, keeping every team's answers. */
  stopTeams(): void;
  /** 50/50, extra time or ask the room. False when it is not allowed. */
  useLifeline(lifeline: Lifeline | string): boolean;
  /** Answers a 50/50 has taken away, for the current question or a named one. */
  eliminated(questionId?: string): readonly string[];
  /** One step back on the answer just given. */
  undo(): boolean;
  canUndo(): boolean;
  /** Host-only notes. Never in the view model, never on paper. */
  presenterNotes(questionId?: string): readonly string[];
  /** Milliseconds since the first question. Null before the quiz starts. */
  elapsed(now?: number): number | null;
  /** Milliseconds left on the whole-quiz limit. Null when there is no limit. */
  quizRemaining(now?: number): number | null;
  /** Milliseconds left in the current round. Null when the round has none. */
  roundRemaining(now?: number): number | null;
  /** Every team's score, highest first. Empty in solo play. */
  standings(): readonly Standing[];
  /** Manual reveal. False when restricted or already shown. */
  reveal(): boolean;
  /** Show the answer or put it away again. V2's `a`. */
  toggleReveal(): boolean;
  revealHint(): boolean;
  expireTimer(): void;
  timerRemaining(now?: number): number | null;
  currentScreen(): ScreenViewModel | null;
  progress(): Progress;
  diagnostics(): readonly Diagnostic[];
  grade(): GradeReport | null;
  showResults(): boolean;
  hideResults(): void;
  /** Clear the wrong and unanswered answers, then jump to the first one. */
  retryWrong(): number;
  savedAttempt(): AttemptRecord | null;
  resume(): boolean;
  clearAttempt(): Promise<void>;
  attachAttempts(journal: AttemptJournal | null): void;
  readonly meta: QuizMeta | null;
  fail(message: string, suggestion?: string): void;
  readonly views: ViewRegistry;
  readonly actions: ActionRegistry;
  /** Custom question types. Their inputs reach the player through this. */
  readonly questionTypes: QuestionTypeRegistry;
  /** Add a question type. Register before `load()` for its `Type =>` name. */
  registerQuestionType(type: CustomQuestionType): () => void;
  /** Saved attempts, newest first. Empty when there is no journal. */
  history(): Promise<readonly AttemptRecord[]>;
  subscribe(
    listener: (state: SessionState, screen: ScreenViewModel | null) => void,
  ): Unsubscribe;
  on<K extends keyof QuizEventMap>(
    event: K,
    handler: (payload: QuizEventMap[K]) => void,
  ): Unsubscribe;
  export: {
    embedded(options?: EmbeddedOptions): EmbeddedQuizV3;
    /** One row per question: a spreadsheet, a gradebook, a quick check. */
    csv(): string;
    /** Moodle's GIFT text. Old, plain and still everywhere. */
    gift(): string;
    /** The boring, compatible QTI 2.1 subset Canvas imports. */
    qti(): string;
    /** Results so far as CSV, or null before there is a plan. */
    grades(): string | null;
  };
  destroy(): void;
}

export interface CreateQuizOptions {
  readonly config?: QuizConfig;
  readonly version?: string;
  /** Swap the parser, for example for `createWorkerParser()`. */
  readonly parseText?: ParseHook;
}

export interface QuizInternals {
  readonly emitter: Emitter<QuizEventMap>;
}
