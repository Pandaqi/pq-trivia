/** Pure helpers for `create.ts`: plan options, language defaults, switching. */

import { createRound } from "../model/round";
import type { QuizModel } from "../model/quiz";
import { OrderMode, type QuestionModel } from "../model/question";
import { DiagnosticCodes, syntaxWarning } from "../syntax/diagnostics";
import type { Diagnostic } from "../syntax/diagnostics";
import type { PlanOptions } from "../plan/plan";
import type { Response } from "../session/responses";
import type { SessionState } from "../session/session";
import type { QuizPlan } from "../plan/plan";
import { planQuiz } from "../plan/plan";
import { applyFlow } from "../session/flow";
import { syncModels } from "./languages";
import type { QuizConfig } from "./types";

export function findLanguageKey(
  models: ReadonlyMap<string, QuizModel>,
  code: string,
): string | null {
  const wanted = code.trim().toUpperCase();
  for (const key of models.keys()) {
    if (key.toUpperCase() === wanted) {
      return key;
    }
  }
  return null;
}

function valuesOf(question: QuestionModel, key: string): string[] {
  const name = key.trim().toLowerCase();
  if (name === "category" || name === "categories") return [...question.categories];
  if (name === "author" || name === "authors") return [...question.authors];
  if (name === "language") return question.language === null ? [] : [question.language];
  if (name === "type") return [question.type];
  if (name === "round" || name === "section") {
    return question.round === null ? [] : [question.round];
  }
  if (name === "variant") return question.variant === null ? [] : [question.variant];
  if (name === "id") return [question.id];
  if (name === "score") return [String(question.score)];
  return [...(question.extra[name] ?? [])];
}

function shapeQuestion(question: QuestionModel, config: QuizConfig): QuestionModel {
  const score =
    config.minScore === undefined && config.maxScore === undefined
      ? question.score
      : Math.min(
          config.maxScore ?? Number.POSITIVE_INFINITY,
          Math.max(config.minScore ?? Number.NEGATIVE_INFINITY, question.score),
        );
  return {
    ...question,
    score,
    answersOrder:
      config.keepAnswerOrder === true ? OrderMode.Keep : question.answersOrder,
    mediaOrder:
      config.randomizeMedia === true ? OrderMode.Shuffle : question.mediaOrder,
  };
}

function keeps(question: QuestionModel, config: QuizConfig): boolean {
  const wanted = (value: string | readonly string[]): string[] =>
    (typeof value === "string" ? [value] : [...value]).map((entry) =>
      entry.trim().toLowerCase(),
    );
  for (const [key, value] of Object.entries(config.include ?? {})) {
    const list = wanted(value);
    if (list.length === 0) continue;
    const own = valuesOf(question, key).map((entry) => entry.toLowerCase());
    if (!own.some((entry) => list.includes(entry))) return false;
  }
  for (const [key, value] of Object.entries(config.exclude ?? {})) {
    const list = wanted(value);
    const own = valuesOf(question, key).map((entry) => entry.toLowerCase());
    if (own.some((entry) => list.includes(entry))) return false;
  }
  const types = config.questionTypesAllowed ?? [];
  if (types.length > 0 && !types.map((type) => type.toLowerCase()).includes(question.type)) {
    return false;
  }
  if (config.minAnswers !== undefined && question.answers.length < config.minAnswers) {
    return false;
  }
  if (config.maxAnswers !== undefined && question.answers.length > config.maxAnswers) {
    return false;
  }
  return true;
}

