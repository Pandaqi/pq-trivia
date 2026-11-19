/** Public quiz types. The API is a promise; these are its words. */

import type { Diagnostic } from "../syntax/diagnostics";
import type { SessionState, PlayMode, Progress } from "../session/session";
import type { SessionStatus } from "../session/session";
import type { ScreenViewModel } from "../session/viewModel";
import type { Response } from "../session/responses";
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
import type { Emitter, Unsubscribe } from "../session/events";
import type {
  AnswerKey,
  EmbeddedOptions,
  EmbeddedQuizV3,
} from "../export/embedded";
import type { InteractivePolicy, RevealMode } from "../session/policies";

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
      readonly files: readonly { readonly name: string; readonly text: string }[];
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
  readonly onChange?: (quiz: Quiz, value: string | boolean) => void;
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
  readonly translations?: Readonly<Record<string, Readonly<Record<string, string>>>>;
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
  /** Show "Load theme folder" on the start screen. Off by default. */
  readonly themeUpload?: boolean;
}

export type OrderOptions = Partial<
  Pick<QuizConfig, "seed" | "shuffleQuestions" | "shuffleRounds">
>;

export type NextReason = "blocked" | "end" | "invalid" | "required";
export interface NavResult {
  readonly ok: boolean;
  readonly reason?: NextReason;
  readonly issues?: readonly ResponseIssue[];
}

export interface Quiz {
  readonly state: Readonly<SessionState>;
  readonly config: Readonly<QuizConfig>;
  load(input: LoadInput): Promise<void>;
  ready(): Promise<void>;
  /** True after loading an encrypted file that has no passphrase yet. */
  locked(): boolean;
  unlock(passphrase: string): Promise<boolean>;
  next(): NavResult;
  prev(): NavResult;
  goTo(index: number): NavResult;
  restart(options?: { readonly keepResponses?: boolean }): void;
  setOrder(order: OrderOptions): void;
  /** UI string for the current language. */
  t(key: string, params?: Readonly<Record<string, string | number>>): string;
  /** Languages actually loaded, sorted. Empty on a single-language quiz. */
  languages(): readonly string[];
  /** Switch the whole quiz, answers and screen, to another loaded language. */
  setLanguage(language: string): boolean;
  /** Change one setting without rebuilding the quiz. Content options replan. */
  configure(partial: Partial<QuizConfig>): void;
  setMode(mode: PlayMode): boolean;
  setResponse(questionId: string, response: Response): void;
  /** Manual reveal. False when restricted or already shown. */
  reveal(): boolean;
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
  subscribe(
    listener: (state: SessionState, screen: ScreenViewModel | null) => void,
  ): Unsubscribe;
  on<K extends keyof QuizEventMap>(
    event: K,
    handler: (payload: QuizEventMap[K]) => void,
  ): Unsubscribe;
  export: {
    embedded(options?: EmbeddedOptions): EmbeddedQuizV3;
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
