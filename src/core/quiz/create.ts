/**
 * `createQuiz` without a renderer.
 *
 * Same reducer, same events, no DOM. A headless frontend, a CLI or a test all
 * use this. The Preact player is one consumer of it.
 */
import { parseQuiz, type QuizModel } from "../model/quiz";
import { planQuiz, type PlanOptions } from "../plan/plan";
import { createExports } from "../export/api";
import {
  syntaxWarning,
  DiagnosticCodes,
  type Diagnostic,
} from "../syntax/diagnostics";
import { Emitter } from "../session/events";
import { ActionRegistry, ViewRegistry } from "../session/registry";
import { pluginProblemsFor, QuestionTypeRegistry } from "../grading/plugins";
import { defaultResponse, isEmptyResponse } from "../session/responses";
import {
  createSessionState,
  currentQuestion,
  EMPTY_PROGRESS,
  progressOf,
  sessionReducer,
  SessionStatus,
  type Progress,
  type SessionState,
} from "../session/session";
import { ScreenKind, type ScreenViewModel } from "../session/viewModel";
import { screenFor } from "../session/screens";
import type { GradeReport } from "../grading/report";
import { RevealMode } from "../session/policies";
import type { AttemptJournal, AttemptRecord } from "../session/attempts";
import { applyFlow } from "../session/flow";
import { createExtras } from "./extras";
import { createNavigation } from "./navigation";
import { createLoader } from "./load";
import { persistState, reportFor, reportOptionsFrom } from "./report";
import { languagesOf } from "./languages";
import {
  findLanguageKey,
  planOptionsFrom,
  possibleWarnings,
  prepareLanguageSwitch,
  prepareModels,
  refreshPlan,
  translateFor,
} from "./languageOptions";
import type {
  CreateQuizOptions,
  LoadInput,
  OrderOptions,
  QuizApi,
  QuizConfig,
  QuizEventMap,
  QuizRoundInfo,
} from "./types";

