/**
 * One settings panel, reachable from every screen.
 *
 * Order, rounds, colour mode, sound, pinned buttons and every export. Everything
 * here is also a `QuizConfig` key, so code can do the same thing without a click.
 */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import {
  AnswerLabels,
  ThemeMode,
  type LayoutMode,
} from "../../../core/quiz/types";
import type { Quiz } from "../../../core/session/quiz";
import {
  copyQuizJson,
  copyQuizTrivia,
  downloadQuizHandout,
  downloadQuizJson,
  downloadQuizTrivia,
  printQuiz,
} from "../../../platform/browser/exports";
import {
  setThemeMode,
  storedThemeMode,
} from "../../../platform/browser/colorMode";
import {
  setLayoutMode,
  storedLayoutMode,
} from "../../../platform/browser/storage/layoutMode";
import { useT } from "../i18n";
import { pinnedActions, TOOLBAR_ACTIONS } from "../toolbar";

function includedRounds(quiz: Quiz): Record<string, boolean> {
  const hidden = new Set(
    (quiz.config.filterSections ?? []).map((entry) => entry.toLowerCase()),
  );
  const out: Record<string, boolean> = {};
  for (const round of quiz.rounds()) {
    out[round.id] =
      !hidden.has(round.name.toLowerCase()) &&
      !hidden.has(round.id.toLowerCase());
  }
  return out;
}

function CopyNote({
  what,
}: {
  readonly what: string | null;
}): JSX.Element | null {
  const t = useT();
  return what === null ? null : (
    <p class="pq-settings-note" role="status">
      {t("copiedWhat", { what })}
    </p>
  );
}

