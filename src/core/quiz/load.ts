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

export interface LoaderDeps {
  readonly destroyed: () => boolean;
  readonly config: () => QuizConfig;
  readonly parseText: ParseHook;
  readonly revealMode: () => RevealMode;
  readonly state: () => SessionState;
  readonly setState: (state: SessionState) => void;
  readonly apply: (state: SessionState) => void;
  readonly notify: (previousStatus: SessionStatus) => void;
  readonly refreshSaved: () => Promise<void>;
  readonly finishLoad: (model: QuizModel) => void;
  readonly diagnostics: Diagnostic[];
  readonly emitReady: () => void;
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

  async function settle(model: QuizModel): Promise<void> {
    deps.finishLoad(model);
    await deps.refreshSaved();
    deps.notify(deps.state().status);
    if (
      deps.revealMode() === RevealMode.Always &&
      deps.config().restricted !== true &&
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
    return {
      ...(file !== undefined ? { file } : {}),
      ...(config.defaultScore !== undefined
        ? { defaultScore: config.defaultScore }
        : {}),
      ...(config.language !== undefined && config.language !== null
        ? { defaultLanguage: config.language }
        : {}),
    };
  }

  async function load(input: LoadInput): Promise<void> {
    if (deps.destroyed()) {
      return;
    }
    deps.setState(sessionReducer(deps.state(), { type: "load/start" }));
    try {
      if (input.type === "text") {
        const options = buildOptions(input.file);
        const parsed = await deps.parseText(input.text, options);
        await settle(buildQuizFromParsed([parsed], options));
        return;
      }
      if (input.type === "files") {
        const parsed = await Promise.all(
          input.files.map((file) =>
            deps.parseText(file.text, buildOptions(file.name)),
          ),
        );
        await settle(buildQuizFromParsed(parsed, buildOptions()));
        return;
      }
      if (input.type === "model") {
        await settle(input.quiz);
        return;
      }
      if (input.type === "inline") {
        await settle(fromEmbedded(input.data).quiz);
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
      await settle(fromEmbedded(plain).quiz);
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
