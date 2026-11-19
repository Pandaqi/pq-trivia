/** Public quiz types. The API is a promise; these are its words. */

import type { Diagnostic } from "../syntax/diagnostics";
import type { SessionState, PlayMode, Progress } from "../session/session";
import type { SessionStatus } from "../session/session";
import type { ScreenViewModel } from "../session/viewModel";
import type { Response } from "../session/responses";
import type { GradeReport } from "../grading/report";
import type { ResponseIssue } from "../session/policies";
import type { GradingMode } from "../model/question";
import type { QuizMeta, QuizModel } from "../model/quiz";
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
  diagnostic: { readonly diagnostic: Diagnostic };
  destroy: Record<string, never>;
};

export type LoadInput =
  | { readonly type: "text"; readonly text: string; readonly file?: string }
  | { readonly type: "inline"; readonly data: unknown }
  | { readonly type: "encrypted"; readonly data: unknown }
  | { readonly type: "model"; readonly quiz: QuizModel };

export interface QuizConfig {
  readonly seed?: string;
  readonly language?: string | null;
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
  /** Opens encrypted files. Without it, a locked file stays locked. */
  readonly answersKey?: AnswerKey;
  /** Colour fenced code. Off by default; plain monospace otherwise. */
  readonly codeHighlight?: boolean;
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
}

export interface QuizInternals {
  readonly emitter: Emitter<QuizEventMap>;
}
