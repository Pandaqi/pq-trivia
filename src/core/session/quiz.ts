/**
 * `createQuiz` without a renderer.
 *
 * Same reducer, same events, no DOM. A headless frontend, a CLI or a test all
 * use this. The Preact player is one consumer of it.
 */

import { buildQuiz, type QuizMeta, type QuizModel } from "../model/quiz";
import { planQuiz, type PlanOptions } from "../plan/plan";
import {
  fromEmbedded,
  toEmbedded,
  type EmbeddedOptions,
  type EmbeddedQuizV3,
} from "../export/embedded";
import {
  syntaxWarning,
  DiagnosticCodes,
  type Diagnostic,
} from "../syntax/diagnostics";
import { Emitter, type Unsubscribe } from "./events";
import { ActionRegistry, ViewRegistry } from "./registry";
import type { Response } from "./responses";
import {
  createSessionState,
  currentQuestion,
  PlayMode,
  progressOf,
  sessionReducer,
  SessionStatus,
  type Progress,
  type SessionState,
} from "./session";
import {
  endScreen,
  questionScreen,
  startScreen,
  type ScreenViewModel,
  ScreenKind,
} from "./viewModel";

export type QuizEventMap = {
  ready: { readonly version: string; readonly total: number };
  "state:change": { readonly from: SessionStatus; readonly to: SessionStatus };
  "screen:change": { readonly screen: ScreenViewModel };
  "question:enter": { readonly index: number; readonly id: string };
  "response:change": { readonly id: string; readonly response: Response };
  "mode:change": { readonly mode: PlayMode };
  diagnostic: { readonly diagnostic: Diagnostic };
  destroy: Record<string, never>;
};

export type LoadInput =
  | { readonly type: "text"; readonly text: string; readonly file?: string }
  | { readonly type: "inline"; readonly data: unknown }
  | { readonly type: "model"; readonly quiz: QuizModel };

export interface QuizConfig {
  readonly seed?: string;
  readonly language?: string | null;
  readonly shuffleQuestions?: boolean;
  readonly shuffleRounds?: boolean;
  readonly defaultScore?: number;
}

export type OrderOptions = Partial<
  Pick<QuizConfig, "seed" | "shuffleQuestions" | "shuffleRounds">
>;

export type NextReason = "blocked" | "end";
export interface NavResult {
  readonly ok: boolean;
  readonly reason?: NextReason;
}

