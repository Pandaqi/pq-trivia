/**
 * Order and seed, where a host can see them.
 *
 * Same seed, same order. Changing order keeps every answer already given.
 */

import type { JSX } from "preact";
import { useState } from "preact/hooks";
import type { Quiz } from "../../../core/session/quiz";

export function SettingsPanel({
  quiz,
  seed,
}: {
  readonly quiz: Quiz;
  readonly seed: string;
}): JSX.Element {
  const [draftSeed, setDraftSeed] = useState(seed);
  const [questions, setQuestions] = useState(
    quiz.config.shuffleQuestions ?? false,
  );
  const [rounds, setRounds] = useState(quiz.config.shuffleRounds ?? false);

  return (
    <details class="pq-settings">
      <summary>Order and seed</summary>
      <div class="pq-settings-body">
        <label class="pq-field">
          <span class="pq-field-label">Seed</span>
          <input
            class="pq-input"
            type="text"
            value={draftSeed}
            autocomplete="off"
            onInput={(event) => setDraftSeed(event.currentTarget.value)}
          />
        </label>
        <label class="pq-check">
          <input
            type="checkbox"
            checked={questions}
            onChange={(event) => setQuestions(event.currentTarget.checked)}
          />
          Shuffle questions inside a round
        </label>
        <label class="pq-check">
          <input
            type="checkbox"
            checked={rounds}
            onChange={(event) => setRounds(event.currentTarget.checked)}
          />
          Shuffle rounds
        </label>
        <button
          type="button"
          onClick={() =>
            quiz.setOrder({
              seed: draftSeed.trim(),
              shuffleQuestions: questions,
              shuffleRounds: rounds,
            })
          }
        >
          Apply order
        </button>
        <p class="pq-settings-note">
          The same seed gives the same order. Answers stay where you left them.
        </p>
      </div>
    </details>
  );
}
