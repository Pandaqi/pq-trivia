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
import type { ParseHook } from "../../core/quiz/types";
import type { QuizManifest } from "../../core/quiz/manifest";
import { createQuiz, type Quiz } from "../../core/session/quiz";
import { browserAnswerKey } from "../../platform/answerKey";
import { fetchText } from "../../platform/browser/fetchText";
import { mountQuiz, type MountedQuiz } from "../preact/mount";

const ELEMENT_NAME = "pq-quiz";

function truthy(value: string | null): boolean {
  return value === "" || value === "true" || value === "1" || value === "yes";
}

export class QuizElement extends HTMLElement {
  /** Set by a host that wants worker parsing, e.g. from `pq-trivia/browser`. */
  static parser: ParseHook | null = null;

  static get observedAttributes(): readonly string[] {
    return ["src", "seed", "shuffle-questions", "shuffle-rounds"];
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
        answersKey: browserAnswerKey,
      },
      ...(parser === null ? {} : { parseText: parser }),
    });
    this.#quiz = quiz;
    this.#mounted = mountQuiz(quiz, host);

    const source = this.getAttribute("src");
    if (source === null) {
      return;
    }
    try {
      const text = await fetchText(source);
      if (generation !== this.#generation) {
        return;
      }
      if (!text.trimStart().startsWith("{")) {
        await quiz.load({ type: "text", text, file: source });
        return;
      }
      const data = JSON.parse(text) as unknown;
      await quiz.load(
        isEncryptedQuiz(data)
          ? { type: "encrypted", data }
          : { type: "inline", data },
      );
    } catch (error) {
      if (generation === this.#generation) {
        quiz.fail(error instanceof Error ? error.message : String(error));
      }
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