export interface Quiz {
  readonly state: Readonly<SessionState>;
  readonly config: Readonly<QuizConfig>;
  load(input: LoadInput): Promise<void>;
  ready(): Promise<void>;
  next(): NavResult;
  prev(): NavResult;
  goTo(index: number): NavResult;
  restart(options?: { readonly keepResponses?: boolean }): void;
  setOrder(order: OrderOptions): void;
  setMode(mode: PlayMode): void;
  setResponse(questionId: string, response: Response): void;
  reveal(): void;
  revealHint(): void;
  currentScreen(): ScreenViewModel | null;
  progress(): Progress;
  diagnostics(): readonly Diagnostic[];
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

const EMPTY_PROGRESS: Progress = {
  index: 0,
  total: 0,
  answered: 0,
  percent: 0,
};

export function createQuiz(options: CreateQuizOptions = {}): Quiz {
  let config: QuizConfig = { ...options.config };
  const version = options.version ?? "3.0.0-dev.0";
  const diagnostics: Diagnostic[] = [];
  let quiz: QuizModel | null = null;
  let planOrder: PlanOptions = {};
  let state = createSessionState({ language: config.language ?? null });
  let destroyed = false;
  const views = new ViewRegistry();
  const actions = new ActionRegistry();

  const emitter = new Emitter<QuizEventMap>({
    onHandlerError: (error, event) => {
      const diagnostic = syntaxWarning(
        DiagnosticCodes.InvalidValue,
        `An event handler for "${event}" threw: ${error instanceof Error ? error.message : String(error)}`,
      );
      diagnostics.push(diagnostic);
      emitter.emit("diagnostic", { diagnostic });
    },
  });

  const listeners = new Set<
    (state: SessionState, screen: ScreenViewModel | null) => void
  >();

  function planOptions(): PlanOptions {
    return {
      ...(config.seed !== undefined ? { seed: config.seed } : {}),
      ...(config.shuffleQuestions !== undefined
        ? { shuffleQuestions: config.shuffleQuestions }
        : {}),
      ...(config.shuffleRounds !== undefined
        ? { shuffleRounds: config.shuffleRounds }
        : {}),
      ...planOrder,
    };
  }

  function screenOf(): ScreenViewModel | null {
    if (
      quiz === null ||
      (state.status === SessionStatus.Error && state.plan === null)
    ) {
      return null;
    }
    const progress = progressOf(state);
    if (state.plan === null || state.index < 0) {
      return startScreen(quiz.meta, state.plan, state.language);
    }
    if (state.index >= state.plan.questions.length) {
      return endScreen(quiz.meta, progress);
    }
    const question = currentQuestion(state);
    if (question === null) {
      return null;
    }
    const rounds = state.plan.rounds;
    const roundIndex = rounds.findIndex((round) => round.id === question.round);
    const round = roundIndex < 0 ? null : (rounds[roundIndex] ?? null);
    const previous =
      state.index > 0 ? state.plan.questions[state.index - 1] : null;
    return questionScreen(question, state, {
      index: state.index,
      total: state.plan.questions.length,
      progress,
      roundName: round?.name ?? null,
      roundSecret: round?.secret ?? null,
      roundNumber: roundIndex < 0 ? null : roundIndex + 1,
      isRoundStart: round !== null && previous?.round !== question.round,
    });
  }

  function notify(previousStatus: SessionStatus): void {
    const screen = screenOf();
    if (screen !== null) {
      emitter.emit("screen:change", { screen });
      if (screen.kind === ScreenKind.Question) {
        emitter.emit("question:enter", { index: screen.index, id: screen.id });
      }
    }
    if (previousStatus !== state.status) {
      emitter.emit("state:change", { from: previousStatus, to: state.status });
    }
    for (const listener of [...listeners]) {
      try {
        listener(state, screen);
      } catch {
        // A bad listener must not kill the quiz.
      }
    }
  }

  function apply(next: SessionState): void {
    const previousStatus = state.status;
    state = next;
    notify(previousStatus);
  }

  function finishLoad(model: QuizModel): void {
    quiz = model;
    diagnostics.push(...model.diagnostics);
    for (const diagnostic of model.diagnostics) {
      emitter.emit("diagnostic", { diagnostic });
    }

    // A quiz with nothing to play is an error, not a ready quiz. Loading an
    // empty file used to leave the player sitting on a start screen forever.
    if (model.questions.length === 0) {
      const diagnostic = syntaxWarning(
        DiagnosticCodes.MissingQuestion,
        "This quiz has no questions.",
        {
          suggestion:
            "Add a Question block, or check the file loaded correctly.",
        },
      );
      diagnostics.push(diagnostic);
      emitter.emit("diagnostic", { diagnostic });
      apply(sessionReducer(state, { type: "load/failure", diagnostics }, 0));
      return;
    }

    const plan = planQuiz(model, planOptions());
    diagnostics.push(...plan.diagnostics);
    apply(sessionReducer(state, { type: "load/success", plan }, 0));
  }

  return {
    get state() {
      return state;
    },
    get config() {
      return config;
    },
    views,
    actions,
    get meta() {
      return quiz === null ? null : quiz.meta;
    },

    async load(input: LoadInput): Promise<void> {
      if (destroyed) {
        return;
      }
      state = sessionReducer(state, { type: "load/start" });
      try {
        if (input.type === "text") {
          finishLoad(
            buildQuiz(input.text, {
              ...(input.file !== undefined ? { file: input.file } : {}),
              ...(config.defaultScore !== undefined
                ? { defaultScore: config.defaultScore }
                : {}),
              ...(config.language !== undefined && config.language !== null
                ? { defaultLanguage: config.language }
                : {}),
            }),
          );
          return;
        }
        if (input.type === "model") {
          finishLoad(input.quiz);
          return;
        }
        const imported = fromEmbedded(input.data);
        finishLoad(imported.quiz);
      } catch (error) {
        const diagnostic = syntaxWarning(
          DiagnosticCodes.InvalidLine,
          `Could not load the quiz: ${error instanceof Error ? error.message : String(error)}`,
        );
        diagnostics.push(diagnostic);
        apply(sessionReducer(state, { type: "load/failure", diagnostics }, 0));
      }
    },

    async ready(): Promise<void> {
      if (state.status !== SessionStatus.Error && state.plan !== null) {
        emitter.emit("ready", { version, total: state.plan.total });
      }
    },

    next(): NavResult {
      if (state.plan === null) {
        return { ok: false, reason: "blocked" };
      }
      if (state.index >= state.plan.questions.length) {
        return { ok: false, reason: "end" };
      }
      apply(sessionReducer(state, { type: "nav/next" }, Date.now()));
      return { ok: true };
    },

    prev(): NavResult {
      if (state.plan === null || state.index < 0) {
        return { ok: false, reason: "blocked" };
      }
      apply(sessionReducer(state, { type: "nav/prev" }, Date.now()));
      return { ok: true };
    },

    goTo(index: number): NavResult {
      if (state.plan === null) {
        return { ok: false, reason: "blocked" };
      }
      if (index < 0 || index > state.plan.questions.length) {
        return { ok: false, reason: "blocked" };
      }
      apply(sessionReducer(state, { type: "nav/goTo", index }, Date.now()));
      return { ok: true };
    },

    setOrder(order: OrderOptions): void {
      config = { ...config, ...order };
      planOrder = { ...planOrder, ...order };
      if (quiz === null || state.plan === null) {
        return;
      }
      const plan = planQuiz(quiz, planOptions());
      diagnostics.push(...plan.diagnostics);
      apply(sessionReducer(state, { type: "plan/replace", plan }, Date.now()));
    },

    restart(restartOptions: { readonly keepResponses?: boolean } = {}): void {
      apply(
        sessionReducer(
          state,
          {
            type: "nav/restart",
            ...(restartOptions.keepResponses === true
              ? { keepResponses: true }
              : {}),
          },
          Date.now(),
        ),
      );
    },

    setMode(mode: PlayMode): void {
      apply(sessionReducer(state, { type: "mode/set", mode }, Date.now()));
      emitter.emit("mode:change", { mode });
    },

    setResponse(questionId: string, response: Response): void {
      apply(
        sessionReducer(
          state,
          { type: "response/set", questionId, response },
          Date.now(),
        ),
      );
      emitter.emit("response:change", { id: questionId, response });
    },

    reveal(): void {
      const current = currentQuestion(state);
      if (current !== null) {
        apply(
          sessionReducer(
            state,
            { type: "reveal", questionId: current.id },
            Date.now(),
          ),
        );
      }
    },

    revealHint(): void {
      const current = currentQuestion(state);
      if (current !== null) {
        apply(
          sessionReducer(
            state,
            { type: "hint/reveal", questionId: current.id },
            Date.now(),
          ),
        );
      }
    },

    currentScreen(): ScreenViewModel | null {
      return screenOf();
    },

    progress(): Progress {
      return state.plan === null ? EMPTY_PROGRESS : progressOf(state);
    },

    /** A loader failed before a quiz existed. Say so, in the usual place. */
    fail(message: string, suggestion?: string): void {
      const diagnostic = syntaxWarning(DiagnosticCodes.InvalidLine, message, {
        ...(suggestion === undefined ? {} : { suggestion }),
      });
      diagnostics.push(diagnostic);
      emitter.emit("diagnostic", { diagnostic });
      apply(
        sessionReducer(
          state,
          { type: "load/failure", diagnostics },
          Date.now(),
        ),
      );
    },

    diagnostics(): readonly Diagnostic[] {
      return diagnostics;
    },

    subscribe(
      listener: (state: SessionState, screen: ScreenViewModel | null) => void,
    ): Unsubscribe {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    on(event, handler): Unsubscribe {
      return emitter.on(event, handler);
    },

    export: {
      embedded(embeddedOptions: EmbeddedOptions = {}): EmbeddedQuizV3 {
        if (quiz === null) {
          throw new Error("No quiz loaded.");
        }
        return toEmbedded(quiz, embeddedOptions);
      },
    },

    destroy(): void {
      destroyed = true;
      listeners.clear();
      views.clear();
      actions.clear();
      emitter.emit("destroy", {});
      emitter.clear();
      quiz = null;
      state = createSessionState();
    },
  };
}
