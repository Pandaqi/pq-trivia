/**
 * `<pq-quiz src="quiz.trivia">`, the drop-in element.
 *
 * Light DOM on purpose: author themes target `.pq-*` the same way whether they
 * mounted with JS or wrote a tag. One element, one quiz.
 *
 * This is the lean path: one fetch, sync parsing. Manifests, worker parsing
 * and the IndexedDB cache live in `pq-trivia/browser`, for hosts who ask.
 */

import { isEncryptedQuiz } from "../../core/export/embedded";
import type { LoadInput, ParseHook } from "../../core/quiz/types";
import type { QuizManifest } from "../../core/quiz/manifest";
import { createQuiz, type Quiz } from "../../core/session/quiz";
import { browserAnswerKey } from "../../platform/answerKey";
import { fetchText } from "../../platform/browser/fetchText";
import { loaderT } from "../../i18n/loader";
import { findQuizFiles } from "../../platform/browser/source";
import { mountQuiz, type MountedQuiz } from "../preact/mount";
import {
  loadTheme,
  resolveThemeFolder,
  setTheme,
} from "../../platform/browser/theme";

/** A fetched file is either Trivia Syntax or an embedded JSON quiz. */
function payloadOf(text: string, source: string): LoadInput {
  if (!text.trimStart().startsWith("{")) {
    return { type: "text", text, file: source };
  }
  const data = JSON.parse(text) as unknown;
  return isEncryptedQuiz(data)
    ? { type: "encrypted", data }
    : { type: "inline", data };
}

const ELEMENT_NAME = "pq-quiz";

function truthy(value: string | null): boolean {
  return value === "" || value === "true" || value === "1" || value === "yes";
}

export class QuizElement extends HTMLElement {
  /** Set by a host that wants worker parsing, e.g. from `pq-trivia/browser`. */
  static parser: ParseHook | null = null;

  static get observedAttributes(): readonly string[] {
    return [
      "src",
      "filenames",
      "filename",
      "file-extensions",
      "questions-folder",
      "base-url",
      "subfolder-media",
      "subfolder-theme",
      "media-formats",
      "language-default",
      "seed",
      "shuffle-questions",
      "shuffle-rounds",
      "theme",
      "theme-upload",
    ];
  }

  #quiz: Quiz | null = null;
  #mounted: MountedQuiz | null = null;
  #manifest: QuizManifest | null = null;
  #generation = 0;

  get quiz(): Quiz | null {
    return this.#quiz;
  }

  /** Always null on the lean path. The browser entry can fill this in later. */
  get manifest(): QuizManifest | null {
    return this.#manifest;
  }

  connectedCallback(): void {
    void this.#boot();
  }

  disconnectedCallback(): void {
    this.#teardown();
  }

  attributeChangedCallback(): void {
    if (this.isConnected && this.#quiz !== null) {
      void this.#boot();
    }
  }

  async #boot(): Promise<void> {
    this.#teardown();
    const generation = this.#generation + 1;
    this.#generation = generation;

    const host = document.createElement("div");
    host.className = "pq-host";
    this.replaceChildren(host);

    const parser = QuizElement.parser;
    const quiz = createQuiz({
      config: {
        seed: this.getAttribute("seed") ?? "",
        shuffleQuestions: truthy(this.getAttribute("shuffle-questions")),
        shuffleRounds: truthy(this.getAttribute("shuffle-rounds")),
        ...(this.getAttribute("theme") === null
          ? {}
          : { theme: this.getAttribute("theme") as string }),
        themeUpload: truthy(this.getAttribute("theme-upload")),
        ...(this.getAttribute("base-url") === null
          ? {}
          : { url: this.getAttribute("base-url") as string }),
        ...(this.getAttribute("subfolder-media") === null
          ? {}
          : { subFolderMedia: this.getAttribute("subfolder-media") as string }),
        ...(this.getAttribute("subfolder-theme") === null
          ? {}
          : { subFolderTheme: this.getAttribute("subfolder-theme") as string }),
        ...(this.getAttribute("media-formats") === null
          ? {}
          : {
              mediaFormats: (this.getAttribute("media-formats") as string)
                .split(",")
                .map((entry) => entry.trim())
                .filter((entry) => entry.length > 0),
            }),
        ...(this.getAttribute("language-default") === null
          ? {}
          : {
              languageDefault: this.getAttribute("language-default") as string,
            }),
        answersKey: browserAnswerKey,
      },
      ...(parser === null ? {} : { parseText: parser }),
    });
    this.#quiz = quiz;
    this.#mounted = mountQuiz(quiz, host);