/** Filters, score clamps and order defaults, before the plan sees anything. */
export function shapeModels(
  models: ReadonlyMap<string, QuizModel>,
  config: QuizConfig,
): Map<string, QuizModel> {
  const sections = (config.filterSections ?? []).map((entry) => entry.toLowerCase());
  const out = new Map<string, QuizModel>();
  for (const [language, model] of models) {
    const rounds = model.rounds
      .filter(
        (round) =>
          !sections.includes(round.name.toLowerCase()) &&
          !sections.includes(round.id.toLowerCase()),
      )
      .map((round) => ({
        ...round,
        questions: round.questions
          .filter((question) => !question.hiddenAtPlay && keeps(question, config))
          .map((question) => shapeQuestion(question, config)),
      }))
      .filter((round) => round.questions.length > 0);
    if (config.excludeSections === true) {
      const all = rounds.flatMap((round) =>
        round.questions.map((question) => ({ ...question, round: "" })),
      );
      out.set(language, {
        ...model,
        questions: all,
        rounds: all.length === 0 ? [] : [createRound("", "", null, all)],
      });
      continue;
    }
    out.set(language, {
      ...model,
      rounds: rounds.map((round) =>
        createRound(round.id, round.name, round.secret, round.questions),
      ),
      questions: rounds.flatMap((round) => round.questions),
    });
  }
  return out;
}

export function planOptionsFrom(
  config: QuizConfig,
  planOrder: PlanOptions,
  secretQuestionText: string,
): PlanOptions {
  return {
    ...(config.groupBy !== undefined ? { groupBy: config.groupBy } : {}),
    ...(config.addSecretThemeQuestions === true
      ? {
          addSecretThemeQuestions: true,
          secretQuestionText,
        }
      : {}),
    ...(config.seed !== undefined ? { seed: config.seed } : {}),
    ...(config.shuffleQuestions !== undefined
      ? { shuffleQuestions: config.shuffleQuestions }
      : {}),
    ...(config.shuffleRounds !== undefined
      ? { shuffleRounds: config.shuffleRounds }
      : {}),
    ...(config.keepQuestionOrder === true ? { shuffleQuestions: false } : {}),
    ...(config.keepSectionOrder === true ? { shuffleRounds: false } : {}),
    ...(config.defaultTimer !== undefined && config.defaultTimer > 0
      ? { defaultTimerMs: config.defaultTimer * 1000 }
      : {}),
    ...(config.disableTextFormatting === true
      ? { disableTextFormatting: true }
      : {}),
    ...planOrder,
  };
}

/** Defaults the config fills into every language model. */
export function applyContentDefaults(
  models: ReadonlyMap<string, QuizModel>,
  config: QuizConfig,
): Map<string, QuizModel> {
  const defaultAuthor = config.defaultAuthor?.trim() ?? "";
  const defaultCategory = config.defaultCategory?.trim() ?? "";
  const title = config.title?.trim() ?? "";
  if (
    defaultAuthor.length === 0 &&
    defaultCategory.length === 0 &&
    title.length === 0
  ) {
    return new Map(models);
  }
  const out = new Map<string, QuizModel>();
  for (const [language, model] of models) {
    const questions = model.questions.map((question) => ({
      ...question,
      authors:
        question.authors.length === 0 && defaultAuthor.length > 0
          ? [defaultAuthor]
          : question.authors,
      categories:
        question.categories.length === 0 && defaultCategory.length > 0
          ? [defaultCategory]
          : question.categories,
    }));
    const byId = new Map(questions.map((question) => [question.id, question]));
    out.set(language, {
      ...model,
      meta: title.length === 0 ? model.meta : { ...model.meta, title },
      questions,
      rounds: model.rounds.map((round) =>
        createRound(
          round.id,
          round.name,
          round.secret,
          round.questions.map((question) => byId.get(question.id) ?? question),
        ),
      ),
    });
  }
  return out;
}

/** Answers, reveals, hints and the index follow the same question. */
export interface PreparedModels {
  readonly models: Map<string, QuizModel>;
  readonly language: string;
}

/** Root language, property sync and the language to show first. */
export function prepareModels(
  loaded: ReadonlyMap<string, QuizModel>,
  config: QuizConfig,
  requested: string | null,
): PreparedModels | null {
  let models = shapeModels(applyContentDefaults(loaded, config), config);
  const available = [...models.keys()].filter((key) => key.length > 0).sort();
  const root =
    findLanguageKey(models, config.languageDefault ?? available[0] ?? "") ??
    [...models.keys()][0] ??
    "";
  const wantsSync =
    config.syncPropertiesWithTranslations === true ||
    [...models.values()].some((model) =>
      model.questions.some((question) => question.syncAll),
    );
  if (wantsSync) {
    models = syncModels(
      models,
      root,
      (question) =>
        question.syncAll || config.syncPropertiesWithTranslations === true,
    );
  }
  const language =
    (requested === null ? null : findLanguageKey(models, requested)) ?? root;
  const model = models.get(language);
  if (model === undefined) {
    return null;
  }
  return { models, language };
}

