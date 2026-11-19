/**
 * `createQuiz` without a renderer.
 *
 * Same reducer, same events, no DOM. A headless frontend, a CLI or a test all
 * use this. The Preact player is one consumer of it.
 */

import { parseQuiz, type QuizModel } from "../model/quiz";
import { planQuiz, type PlanOptions } from "../plan/plan";
import {
  toEmbedded,
  type EmbeddedOptions,
  type EmbeddedQuizV3,
} from "../export/embedded";
import {
  syntaxWarning,
  DiagnosticCodes,
  type Diagnostic,
} from "../syntax/diagnostics";
import { Emitter } from "../session/events";
import { ActionRegistry, ViewRegistry } from "../session/registry";
import {
  defaultResponse,
  isEmptyResponse,
  type Response,
} from "../session/responses";
import {
  createSessionState,
  currentQuestion,
  EMPTY_PROGRESS,
  PlayMode,
  progressOf,
  sessionReducer,
  SessionStatus,
  type Progress,
  type SessionState,
} from "../session/session";
import { ScreenKind, type ScreenViewModel } from "../session/viewModel";
import { screenFor } from "../session/screens";
import { gradeAttempt, type GradeReport } from "../grading/report";
import { InteractivePolicy, nextCheck, RevealMode } from "../session/policies";
import type { AttemptJournal, AttemptRecord } from "../session/attempts";
import { applyFlow } from "../session/flow";
import { createExtras } from "./extras";
import { createLoader } from "./load";
import { persistState } from "./persist";
import { languagesOf } from "./languages";
import {
  findLanguageKey,
  planOptionsFrom,
  possibleWarnings,
  prepareLanguageSwitch,
  prepareModels,
} from "./languageOptions";
import { translate } from "../../i18n/dictionary";
import type {
  CreateQuizOptions,
  NavResult,
  OrderOptions,
  Quiz,
  QuizConfig,
  QuizEventMap,
} from "./types";