    const theme = this.getAttribute("theme");
    const source = this.getAttribute("src");
    if (source === null) {
      try {
        await this.#loadProbed(quiz, generation);
        await this.#headerTheme(theme, generation);
      } catch (error) {
        this.#fail(quiz, error, generation);
      }
      return;
    }
    try {
      const text = await fetchText(source);
      if (generation !== this.#generation) {
        return;
      }
      await quiz.load(payloadOf(text, source));
      await this.#headerTheme(theme, generation);
    } catch (error) {
      this.#fail(quiz, error, generation);
    }
  }

  /**
   * V2's filename probing: `filenames` exactly, or `questions-0.trivia`,
   * `questions-1.trivia`, ... until a number is missing.
   */
  async #loadProbed(quiz: Quiz, generation: number): Promise<void> {
    const names = (this.getAttribute("filenames") ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    const extensions = (this.getAttribute("file-extensions") ?? "trivia,txt,md")
      .split(",")
      .map((extension) => extension.trim().replace(/^\./, ""))
      .filter((extension) => extension.length > 0);
    const pattern = this.getAttribute("filename") ?? "questions";
    const files = await findQuizFiles({
      base: this.getAttribute("base-url") ?? "",
      folder: this.getAttribute("questions-folder") ?? "",
      ...(names.length === 0 ? {} : { filenames: names }),
      extensions,
      pattern,
    });
    if (files.length === 0) {
      throw new Error(
        loaderT(quiz.state.language ?? quiz.config.language)("loaderNoFiles", {
          pattern,
        }),
      );
    }
    if (generation !== this.#generation) {
      return;
    }
    await quiz.load({ type: "files", files });
  }

  /** `Theme => forest` in the header, when no attribute says otherwise. */
  /** A stale load must not fail the quiz that replaced it. */
  #fail(quiz: Quiz, error: unknown, generation: number): void {
    if (generation === this.#generation) {
      quiz.fail(error instanceof Error ? error.message : String(error));
    }
  }

  async #headerTheme(
    attribute: string | null,
    generation: number,
  ): Promise<void> {
    if (attribute !== null && attribute.trim().length > 0) {
      return;
    }
    const name = this.#quiz?.meta?.theme ?? null;
    if (name === null || name.trim().length === 0) {
      return;
    }
    const root = this.getAttribute("subfolder-theme") ?? "themes/";
    const path = name.includes("/") ? name : `${root}${name}/`;
    await this.#applyTheme(path, generation);
  }

  async #applyTheme(folder: string, generation: number): Promise<void> {
    try {
      const base = this.getAttribute("base-url") ?? "";
      const path = base.length === 0 ? folder : new URL(folder, base).href;
      const theme = await loadTheme(resolveThemeFolder(path));
      if (generation !== this.#generation) {
        theme.destroy();
        return;
      }
      setTheme(theme);
    } catch (error) {
      console.warn(
        `[pq-trivia] Theme ${folder} could not load: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  #teardown(): void {
    this.#mounted?.destroy();
    this.#quiz?.destroy();
    this.#mounted = null;
    this.#quiz = null;
    this.#manifest = null;
  }
}

/** Safe to call twice. Returns the element constructor. */
export function defineQuizElement(): CustomElementConstructor {
  const existing = customElements.get(ELEMENT_NAME);
  if (existing !== undefined) {
    return existing;
  }
  customElements.define(ELEMENT_NAME, QuizElement);
  return QuizElement;
}
