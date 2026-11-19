/**
 * Multiple languages, the V2 way.
 *
 * Two files ending in a language code (`questions.nl.trivia`, `questions.en.trivia`)
 * are matched by question order. Two questions in one file with the same `ID`
 * are matched by that ID. `syncPropertiesWithTranslations` copies the root
 * language's layout and scoring onto translations that left them alone.
 */

import {
  GradingMode,
  OrderMode,
  ScoringMethod,
  type QuestionModel,
} from "../model/question";
import { createRound } from "../model/round";
import type { QuizModel } from "../model/quiz";

function code(value: string): string {
  return value.trim().toUpperCase();
}

/** `questions.nl.trivia` -> `NL`. `quiz.trivia` -> null. */
export function languageFromFile(name: string | undefined): string | null {
  if (name === undefined) {
    return null;
  }
  const base = name.split(/[\\/]/).pop() ?? name;
  const parts = base.split(".");
  if (parts.length < 3) {
    return null;
  }
  const candidate = parts[parts.length - 2]?.trim() ?? "";
  if (!/^[a-z]{2,3}$/i.test(candidate)) {
    return null;
  }
  const lower = candidate.toLowerCase();
  if (["trivia", "txt", "md", "json", "htm", "html"].includes(lower)) {
    return null;
  }
  return code(candidate);
}

function questionLanguage(
  question: QuestionModel,
  fallback: string | null,
): string {
  const own = question.language?.trim() ?? "";
  if (own.length > 0) {
    return code(own);
  }
  return fallback === null ? "" : code(fallback);
}

/** One file can hold several languages. Split it, keeping order. */
export function splitByLanguage(
  model: QuizModel,
  fallback: string | null,
): Map<string, QuizModel> {
  const groups = new Map<string, QuestionModel[]>();
  for (const question of model.questions) {
    const language = questionLanguage(question, fallback);
    const list = groups.get(language) ?? [];
    list.push(question);
    groups.set(language, list);
  }
  if (groups.size === 0) {
    groups.set(fallback === null ? "" : code(fallback), []);
  }
  if (groups.size === 1) {
    const only = [...groups.keys()][0] ?? "";
    return new Map([[only, model]]);
  }

  const out = new Map<string, QuizModel>();
  let first = true;
  for (const [language, questions] of groups) {
    const ids = new Set(questions.map((question) => question.id));
    const rounds = model.rounds
      .map((round) =>
        createRound(
          round.id,
          round.name,
          round.secret,
          round.questions.filter(
            (question) =>
              ids.has(question.id) &&
              questionLanguage(question, fallback) === language,
          ),
        ),
      )
      .filter((round) => round.questions.length > 0);
    const start =
      model.start !== null &&
      questionLanguage(model.start, fallback) === language
        ? model.start
        : null;
    const end =
      model.end !== null && questionLanguage(model.end, fallback) === language
        ? model.end
        : null;
    out.set(language, {
      meta: {
        ...model.meta,
        language: language.length === 0 ? null : language,
        languages: [...groups.keys()].filter((entry) => entry.length > 0),
      },
      rounds,
      questions,
      start,
      end,
      // Diagnostics are about the file, not one translation.
      diagnostics: first ? model.diagnostics : [],
    });
    first = false;
  }
  return out;
}

/** Files of one language join the way `buildQuizFromParsed` joins them. */
export function mergeModels(models: readonly QuizModel[]): QuizModel {
  const first = models[0];
  if (first === undefined) {
    throw new Error("No models to merge.");
  }
  if (models.length === 1) {
    return first;
  }
  const rounds = first.rounds.map((round) => ({
    id: round.id,
    name: round.name,
    secret: round.secret,
    questions: [...round.questions],
    byName: new Map<string, string>([[round.name.toLowerCase(), round.id]]),
  }));
  const roundByName = new Map<string, (typeof rounds)[number]>();
  for (const round of rounds) {
    roundByName.set(round.name.toLowerCase(), round);
  }
  const questions: QuestionModel[] = [...first.questions];

  for (const model of models.slice(1)) {
    const oldToNew = new Map<string, string>();
    for (const round of model.rounds) {
      let target = roundByName.get(round.name.toLowerCase());
      if (target === undefined) {
        target = {
          id: round.id,
          name: round.name,
          secret: round.secret,
          questions: [],
          byName: new Map(),
        };
        rounds.push(target);
        roundByName.set(round.name.toLowerCase(), target);
      } else if (target.secret === null && round.secret !== null) {
        target.secret = round.secret;
      }
      oldToNew.set(round.id, target.id);
    }
    for (const question of model.questions) {
      const roundId =
        question.round === null
          ? null
          : (oldToNew.get(question.round) ?? question.round);
      questions.push({ ...question, round: roundId });
      if (roundId !== null) {
        const target =
          rounds.find((round) => round.id === roundId) ??
          roundByName.get(roundId.toLowerCase());
        target?.questions.push({ ...question, round: roundId });
      }
    }
  }

  return {
    meta: {
      ...first.meta,
      languages: [
        ...new Set([
          ...first.meta.languages.map(code),
          ...models.flatMap((model) => model.meta.languages.map(code)),
        ]),
      ],
    },
    rounds: rounds.map((round) =>
      createRound(round.id, round.name, round.secret, round.questions),
    ),
    questions,
    start: first.start,
    end: first.end,
    diagnostics: models.flatMap((model) => model.diagnostics),
  };
}