/** Build the plan for another loaded language. */
export function languagePlan(
  models: ReadonlyMap<string, QuizModel>,
  language: string,
  options: PlanOptions,
): { readonly model: QuizModel; readonly plan: QuizPlan } | null {
  const model = models.get(language);
  if (model === undefined) {
    return null;
  }
  return { model, plan: planQuiz(model, options) };
}

export interface LanguageSwitch {
  readonly language: string;
  readonly model: QuizModel;
  readonly state: SessionState;
}

/** V2 warned about authors outside `possibleAuthors`; it never dropped them. */
export function possibleWarnings(
  model: QuizModel,
  config: QuizConfig,
): Diagnostic[] {
  const authors = config.possibleAuthors?.map((entry) => entry.toLowerCase());
  const categories = config.possibleCategories?.map((entry) => entry.toLowerCase());
  const out: Diagnostic[] = [];
  for (const question of model.questions) {
    for (const author of question.authors) {
      if (authors !== undefined && !authors.includes(author.toLowerCase())) {
        out.push(
          syntaxWarning(
            DiagnosticCodes.UnknownAttribute,
            `Author "${author}" is not in possibleAuthors.`,
            { location: question.location },
          ),
        );
      }
    }
    for (const category of question.categories) {
      if (categories !== undefined && !categories.includes(category.toLowerCase())) {
        out.push(
          syntaxWarning(
            DiagnosticCodes.UnknownAttribute,
            `Category "${category}" is not in possibleCategories.`,
            { location: question.location },
          ),
        );
      }
    }
  }
  return out;
}

/** Everything a language switch changes, without notifying anyone. */
export function prepareLanguageSwitch(
  models: ReadonlyMap<string, QuizModel>,
  state: SessionState,
  code: string,
  options: PlanOptions,
): LanguageSwitch | null {
  const language = findLanguageKey(models, code);
  const model = language === null ? undefined : models.get(language);
  if (language === null || model === undefined) {
    return null;
  }
  const base = planQuiz(model, options);
  const flow = applyFlow(base, state.responses);
  return {
    language,
    model,
    state: {
      ...state,
      ...carryAcrossLanguages(state, flow.plan),
      language: language.length > 0 ? language : null,
      plan: flow.plan,
      timer: null,
      report: null,
      showingResults: false,
      diagnostics: [...state.diagnostics, ...base.diagnostics],
    },
  };
}

export function carryAcrossLanguages(
  state: SessionState,
  next: { readonly questions: readonly { readonly id: string }[] },
): Partial<SessionState> {
  const old = state.plan;
  if (old === null) {
    return {};
  }
  const byId = new Map(old.questions.map((question) => [question.id, question]));
  const pairs = next.questions.map((question, index) => [
    byId.get(question.id) ?? old.questions[index],
    question,
  ] as const);
  const responses: Record<string, Response> = {};
  const revealed: string[] = [];
  const expired: string[] = [];
  const hints: Record<string, number> = {};
  for (const [before, after] of pairs) {
    if (before === undefined || after === undefined) {
      continue;
    }
    const response = state.responses[before.id];
    if (response !== undefined) {
      responses[after.id] = response;
    }
    if (state.revealed.includes(before.id)) {
      revealed.push(after.id);
    }
    if (state.expired.includes(before.id)) {
      expired.push(after.id);
    }
    const used = state.hints[before.id];
    if (used !== undefined) {
      hints[after.id] = used;
    }
  }
  return {
    responses,
    revealed,
    expired,
    hints,
    index: Math.max(-1, Math.min(state.index, next.questions.length)),
  };
}
