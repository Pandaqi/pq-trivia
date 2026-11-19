/**
 * Order, sound, pinned buttons and downloads, where a host can reach them.
 *
 * Same seed, same order. Changing order keeps every answer already given.
 */

import type { JSX } from "preact";
import { useState } from "preact/hooks";
import type { Quiz } from "../../../core/session/quiz";
import {
  downloadQuizHandout,
  downloadQuizJson,
} from "../../../platform/browser/exports";
import { useT } from "../i18n";

export function SettingsPanel({
  quiz,
  seed,
}: {
  readonly quiz: Quiz;
  readonly seed: string;
}): JSX.Element {
  const t = useT();
  const [draftSeed, setDraftSeed] = useState(seed);
  const [questions, setQuestions] = useState(
    quiz.config.shuffleQuestions ?? false,
  );
  const [rounds, setRounds] = useState(quiz.config.shuffleRounds ?? false);
  const [sound, setSound] = useState(quiz.config.timerSound === true);
  const actions = quiz.actions.list();

  return (
    <details class="pq-settings">
      <summary>{t("settingsTitle")}</summary>
      <div class="pq-settings-body">
        <label class="pq-field">
          <span class="pq-field-label">{t("seed")}</span>
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
          {t("shuffleQuestions")}
        </label>
        <label class="pq-check">
          <input
            type="checkbox"
            checked={rounds}
            onChange={(event) => setRounds(event.currentTarget.checked)}
          />
          {t("shuffleRounds")}
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
          {t("applyOrder")}
        </button>
        <p class="pq-settings-note">{t("orderNote")}</p>

        <label class="pq-check">
          <input
            type="checkbox"
            checked={sound}
            onChange={(event) => {
              setSound(event.currentTarget.checked);
              quiz.configure({ timerSound: event.currentTarget.checked });
            }}
          />
          {t("beep")}
        </label>

        {actions.length === 0 ? null : (
          <fieldset class="pq-settings-group">
            <legend>{t("toolbar")}</legend>
            {actions.map((action) => (
              <label class="pq-check" key={action.id}>
                <input
                  type="checkbox"
                  checked={action.pinned === true}
                  onChange={(event) => {
                    quiz.actions.setPinned(
                      action.id,
                      event.currentTarget.checked,
                    );
                    // Pinned order lives in the registry, so ask for a paint.
                    quiz.configure({});
                  }}
                />
                {t("pin", { label: action.label })}
              </label>
            ))}
          </fieldset>
        )}

        <fieldset class="pq-settings-group">
          <legend>{t("download")}</legend>
          <div class="pq-settings-row">
            <button type="button" onClick={() => downloadQuizJson(quiz)}>
              {t("saveJson")}
            </button>
            <button type="button" onClick={() => downloadQuizHandout(quiz)}>
              {t("saveHandout")}
            </button>
          </div>
          <p class="pq-settings-note">{t("downloadNote")}</p>
        </fieldset>
      </div>
    </details>
  );
}