export function createQuiz(options: CreateQuizOptions = {}): Quiz {
  let config: QuizConfig = { ...options.config };
  const version = options.version ?? "3.0.0-dev.0";
  const diagnostics: Diagnostic[] = [];
  let quiz: QuizModel | null = null;
  let models = new Map<string, QuizModel>();
  let planOrder: PlanOptions = {};
  let state = createSessionState({ language: config.language ?? null });
  let destroyed = false;
  let journal: AttemptJournal | null = null;
  let saved: AttemptRecord | null = null;
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

  const policy = (): InteractivePolicy =>
    config.policy ?? InteractivePolicy.Required;
  const revealMode = (): RevealMode => config.revealMode ?? RevealMode.Never;

  function planOptions(): PlanOptions {
    return planOptionsFrom(config, planOrder, t("secretQuestion"));
  }
  function screenOf(): ScreenViewModel | null {
    return screenFor(quiz, state, saved);
  }
  function buildReport(): GradeReport | null {
    if (state.plan === null) {
      return null;
    }
    return gradeAttempt(state.plan, state.responses, {
      title: quiz?.meta.title ?? "",
      startedAt: state.startedAt,
      endedAt: state.endedAt,
      ...(config.grading !== undefined ? { grading: config.grading } : {}),
    });
  }
  function persist(): void {
    persistState(journal, quiz, state, config);
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
    persist();
  }
  function autoReveal(): void {
    const question = currentQuestion(state);
    if (question === null || config.restricted === true) {
      return;
    }
    const response = state.responses[question.id] ?? defaultResponse(question);
    const mode = revealMode();
    const should =
      mode === RevealMode.Always ||
      (mode === RevealMode.AfterAnswer && !isEmptyResponse(response));
    if (should && !state.revealed.includes(question.id)) {
      apply(
        sessionReducer(
          state,
          { type: "reveal", questionId: question.id },
          Date.now(),
        ),
      );
    }
  }
  /** `When` conditions can unlock or hide a question. Replan, keep the index. */
  function replan(): void {
    if (quiz === null || state.plan === null) {
      return;
    }
    if (!state.plan.questions.some((question) => question.when !== null)) {
      return;
    }
    const flow = applyFlow(planQuiz(quiz, planOptions()), state.responses);
    for (const problem of flow.problems) {
      const diagnostic = syntaxWarning(
        DiagnosticCodes.InvalidValue,
        `Flow condition: ${problem}`,
      );
      diagnostics.push(diagnostic);
      emitter.emit("diagnostic", { diagnostic });
    }
    apply(
      sessionReducer(
        state,
        { type: "plan/replace", plan: flow.plan },
        Date.now(),
      ),
    );
  }
  async function refreshSaved(): Promise<void> {
    saved = journal === null ? null : await journal.resumable();
  }
  const loader = createLoader({
    destroyed: () => destroyed,
    config: () => config,
    parseText: options.parseText ?? parseQuiz,
    revealMode,
    state: () => state,
    setState: (next) => {
      state = next;
    },
    apply,
    notify,
    refreshSaved,
    finishLoad,
    diagnostics,
    emitReady: () =>
      emitter.emit("ready", { version, total: state.plan?.total ?? 0 }),
  });

  function findLanguage(code: string): string | null {
    return findLanguageKey(models, code);
  }
  function uiLanguage(): string {
    const current = state.language ?? "";
    return current.length > 0
      ? current
      : (config.languageDefault ?? "en");
  }
  function t(
    key: string,
    params: Readonly<Record<string, string | number>> = {},
  ): string {
    return translate(uiLanguage(), key, params, config.translations ?? {});
  }
  function finishLoad(loaded: Map<string, QuizModel>): void {
    const prepared = prepareModels(
      loaded,
      config,
      state.language ?? config.language ?? null,
    );
    if (prepared === null) {
      apply(sessionReducer(state, { type: "load/failure", diagnostics }, 0));
      return;
    }
    models = prepared.models;
    const language = prepared.language;
    quiz = models.get(language) ?? null;
    if (quiz === null) {
      apply(sessionReducer(state, { type: "load/failure", diagnostics }, 0));
      return;
    }
    state = { ...state, language: language.length > 0 ? language : null };
    for (const warning of possibleWarnings(quiz, config)) {
      diagnostics.push(warning);
      emitter.emit("diagnostic", { diagnostic: warning });
    }
    diagnostics.push(...quiz.diagnostics);
    for (const diagnostic of quiz.diagnostics) {
      emitter.emit("diagnostic", { diagnostic });
    }
    // A quiz with nothing to play is an error, not a ready quiz. Loading an
    // empty file used to leave the player sitting on a start screen forever.
    if (quiz.questions.length === 0) {
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
    const base = planQuiz(quiz, planOptions());
    diagnostics.push(...base.diagnostics);
    const flow = applyFlow(base, {});
    apply(sessionReducer(state, { type: "load/success", plan: flow.plan }, 0));
  }
  function setLanguage(code: string): boolean {
    const language = findLanguage(code);
    if (language === null || models.size === 0) {
      return false;
    }
    if (language === (state.language ?? "")) {
      return true;
    }
    const switched = prepareLanguageSwitch(
      models,
      state,
      language,
      planOptions(),
    );
    if (switched === null) {
      return false;
    }
    config = { ...config, language };
    quiz = switched.model;
    state = switched.state;
    notify(state.status);
    persist();
    emitter.emit("language:change", { language });
    return true;
  }

  function applyOrder(order: OrderOptions): void {
    config = { ...config, ...order };
    planOrder = { ...planOrder, ...order };
    if (quiz === null || state.plan === null) {
      return;
    }
    const flow = applyFlow(planQuiz(quiz, planOptions()), state.responses);
    apply(
      sessionReducer(
        state,
        { type: "plan/replace", plan: flow.plan },
        Date.now(),
      ),
    );
  }

  const extras = createExtras({
    state: () => state,
    plan: () => state.plan,
    apply: (next) => apply(next),
    notify: () => notify(state.status),
    report: buildReport,
    emitter,
    journal: () => journal,
    setJournal: (value) => {
      journal = value;
    },
    saved: () => saved,
    setSaved: (value) => {
      saved = value;
    },
    isRestricted: () => config.restricted === true,
    config: () => config,
    setConfig: (next) => {
      config = next;
    },
    applyOrder,
  });

  return {
    ...extras,
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
    load: loader.load,
    ready: loader.ready,
    locked: loader.locked,
    unlock: loader.unlock,
    next(): NavResult {
      if (state.plan === null) {
        return { ok: false, reason: "blocked" };
      }
      if (state.index >= state.plan.questions.length) {
        return { ok: false, reason: "end" };
      }
      const check = nextCheck(state, policy());
      if (check.issues.length > 0) {
        return { ok: false, reason: "invalid", issues: check.issues };
      }
      if (check.blocked) {
        return { ok: false, reason: "blocked" };
      }
      apply(sessionReducer(state, { type: "nav/next" }, Date.now()));
      autoReveal();
      return { ok: true };
    },
    prev(): NavResult {
      if (state.plan === null || state.index < 0) {
        return { ok: false, reason: "blocked" };
      }
      if (config.restricted === true) {
        return { ok: false, reason: "blocked" };
      }
      apply(sessionReducer(state, { type: "nav/prev" }, Date.now()));
      autoReveal();
      return { ok: true };
    },
    goTo(index: number): NavResult {
      if (state.plan === null) {
        return { ok: false, reason: "blocked" };
      }
      if (index < 0 || index > state.plan.questions.length) {
        return { ok: false, reason: "blocked" };
      }
      if (config.restricted === true && index < state.index) {
        return { ok: false, reason: "blocked" };
      }
      apply(sessionReducer(state, { type: "nav/goTo", index }, Date.now()));
      autoReveal();
      return { ok: true };
    },
    setOrder: applyOrder,
    t,
    languages(): readonly string[] {
      return languagesOf(models);
    },
    setLanguage,
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
    setMode(mode: PlayMode): boolean {
      if (config.restricted === true && mode === PlayMode.Answers) {
        return false;
      }
      apply(sessionReducer(state, { type: "mode/set", mode }, Date.now()));
      emitter.emit("mode:change", { mode });
      return true;
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
      replan();
      autoReveal();
    },
    currentScreen(): ScreenViewModel | null {
      return screenOf();
    },
    progress(): Progress {
      return state.plan === null ? EMPTY_PROGRESS : progressOf(state);
    },
    diagnostics(): readonly Diagnostic[] {
      return diagnostics;
    },
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
    subscribe(listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    on(event, handler): () => void {
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
    configure(partial: Partial<QuizConfig>): void {
      if (partial.language !== undefined && partial.language !== null) {
        const { language: _language, ...rest } = partial;
        setLanguage(partial.language);
        extras.configure(rest);
        return;
      }
      extras.configure(partial);
    },
    destroy(): void {
      destroyed = true;
      journal?.flush();
      listeners.clear();
      views.clear();
      actions.clear();
      emitter.emit("destroy", {});
      emitter.clear();
      quiz = null;
      journal = null;
      saved = null;
      state = createSessionState();
    },
  };
}
