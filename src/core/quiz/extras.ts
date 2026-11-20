/**
 * The parts of the quiz API that are not navigation: reveal, timers, grades,
 * results and saved attempts. Split out so the player factory stays readable.
 */

import type { GradeReport, ReportOptions } from "../grading/report";
import type {
  CustomQuestionType,
  QuestionTypeRegistry,
} from "../grading/plugins";
import type { Diagnostic } from "../syntax/diagnostics";
import { retryIds } from "../grading/report";
import {
  allowedLifelines,
  EXTRA_TIME_MS,
  Lifeline,
  parseLifeline,
} from "../grading/aids";
import { cleanTeamNames } from "../grading/teams";
import {
  eliminatedOf,
  elapsedOf,
  presenterNotesOf,
  quizRemainingOf,
  roundRemainingOf,
  standingsOf,
} from "./report";
import type { QuizPlan } from "../plan/plan";
import type { Emitter } from "../session/events";
import { defaultResponse, type Response } from "../session/responses";
import {
  currentQuestion,
  PlayMode,
  sessionReducer,
  type SessionState,
} from "../session/session";
import { parseSteps } from "../model/steps";
import { remainingOf } from "../session/timers";
import type { AttemptJournal, AttemptRecord } from "../session/attempts";
import type { OrderOptions, QuizApi, QuizConfig, QuizEventMap } from "./types";

export interface ExtrasContext {
  readonly state: () => SessionState;
  readonly plan: () => QuizPlan | null;
  readonly apply: (state: SessionState) => void;
  readonly notify: () => void;
  readonly report: () => GradeReport | null;
  readonly reportOptions: () => ReportOptions;
  readonly emitter: Emitter<QuizEventMap>;
  readonly journal: () => AttemptJournal | null;
  readonly setJournal: (journal: AttemptJournal | null) => void;
  readonly saved: () => AttemptRecord | null;
  readonly setSaved: (record: AttemptRecord | null) => void;
  readonly isRestricted: () => boolean;
  readonly config: () => QuizConfig;
  readonly setConfig: (partial: Partial<QuizConfig>) => void;
  readonly applyOrder: (order: OrderOptions) => void;
  /** Rebuild models and plan after a content setting changed. */
  readonly refresh?: () => void;
  readonly questionTypes: QuestionTypeRegistry;
  readonly reportPluginDiagnostics: (
    diagnostics: readonly Diagnostic[],
  ) => void;
}

type Extras = Pick<
  QuizApi,
  | "reveal"
  | "toggleReveal"
  | "nextStep"
  | "revealHint"
  | "expireTimer"
  | "timerRemaining"
  | "grade"
  | "showResults"
  | "hideResults"
  | "retryWrong"
  | "savedAttempt"
  | "resume"
  | "clearAttempt"
  | "attachAttempts"
  | "setTeams"
  | "setActiveTeam"
  | "stopTeams"
  | "useLifeline"
  | "eliminated"
  | "undo"
  | "canUndo"
  | "presenterNotes"
  | "elapsed"
  | "quizRemaining"
  | "roundRemaining"
  | "standings"
  | "configure"
  | "history"
  | "registerQuestionType"
>;

/** Settings that change which questions exist, or how they look on paper. */
const CONTENT_KEYS: ReadonlySet<string> = new Set([
  "include",
  "exclude",
  "groupBy",
  "questionTypesAllowed",
  "minAnswers",
  "maxAnswers",
  "minScore",
  "maxScore",
  "defaultScore",
  "defaultAuthor",
  "defaultCategory",
  "title",
  "filterSections",
  "excludeSections",
  "keepAnswerOrder",
  "randomizeMedia",
  "syncPropertiesWithTranslations",
  "addMissingSectionScreens",
  "allowTimerOnSections",
  "addSecretThemeQuestions",
  "disableTextFormatting",
]);