const DEFAULT_TIMER = null;

function takeIfUnset<T>(target: T, root: T, unset: (value: T) => boolean): T {
  return unset(target) ? root : target;
}

/**
 * Copy layout and scoring from the root language where the translation has
 * nothing of its own. Text, answers, hints and sources stay translated.
 */
export function syncTranslation(
  target: QuestionModel,
  root: QuestionModel,
): QuestionModel {
  return {
    ...target,
    score: takeIfUnset(target.score, root.score, (value) => value === 1),
    timerMs: takeIfUnset(
      target.timerMs,
      root.timerMs,
      (value) => value === DEFAULT_TIMER,
    ),
    media: takeIfUnset(target.media, root.media, (value) => value.length === 0),
    categories: takeIfUnset(
      target.categories,
      root.categories,
      (value) => value.length === 0,
    ),
    authors: takeIfUnset(
      target.authors,
      root.authors,
      (value) => value.length === 0,
    ),
    layout: takeIfUnset(target.layout, root.layout, (value) => value === null),
    background: takeIfUnset(
      target.background,
      root.background,
      (value) => value === null,
    ),
    colorScheme: takeIfUnset(
      target.colorScheme,
      root.colorScheme,
      (value) => value === null,
    ),
    transition: takeIfUnset(
      target.transition,
      root.transition,
      (value) => value === null,
    ),
    reveal: takeIfUnset(target.reveal, root.reveal, (value) => value === null),
    classes: takeIfUnset(
      target.classes,
      root.classes,
      (value) => value.length === 0,
    ),
    printFlags: takeIfUnset(
      target.printFlags,
      root.printFlags,
      (value) => value.length === 0,
    ),
    buttons: takeIfUnset(
      target.buttons,
      root.buttons,
      (value) => value.length === 0,
    ),
    credits: takeIfUnset(
      target.credits,
      root.credits,
      (value) => value.length === 0,
    ),
    height: takeIfUnset(target.height, root.height, (value) => value === null),
    script: takeIfUnset(target.script, root.script, (value) => value === null),
    range: takeIfUnset(target.range, root.range, (value) => value === null),
    grading: takeIfUnset(
      target.grading,
      root.grading,
      (value) => value === GradingMode.Normalized,
    ),
    scoring: takeIfUnset(
      target.scoring,
      root.scoring,
      (value) => value === ScoringMethod.AllOrNothing,
    ),
    fuzzyDistance: takeIfUnset(
      target.fuzzyDistance,
      root.fuzzyDistance,
      (value) => value === null,
    ),
    answersOrder: takeIfUnset(
      target.answersOrder,
      root.answersOrder,
      (value) => value === OrderMode.Keep,
    ),
    mediaOrder: takeIfUnset(
      target.mediaOrder,
      root.mediaOrder,
      (value) => value === OrderMode.Keep,
    ),
    placeAt: takeIfUnset(
      target.placeAt,
      root.placeAt,
      (value) => value === null,
    ),
    placeBefore: takeIfUnset(
      target.placeBefore,
      root.placeBefore,
      (value) => value.length === 0,
    ),
    placeAfter: takeIfUnset(
      target.placeAfter,
      root.placeAfter,
      (value) => value.length === 0,
    ),
    when: takeIfUnset(target.when, root.when, (value) => value === null),
    unlock: takeIfUnset(target.unlock, root.unlock, (value) => value === null),
    hiddenAtPlay: takeIfUnset(
      target.hiddenAtPlay,
      root.hiddenAtPlay,
      (value) => value === false,
    ),
    hiddenAtExport: takeIfUnset(
      target.hiddenAtExport,
      root.hiddenAtExport,
      (value) => value === false,
    ),
    formatText: takeIfUnset(
      target.formatText,
      root.formatText,
      (value) => value === true,
    ),
    sources: takeIfUnset(
      target.sources,
      root.sources,
      (value) => value.length === 0,
    ),
  };
}

/** Apply the sync to every translation, matched by ID or by position. */
export function syncModels(
  models: Map<string, QuizModel>,
  rootLanguage: string,
  enabledFor: (question: QuestionModel) => boolean,
): Map<string, QuizModel> {
  const root = models.get(rootLanguage);
  if (root === undefined) {
    return models;
  }
  const rootById = new Map(
    root.questions.map((question) => [question.id, question]),
  );
  const out = new Map<string, QuizModel>();
  for (const [language, model] of models) {
    if (language === rootLanguage) {
      out.set(language, model);
      continue;
    }
    const questions = model.questions.map((question, index) => {
      const match =
        (question.translation === null
          ? undefined
          : rootById.get(question.translation)) ??
        rootById.get(question.id) ??
        root.questions[index];
      if (match === undefined || !enabledFor(question)) {
        return question;
      }
      return syncTranslation(question, match);
    });
    const byId = new Map(questions.map((question) => [question.id, question]));
    out.set(language, {
      ...model,
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

export function languagesOf(models: Map<string, QuizModel>): string[] {
  return [...models.keys()].filter((language) => language.length > 0).sort();
}
