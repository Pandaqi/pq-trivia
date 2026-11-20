/**
 * Question types from outside core.
 *
 * A plugin grades its type and hands the player an input component. Core keeps
 * both opaque: no Preact import, no DOM. The browser passes the component to
 * Preact; a headless host can ignore it.
 *
 * The question is still a plain `QuestionModel`. Anything the plugin needs of
 * its own rides in `question.extra`, where unknown attributes already land.
 */

import {
  pluginIdOf,
  QuestionType,
  type QuestionModel,
} from "../model/question";
import type { QuizModel } from "../model/quiz";
import type { Response } from "../session/responses";
import {
  DiagnosticCodes,
  syntaxWarning,
  type Diagnostic,
} from "../syntax/diagnostics";
import type { GradePart } from "./types";

export interface PluginGrade {
  readonly points: number;
  /** Defaults to the question's own score. */
  readonly maxPoints?: number;
  /** Defaults to "all the points". */
  readonly correct?: boolean;
  readonly parts?: readonly GradePart[];
  readonly normalizedGiven?: readonly string[];
  readonly normalizedCorrect?: readonly string[];
}

/** Opaque on purpose. The renderer decides what to do with each one. */
export interface PluginRender {
  readonly input?: unknown;
  readonly screen?: unknown;
  readonly print?: unknown;
}

export interface CustomQuestionType {
  /** `Type => confidence`. Lowercase letters, digits and dashes. */
  readonly id: string;
  /** For menus and diagnostics. The id is enough when this is absent. */
  readonly label?: string;
  readonly defaultResponse?: (question: QuestionModel) => Response;
  readonly grade: (question: QuestionModel, response: Response) => PluginGrade;
  readonly validate?: (
    question: QuestionModel,
    diagnostics: Diagnostic[],
  ) => void;
  readonly render?: PluginRender;
  readonly export?: Readonly<Record<string, unknown>>;
}

/** Short, lowercase, no spaces. A type name has to fit after `Type =>`. */
export const PLUGIN_ID_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;

export function defineQuestionType(
  definition: CustomQuestionType,
): CustomQuestionType {
  const id = pluginIdOf(definition.id);
  if (!PLUGIN_ID_PATTERN.test(id)) {
    throw new Error(
      `"${definition.id}" is not a question type id. Use lowercase letters, digits and dashes, like "confidence".`,
    );
  }
  return { ...definition, id };
}

export class QuestionTypeRegistry {
  readonly #types = new Map<string, CustomQuestionType>();

  /** Returns an unsubscribe, like every other registry here. */
  add(type: CustomQuestionType): () => void {
    this.#types.set(type.id, type);
    return () => this.remove(type.id);
  }

  remove(id: string): void {
    this.#types.delete(id);
  }

  get(id: string | null | undefined): CustomQuestionType | undefined {
    return id === null || id === undefined ? undefined : this.#types.get(id);
  }

  has(id: string): boolean {
    return this.#types.has(id);
  }

  ids(): string[] {
    return [...this.#types.keys()];
  }

  list(): CustomQuestionType[] {
    return [...this.#types.values()];
  }

  clear(): void {
    this.#types.clear();
  }
}

/**
 * Every custom question checks itself. A type nobody registered is named, not
 * ignored. `kind` limits the pass to one type, for a late registration.
 */
export function pluginProblemsFor(
  registry: QuestionTypeRegistry,
  model: QuizModel,
  kind?: string,
): Diagnostic[] {
  const found: Diagnostic[] = [];
  for (const question of model.questions) {
    if (question.type !== QuestionType.Custom || question.plugin === null) {
      continue;
    }
    if (kind !== undefined && question.plugin !== kind) {
      continue;
    }
    const plugin = registry.get(question.plugin);
    if (plugin === undefined) {
      found.push(
        syntaxWarning(
          DiagnosticCodes.UnknownType,
          `No question type is registered for "${question.plugin}".`,
          {
            location: question.location,
            suggestion:
              "Call quiz.registerQuestionType before loading the quiz.",
          },
        ),
      );
      continue;
    }
    plugin.validate?.(question, found);
  }
  return found;
}

export interface PluginHost {
  readonly registry: QuestionTypeRegistry;
  readonly model: () => QuizModel | null;
  readonly report: (diagnostics: readonly Diagnostic[]) => void;
  readonly notify: () => void;
}

/** Add a type now; check the questions already loaded, if any. */
export function registerPlugin(
  host: PluginHost,
  type: CustomQuestionType,
): () => void {
  const remove = host.registry.add(type);
  const model = host.model();
  if (model !== null) {
    const found = pluginProblemsFor(host.registry, model, type.id);
    if (found.length > 0) {
      host.report(found);
    }
  }
  return () => {
    remove();
    host.notify();
  };
}