export function createExtras(ctx: ExtrasContext): Extras {
  const reveal = (): boolean => {
    const current = currentQuestion(ctx.state());
    if (current === null || ctx.isRestricted()) {
      return false;
    }
    if (ctx.state().revealed.includes(current.id)) {
      return false;
    }
    // `never` still allows a host to press the button. It means "not
    // automatically". Restricted mode is the one that says no.
    ctx.apply(
      sessionReducer(
        ctx.state(),
        { type: "reveal", questionId: current.id },
        Date.now(),
      ),
    );
    return true;
  };

  /**
   * One staged part more. False when there is nothing left to show, so the
   * keyboard can fall through to the next question.
   */
  const nextStep = (): boolean => {
    const current = currentQuestion(ctx.state());
    if (current === null) {
      return false;
    }
    if (
      ctx.state().mode === PlayMode.Answers ||
      ctx.state().revealed.includes(current.id)
    ) {
      return false;
    }
    const declared =
      current.steps.length > 0
        ? current.steps
        : (ctx.config().defaultSteps ?? []);
    const total = parseSteps(declared).length;
    if (total === 0 || ctx.state().step >= total - 1) {
      return false;
    }
    ctx.apply(sessionReducer(ctx.state(), { type: "step/next" }, Date.now()));
    return true;
  };

  /** V2's `a`: show the answer, press again and it goes away. */
  const toggleReveal = (): boolean => {
    const current = currentQuestion(ctx.state());
    if (current === null || ctx.isRestricted()) {
      return false;
    }
    if (ctx.state().revealed.includes(current.id)) {
      ctx.apply(
        sessionReducer(
          ctx.state(),
          { type: "hide", questionId: current.id },
          Date.now(),
        ),
      );
      return true;
    }
    return reveal();
  };

  const revealHint = (): boolean => {
    const current = currentQuestion(ctx.state());
    if (current === null) {
      return false;
    }
    const used = ctx.state().hints[current.id] ?? 0;
    if (used >= current.hints.length) {
      return false;
    }
    ctx.apply(
      sessionReducer(
        ctx.state(),
        { type: "hint/reveal", questionId: current.id },
        Date.now(),
      ),
    );
    ctx.emitter.emit("hint:reveal", {
      id: current.id,
      remaining: Math.max(0, current.hints.length - used - 1),
    });
    return true;
  };

  const expireTimer = (): void => {
    const current = currentQuestion(ctx.state());
    if (current === null) {
      return;
    }
    ctx.apply(
      sessionReducer(
        ctx.state(),
        { type: "timer/expire", questionId: current.id },
        Date.now(),
      ),
    );
    ctx.emitter.emit("timer:expire", { id: current.id });
  };

  const timerRemaining = (now: number = Date.now()): number | null => {
    const timer = ctx.state().timer;
    return timer === null ? null : remainingOf(timer, now);
  };

  const showResults = (): boolean => {
    const report = ctx.report();
    if (report === null) {
      return false;
    }
    ctx.apply(
      sessionReducer(ctx.state(), { type: "results/show", report }, Date.now()),
    );
    ctx.emitter.emit("grade:ready", { report });
    return true;
  };

  const hideResults = (): void => {
    ctx.apply(sessionReducer(ctx.state(), { type: "results/hide" }, 0));
  };

  const retryWrong = (): number => {
    const report = ctx.report();
    const plan = ctx.plan();
    if (report === null || plan === null) {
      return 0;
    }
    const ids = new Set(retryIds(report));
    if (ids.size === 0) {
      return 0;
    }
    const cleared: Record<string, Response> = {};
    for (const question of plan.questions) {
      if (ids.has(question.id)) {
        cleared[question.id] = defaultResponse(question);
      }
    }
    const first = plan.questions.findIndex((question) => ids.has(question.id));
    ctx.apply(
      sessionReducer(
        ctx.state(),
        {
          type: "attempt/restore",
          responses: cleared,
          index: first,
          startedAt: ctx.state().startedAt,
          endedAt: null,
        },
        Date.now(),
      ),
    );
    return ids.size;
  };

  const resume = (): boolean => {
    const record = ctx.saved();
    if (record === null || ctx.plan() === null) {
      return false;
    }
    ctx.setSaved(null);
    ctx.apply(
      sessionReducer(
        ctx.state(),
        {
          type: "attempt/restore",
          responses: record.responses,
          index: record.index,
          startedAt: record.startedAt,
          endedAt: record.endedAt,
          ...(record.confidence === undefined
            ? {}
            : { confidence: record.confidence }),
          ...(record.wagers === undefined ? {} : { wagers: record.wagers }),
          ...(record.noIdea === undefined ? {} : { noIdea: record.noIdea }),
          ...(record.mediaPlays === undefined
            ? {}
            : { mediaPlays: record.mediaPlays }),
        },
        Date.now(),
      ),
    );
    return true;
  };

  const clearAttempt = async (): Promise<void> => {
    ctx.setSaved(null);
    await ctx.journal()?.clear();
    ctx.notify();
  };

  const attachAttempts = (journal: AttemptJournal | null): void => {
    ctx.setSaved(null);
    ctx.setJournal(journal);
    if (journal === null) {
      ctx.notify();
      return;
    }
    void journal.resumable().then((record) => {
      ctx.setSaved(record);
      ctx.notify();
    });
  };

  const useLifeline = (raw: Lifeline | string): boolean => {
    const lifeline = parseLifeline(String(raw));
    const state = ctx.state();
    const question = currentQuestion(state);
    if (lifeline === null || question === null) {
      return false;
    }
    if (
      !allowedLifelines(
        ctx.config().lifelines ?? [],
        ctx.isRestricted(),
      ).includes(lifeline)
    ) {
      return false;
    }
    if ((state.lifelines[question.id] ?? []).includes(lifeline)) {
      return false;
    }
    // Extra time on a question without a timer is a donation, not a lifeline.
    if (lifeline === Lifeline.ExtraTime && state.timer === null) {
      return false;
    }
    ctx.apply(
      sessionReducer(
        state,
        { type: "lifeline/use", questionId: question.id, lifeline },
        Date.now(),
      ),
    );
    if (lifeline === Lifeline.ExtraTime) {
      ctx.apply(
        sessionReducer(
          ctx.state(),
          {
            type: "timer/extend",
            questionId: question.id,
            ms: EXTRA_TIME_MS,
          },
          Date.now(),
        ),
      );
    }
    return true;
  };

  const undo = (): boolean => {
    if (ctx.state().undo === null) {
      return false;
    }
    ctx.apply(sessionReducer(ctx.state(), { type: "undo" }, Date.now()));
    return true;
  };

  const registerQuestionType = (type: CustomQuestionType): (() => void) => {
    const remove = ctx.questionTypes.add(type);
    const found: Diagnostic[] = [];
    for (const question of ctx.state().plan?.questions ?? []) {
      if (question.plugin === type.id) {
        type.validate?.(question, found);
      }
    }
    if (found.length > 0) {
      ctx.reportPluginDiagnostics(found);
    }
    return () => {
      remove();
      ctx.notify();
    };
  };

  const configure = (partial: Partial<QuizConfig>): void => {
    const order: Record<string, unknown> = {};
    let orderChanged = false;
    let contentChanged = false;
    for (const [key, value] of Object.entries(partial)) {
      if (value === undefined) {
        continue;
      }
      if (
        key === "seed" ||
        key === "shuffleQuestions" ||
        key === "shuffleRounds"
      ) {
        order[key] = value;
        orderChanged = true;
      }
      if (CONTENT_KEYS.has(key)) {
        contentChanged = true;
      }
    }
    ctx.setConfig(partial);
    if (orderChanged) {
      ctx.applyOrder(order as OrderOptions);
    } else {
      // Filters and section lists change the plan. A colour mode does not, and
      // must not restart the question timer.
      if (contentChanged) {
        ctx.refresh?.();
      }
      ctx.notify();
    }
  };

  return {
    reveal,
    toggleReveal,
    nextStep,
    revealHint,
    expireTimer,
    timerRemaining,
    grade: () => ctx.report(),
    showResults,
    hideResults,
    retryWrong,
    savedAttempt: () => ctx.saved(),
    resume,
    clearAttempt,
    attachAttempts,
    setTeams: (names) => {
      const clean = cleanTeamNames(names);
      ctx.apply(
        sessionReducer(ctx.state(), { type: "team/start", names: clean }, 0),
      );
      return clean;
    },
    setActiveTeam: (index) => {
      ctx.apply(sessionReducer(ctx.state(), { type: "team/switch", index }, 0));
      return ctx.state().team;
    },
    stopTeams: () => {
      ctx.apply(sessionReducer(ctx.state(), { type: "team/stop" }, 0));
    },
    useLifeline,
    eliminated: (questionId) =>
      eliminatedOf(ctx.state(), ctx.plan(), questionId),
    undo,
    canUndo: () => ctx.state().undo !== null,
    presenterNotes: (questionId) =>
      presenterNotesOf(ctx.plan(), ctx.state(), questionId),
    elapsed: (now) => elapsedOf(ctx.state(), now),
    quizRemaining: (now) =>
      quizRemainingOf(ctx.state(), ctx.config().quizLimit, now),
    roundRemaining: (now) => roundRemainingOf(ctx.plan(), ctx.state(), now),
    standings: () => standingsOf(ctx.plan(), ctx.state(), ctx.reportOptions()),
    configure,
    registerQuestionType,
    history: async () => {
      const journal = ctx.journal();
      return journal === null ? [] : journal.history();
    },
  };
}