export function SettingsPanel({
  quiz,
  seed,
  onClose,
}: {
  readonly quiz: Quiz;
  readonly seed: string;
  readonly onClose?: () => void;
}): JSX.Element {
  const t = useT();
  const [draftSeed, setDraftSeed] = useState(seed);
  const [questions, setQuestions] = useState(
    quiz.config.shuffleQuestions ?? false,
  );
  const [rounds, setRounds] = useState(quiz.config.shuffleRounds ?? false);
  const [sound, setSound] = useState(quiz.config.timerSound === true);
  const [mode, setMode] = useState<ThemeMode>(
    storedThemeMode() ?? quiz.config.themeMode ?? ThemeMode.Auto,
  );
  const [layout, setLayout] = useState<LayoutMode>(
    storedLayoutMode() ??
      (quiz.config.layoutMode === "inline" ? "inline" : "viewport"),
  );
  const [included, setIncluded] = useState(() => includedRounds(quiz));
  const [labels, setLabels] = useState<AnswerLabels>(
    quiz.config.answerLabels ?? AnswerLabels.Letters,
  );
  const [icons, setIcons] = useState(quiz.config.metadataIcons !== false);
  const [pinned, setPinned] = useState<readonly string[]>(() => [
    ...pinnedActions(quiz),
  ]);
  const [copied, setCopied] = useState<string | null>(null);
  const actions = quiz.actions.list();
  const trivia = quiz.sourceText();
  const available = quiz.rounds();
  const empty =
    available.length > 0 &&
    available.every((round) => included[round.id] !== true);

  const toggleRound = (id: string, checked: boolean): void => {
    const next = { ...included, [id]: checked };
    setIncluded(next);
    quiz.configure({
      filterSections: available
        .filter((round) => next[round.id] !== true)
        .map((round) => round.name),
    });
  };

  return (
    <>
      <fieldset class="pq-settings-group">
        <legend>{t("settingsOrder")}</legend>
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
      </fieldset>

      {available.length === 0 ? null : (
        <fieldset class="pq-settings-group">
          <legend>{t("settingsRounds")}</legend>
          {available.map((round) => (
            <label class="pq-check" key={round.id}>
              <input
                type="checkbox"
                checked={included[round.id] !== false}
                onChange={(event) =>
                  toggleRound(round.id, event.currentTarget.checked)
                }
              />
              {round.name}
            </label>
          ))}
          <p class="pq-settings-note">{t("settingsRoundsNote")}</p>
          {empty ? (
            <p class="pq-settings-note pq-warning" role="status">
              {t("emptyQuiz")}
            </p>
          ) : null}
        </fieldset>
      )}

      <fieldset class="pq-settings-group">
        <legend>{t("settingsAppearance")}</legend>
        <label class="pq-field">
          <span class="pq-field-label">{t("settingsLayout")}</span>
          <select
            class="pq-input"
            value={layout}
            onChange={(event) => {
              const next = event.currentTarget.value as LayoutMode;
              setLayout(next);
              setLayoutMode(next);
              quiz.configure({ layoutMode: next });
            }}
          >
            <option value="viewport">{t("layoutViewport")}</option>
            <option value="inline">{t("layoutInline")}</option>
          </select>
        </label>
        <p class="pq-settings-note">{t("settingsLayoutNote")}</p>
        <label class="pq-field">
          <span class="pq-field-label">{t("themeMode")}</span>
          <select
            class="pq-input"
            value={mode}
            onChange={(event) => {
              const next = event.currentTarget.value as ThemeMode;
              setMode(next);
              setThemeMode(next);
              quiz.configure({ themeMode: next });
            }}
          >
            <option value={ThemeMode.Auto}>{t("themeAuto")}</option>
            <option value={ThemeMode.Light}>{t("themeLight")}</option>
            <option value={ThemeMode.Dark}>{t("themeDark")}</option>
            <option value={ThemeMode.HighContrast}>{t("themeContrast")}</option>
          </select>
        </label>
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
        <label class="pq-field">
          <span class="pq-field-label">{t("answerLabels")}</span>
          <select
            class="pq-input"
            value={labels}
            onChange={(event) => {
              const next = event.currentTarget.value as AnswerLabels;
              setLabels(next);
              quiz.configure({ answerLabels: next });
            }}
          >
            <option value={AnswerLabels.Letters}>{t("answerLetters")}</option>
            <option value={AnswerLabels.Lowercase}>
              {t("answerLowercase")}
            </option>
            <option value={AnswerLabels.Numbers}>{t("answerNumbers")}</option>
            <option value={AnswerLabels.Roman}>{t("answerRoman")}</option>
            <option value={AnswerLabels.None}>{t("answerNone")}</option>
          </select>
        </label>
        <label class="pq-check">
          <input
            type="checkbox"
            checked={icons}
            onChange={(event) => {
              setIcons(event.currentTarget.checked);
              quiz.configure({ metadataIcons: event.currentTarget.checked });
            }}
          />
          {t("metadataIcons")}
        </label>
      </fieldset>

      <fieldset class="pq-settings-group">
        <legend>{t("toolbar")}</legend>
        {TOOLBAR_ACTIONS.map((action) => {
          const checked = pinned.includes(action.id);
          return (
            <label class="pq-check" key={action.id}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  const next = event.currentTarget.checked
                    ? [...pinned, action.id]
                    : pinned.filter((id) => id !== action.id);
                  setPinned(next);
                  quiz.configure({ toolbar: next });
                }}
              />
              {t(checked ? "unpin" : "pin", {
                label: t(action.labelKey),
              })}
            </label>
          );
        })}
        {actions.length === 0 ? null : (
          <>
            <p class="pq-settings-note">{t("hostActions")}</p>
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
          </>
        )}
      </fieldset>

      <fieldset class="pq-settings-group">
        <legend>{t("settingsExport")}</legend>
        <div class="pq-settings-row">
          <button type="button" onClick={() => downloadQuizJson(quiz)}>
            {t("saveJson")}
          </button>
          <button
            type="button"
            onClick={() => {
              void copyQuizJson(quiz).then((ok) =>
                setCopied(ok ? t("jsonWord") : null),
              );
            }}
          >
            {t("copyJson")}
          </button>
          <button type="button" onClick={() => downloadQuizHandout(quiz)}>
            {t("saveHandout")}
          </button>
          <button
            type="button"
            disabled={trivia === null}
            onClick={() => downloadQuizTrivia(quiz)}
          >
            {t("saveTrivia")}
          </button>
          <button
            type="button"
            disabled={trivia === null}
            onClick={() => {
              void copyQuizTrivia(quiz).then((ok) =>
                setCopied(ok ? t("triviaWord") : null),
              );
            }}
          >
            {t("copyTrivia")}
          </button>
        </div>
        <p class="pq-settings-note">{t("downloadNote")}</p>

        <div class="pq-settings-row">
          <button type="button" onClick={() => printQuiz("questions")}>
            {t("printQuestions")}
          </button>
          <button type="button" onClick={() => printQuiz("answers")}>
            {t("printAnswers")}
          </button>
          <button type="button" onClick={() => printQuiz("sheet")}>
            {t("printAnswerSheet")}
          </button>
          <button type="button" onClick={() => printQuiz("form")}>
            {t("printAnswerForm")}
          </button>
          <button type="button" onClick={() => printQuiz("media")}>
            {t("printMediaOnly")}
          </button>
        </div>
        <CopyNote what={copied} />
      </fieldset>

      {onClose === undefined ? null : (
        <div class="pq-settings-row">
          <button type="button" class="pq-primary" onClick={onClose}>
            {t("save")}
          </button>
        </div>
      )}
    </>
  );
}

/** The panel as a dialog over whatever screen is showing. */
export function SettingsOverlay({
  quiz,
  seed,
  onClose,
}: {
  readonly quiz: Quiz;
  readonly seed: string;
  readonly onClose: () => void;
}): JSX.Element {
  const t = useT();

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    // Capture, so Escape closes the panel instead of jumping to the end screen.
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [onClose]);

  return (
    <div
      class="pq-settings-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        class="pq-settings pq-settings-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t("settingsTitle")}
      >
        <header class="pq-settings-head">
          <h2 class="pq-settings-title">{t("settingsTitle")}</h2>
          <button type="button" class="pq-settings-close" onClick={onClose}>
            {t("close")}
          </button>
        </header>
        <div class="pq-settings-body">
          <SettingsPanel quiz={quiz} seed={seed} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
