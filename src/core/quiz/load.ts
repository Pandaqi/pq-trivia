/**
 * Loading, and unlocking an encrypted file.
 *
 * Kept out of `create.ts` so that file stays about the controller, and because
 * loading has its own failure modes: bad text, a locked file, an empty quiz.
 */

import {
  fromEmbedded,
  isEncryptedQuiz,
  type EncryptedQuizPayload,
} from "../export/embedded";
import {
  buildQuizFromParsed,
  type BuildOptions,
  type QuizModel,
} from "../model/quiz";
import { RevealMode } from "../session/policies";
import {
  PlayMode,
  SessionStatus,
  sessionReducer,
  type SessionState,
} from "../session/session";
import {
  DiagnosticCodes,
  syntaxWarning,
  type Diagnostic,
} from "../syntax/diagnostics";
import type { LoadInput, ParseHook, QuizConfig } from "./types";
import { languageFromFile, mergeModels, splitByLanguage } from "./languages";

export interface LoaderDeps {
  readonly destroyed: () => boolean;
  readonly config: () => QuizConfig;
  readonly parseText: ParseHook;
  readonly revealMode: () => RevealMode;
  readonly state: () => SessionState;
  readonly setState: (state: SessionState) => void;
  /** The text this quiz came from, for a `.trivia` export. Null when inline. */
  readonly setSource: (text: string | null) => void;
  readonly apply: (state: SessionState) => void;
  readonly notify: (previousStatus: SessionStatus) => void;
  readonly refreshSaved: () => Promise<void>;
  readonly finishLoad: (models: Map<string, QuizModel>) => void;
  readonly diagnostics: Diagnostic[];
  readonly emitReady: () => void;
  /** Type names a plugin registered, so `Type => that-name` parses. */
  readonly pluginTypes: () => readonly string[];
}

export interface Loader {
  load(input: LoadInput): Promise<void>;
  ready(): Promise<void>;
  /** Open an encrypted quiz. False when the passphrase or the key is wrong. */
  unlock(passphrase: string): Promise<boolean>;
  locked(): boolean;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createLoader(deps: LoaderDeps): Loader {
  let lockedPayload: EncryptedQuizPayload | null = null;

  function fail(error: unknown): void {
    const diagnostic = syntaxWarning(
      DiagnosticCodes.InvalidLine,
      `Could not load the quiz: ${describe(error)}`,
    );
    deps.diagnostics.push(diagnostic);
    deps.apply(
      sessionReducer(
        deps.state(),
        { type: "load/failure", diagnostics: deps.diagnostics },
        0,
      ),
    );
  }

  async function settle(models: Map<string, QuizModel>): Promise<void> {
    deps.finishLoad(models);
    await deps.refreshSaved();
    deps.notify(deps.state().status);
    if (
      deps.revealMode() === RevealMode.Always &&
      deps.config().restricted !== true &&
      deps.config().allowReveal !== false &&
      deps.state().plan !== null
    ) {
      deps.apply(
        sessionReducer(
          deps.state(),
          { type: "mode/set", mode: PlayMode.Answers },
          0,
        ),
      );
    }
  }

  function buildOptions(file?: string): BuildOptions {
    const config = deps.config();
    const fromName = languageFromFile(file);
    const language =
      fromName ?? config.languageDefault ?? config.language ?? null;
    return {
      ...(file !== undefined ? { file } : {}),
      ...(config.defaultScore !== undefined
        ? { defaultScore: config.defaultScore }
        : {}),
      ...(language !== null ? { defaultLanguage: language } : {}),
      ...(config.forbidInlineLists === true ? { forbidInlineLists: true } : {}),
      ...(config.symbols !== undefined ? { symbols: config.symbols } : {}),
      ...(deps.pluginTypes().length === 0
        ? {}
        : { pluginTypes: deps.pluginTypes() }),
    };
  }

  /** Parsed inputs, one per file, become one model per language. */
  function modelsFromParsed(
    parsed: readonly {
      readonly parsed: Awaited<ReturnType<ParseHook>>;
      readonly language: string | null;
    }[],
  ): Map<string, QuizModel> {
    const grouped = new Map<string, QuizModel[]>();
    for (const entry of parsed) {
      const options = buildOptions();
      const model = buildQuizFromParsed(
        [entry.parsed],
        entry.language === null
          ? options
          : { ...options, defaultLanguage: entry.language },
      );
      const fallback = deps.config().languageDefault ?? null;
      for (const [language, split] of splitByLanguage(model, fallback)) {
        const list = grouped.get(language) ?? [];
        list.push(split);
        grouped.set(language, list);
      }
    }
    return new Map(
      [...grouped.entries()].map(([language, models]) => [
        language,
        mergeModels(models),
      ]),
    );
  }

  async function load(input: LoadInput): Promise<void> {
    if (deps.destroyed()) {
      return;
    }
    deps.setState(sessionReducer(deps.state(), { type: "load/start" }));
    deps.setSource(null);
    try {
      if (input.type === "text") {
        const options = buildOptions(input.file);
        deps.setSource(input.text);
        const parsed = await deps.parseText(input.text, options);
        await settle(
          modelsFromParsed([
            { parsed, language: languageFromFile(input.file) },
          ]),
        );
        return;
      }
      if (input.type === "files") {
        deps.setSource(input.files.map((file) => file.text).join("\n\n"));
        // Parse every file with its own language. A name like
        // `questions.nl.trivia` is a language mark, not decoration.
        const parsed = await Promise.all(
          input.files.map(async (file) => ({
            parsed: await deps.parseText(file.text, buildOptions(file.name)),
            language: languageFromFile(file.name),
          })),
        );
        await settle(modelsFromParsed(parsed));
        return;
      }
      if (input.type === "model") {
        await settle(
          splitByLanguage(input.quiz, deps.config().languageDefault ?? null),
        );
        return;
      }
      if (input.type === "inline") {
        await settle(
          splitByLanguage(
            fromEmbedded(input.data).quiz,
            deps.config().languageDefault ?? null,
          ),
        );
        return;
      }
      if (!isEncryptedQuiz(input.data)) {
        throw new Error("This is not an encrypted quiz file.");
      }
      lockedPayload = input.data;
      throw new Error("This quiz is locked. Enter its passphrase.");
    } catch (error) {
      fail(error);
    }
  }

  async function unlock(passphrase: string): Promise<boolean> {
    const payload = lockedPayload;
    const key = deps.config().answersKey;
    if (payload === null || key === undefined || deps.destroyed()) {
      return false;
    }
    try {
      const plain = await key.unlock(payload, passphrase);
      lockedPayload = null;
      deps.setState(sessionReducer(deps.state(), { type: "load/start" }));
      await settle(
        splitByLanguage(
          fromEmbedded(plain).quiz,
          deps.config().languageDefault ?? null,
        ),
      );
      return deps.state().status !== SessionStatus.Error;
    } catch {
      // Wrong passphrase. Keep the payload so the next try can work.
      return false;
    }
  }

  async function ready(): Promise<void> {
    const state = deps.state();
    if (state.status !== SessionStatus.Error && state.plan !== null) {
      deps.emitReady();
    }
  }

  return {
    load,
    ready,
    unlock,
    locked: () => lockedPayload !== null,
  };
}