export function createQuiz(options: CreateQuizOptions = {}): QuizApi {
  // Three layers: the file's header, the host's options, then live changes.
  // Later layers win, so code always overrules a `.trivia` file.
  const baseConfig: QuizConfig = { ...options.config };
  let fileConfig: QuizConfig = {};
  let liveConfig: QuizConfig = {};
  let config: QuizConfig = { ...baseConfig };
  const version = options.version ?? "3.0.0-dev.0";
  const diagnostics: Diagnostic[] = [];
  let quiz: QuizModel | null = null;
  let models = new Map<string, QuizModel>();
  /** The models as loaded, before filters. Refreshing uses these again. */
  let loadedModels = new Map<string, QuizModel>();
  let source: string | null = null;
  let planOrder: PlanOptions = {};
  let state = createSessionState({ language: config.language ?? null });
  let destroyed = false;
  let journal: AttemptJournal | null = null;
  let saved: AttemptRecord | null = null;
  let pending: Promise<void> = Promise.resolve();
  const views = new ViewRegistry();
  const actions = new ActionRegistry();
  const questionTypes = new QuestionTypeRegistry();

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

  const revealMode = (): RevealMode => config.revealMode ?? RevealMode.Never;

  function mergedConfig(): QuizConfig {
    return { ...fileConfig, ...baseConfig, ...liveConfig };
  }
  function planOptions(): PlanOptions {
    return planOptionsFrom(config, planOrder, t("secretQuestion"));
  }
  function screenOf(): ScreenViewModel | null {
    return screenFor(
      quiz,
      state,
      saved,
      config,
      config.questionNumbers !== false,
      config,
    );
  }
  function buildReport(): GradeReport | null {
    return reportFor(
      state.plan,
      state,
      quiz?.meta.title ?? "",
      config,
      questionTypes,
    );
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
  /**
   * A content setting changed: filters, scores, rounds. Rebuild from the raw
   * models, then replace the plan. Answers survive by question ID.
   */
  function refreshContent(): void {
    if (loadedModels.size === 0 || state.plan === null) {
      return;
    }
    const next = refreshPlan(
      loadedModels,
      config,
      state.language ?? config.language ?? null,
      planOptions(),
      state.responses,
    );
    if (next === null) {
      return;
    }
    models = next.models;
    quiz = next.model;
    state = {
      ...state,
      language: next.language.length > 0 ? next.language : null,
    };
    apply(
      sessionReducer(
        state,
        { type: "plan/replace", plan: next.plan },
        Date.now(),
      ),
    );
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
    setSource: (text) => {
      source = text;
    },
    apply,
    notify,
    refreshSaved,
    finishLoad,
    diagnostics,
    emitReady: () =>
      emitter.emit("ready", { version, total: state.plan?.total ?? 0 }),
    pluginTypes: () => questionTypes.ids(),
  });

  function t(
    key: string,
    params: Readonly<Record<string, string | number>> = {},
  ): string {
    return translateFor(state.language, config, key, params);
  }
  function finishLoad(loaded: Map<string, QuizModel>): void {
    const first = [...loaded.values()][0];
    fileConfig = (first?.meta.config ?? {}) as QuizConfig;
    config = mergedConfig();
    loadedModels = loaded;
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
    diagnostics.push(...pluginProblemsFor(questionTypes, quiz));
    // A quiz with nothing to play is an error, not a ready quiz. The message
    // came from `validateQuiz` above, so every path says "Quiz is empty."
    if (quiz.questions.length === 0) {
      apply(sessionReducer(state, { type: "load/failure", diagnostics }, 0));
      return;
    }
    const base = planQuiz(quiz, planOptions());
    diagnostics.push(...base.diagnostics);
    const flow = applyFlow(base, {});
    apply(sessionReducer(state, { type: "load/success", plan: flow.plan }, 0));
  }
  function setLanguage(code: string): boolean {
    const language = findLanguageKey(models, code);
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
    liveConfig = { ...liveConfig, language };
    config = mergedConfig();
    quiz = switched.model;
    state = switched.state;
    notify(state.status);
    persist();
    emitter.emit("language:change", { language });
    return true;
  }
  function applyOrder(order: OrderOptions): void {
    liveConfig = { ...liveConfig, ...order };
    config = mergedConfig();
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
  const navigation = createNavigation({
    state: () => state,
    config: () => config,
    apply: (next) => apply(next),
    emitter,
    autoReveal,
    replan,
  });
  const extras = createExtras({
    state: () => state,
    plan: () => state.plan,
    apply: (next) => apply(next),
    notify: () => notify(state.status),
    report: buildReport,
    reportOptions: () => reportOptionsFrom(state, config, questionTypes),
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
    setConfig: (partial) => {
      liveConfig = { ...liveConfig, ...partial };
      config = mergedConfig();
    },
    applyOrder,
    refresh: refreshContent,
    questionTypes,
    reportPluginDiagnostics: (found) => diagnostics.push(...found),
  });

  return {
    ...extras,
    ...navigation,
    get state() {
      return state;
    },
    get config() {
      return config;
    },
    views,
    actions,
    questionTypes,
    get meta() {
      return quiz === null ? null : quiz.meta;
    },
    load(input: LoadInput): Promise<void> {
      return (pending = loader.load(input));
    },
    get loading(): Promise<void> {
      return pending;
    },
    ready: loader.ready,
    locked: loader.locked,
    unlock: loader.unlock,
    setOrder: applyOrder,
    t,
    languages(): readonly string[] {
      return languagesOf(models);
    },
    rounds(): readonly QuizRoundInfo[] {
      const key =
        state.language === null
          ? ([...loadedModels.keys()][0] ?? "")
          : (findLanguageKey(loadedModels, state.language) ?? "");
      const model = loadedModels.get(key) ?? quiz;
      return model === null
        ? []
        : model.rounds.map((round) => ({
            id: round.id,
            name: round.name,
            secret: round.secret,
          }));
    },
    sourceText(): string | null {
      return source;
    },
    setLanguage,
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
    export: createExports({
      model: () => quiz,
      plan: () => state.plan,
      report: buildReport,
    }),
    configure(partial: Partial<QuizConfig>): void {
      if (partial.language !== undefined && partial.language !== null) {
        const { language: _language, ...rest } = partial;
        setLanguage(partial.language);
        if (Object.keys(rest).length > 0) {
          extras.configure(rest);
        }
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
      questionTypes.clear();
      emitter.emit("destroy", {});
      emitter.clear();
      quiz = null;
      models = new Map();
      loadedModels = new Map();
      source = null;
      journal = null;
      saved = null;
      state = createSessionState();
    },
  };
}
