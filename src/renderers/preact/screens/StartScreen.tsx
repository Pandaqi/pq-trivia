/** Start screen: the slide you put up while people settle in. */

import type { JSX } from "preact";
import { useState } from "preact/hooks";
import type { Quiz } from "../../../core/session/quiz";
import {
  setTheme,
  themeFromFiles,
} from "../../../platform/browser/theme";
import type { StartViewModel } from "../../../core/session/viewModel";
import { Actions } from "../components/Actions";
import { Inline } from "../components/Inline";
import { Media } from "../components/Media";
import { Problems } from "../components/Problems";
import { SettingsPanel } from "./SettingsPanel";
import { useT } from "../i18n";
import { showsAction } from "../toolbar";

function allowed(buttons: readonly string[], id: string): boolean {
  return buttons.length === 0 || buttons.includes(id);
}

/** Pick a theme folder from disk, mid-start-screen. Opt-in per quiz. */
function ThemePicker({ quiz }: { readonly quiz: Quiz }): JSX.Element | null {
  const t = useT();
  const [note, setNote] = useState<string | null>(null);
  if (quiz.config.themeUpload !== true) {
    return null;
  }
  const load = async (files: readonly File[]): Promise<void> => {
    if (files.length === 0) {
      return;
    }
    try {
      const theme = await themeFromFiles(files);
      setTheme(theme);
      setNote(t("themeLoaded", { label: theme.settings.label }));
    } catch (error) {
      setNote(
        t("themeError", {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };
  return (
    <section class="pq-theme-picker" aria-label={t("themeLoad")}>
      <label class="pq-link">
        {t("themeLoad")}
        <input
          type="file"
          multiple
          hidden
          {...({ webkitdirectory: "" } as Record<string, string>)}
          onChange={(event) => {
            const input = event.currentTarget;
            void load(Array.from(input.files ?? [])).finally(() => {
              input.value = "";
            });
          }}
        />
      </label>
      {note === null ? null : (
        <p class="pq-theme-note" role="status">
          {note}
        </p>
      )}
    </section>
  );
}

function LanguagePicker({ quiz }: { readonly quiz: Quiz }): JSX.Element | null {
  const t = useT();
  const languages = quiz.languages();
  if (languages.length < 2) {
    return null;
  }
  const current = quiz.state.language ?? languages[0] ?? "";
  return (
    <label class="pq-field pq-language">
      <span class="pq-field-label">{t("language")}</span>
      <select
        class="pq-input"
        value={current}
        onChange={(event) => quiz.setLanguage(event.currentTarget.value)}
      >
        {languages.map((language) => (
          <option key={language} value={language}>
            {language}
          </option>
        ))}
      </select>
    </label>
  );
}

function CustomSettings({ quiz }: { readonly quiz: Quiz }): JSX.Element | null {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const settings = quiz.config.settings ?? [];
  if (settings.length === 0) {
    return null;
  }
  return (
    <fieldset class="pq-settings-group pq-custom-settings">
      {settings.map((setting) => {
        const value = values[setting.id] ?? setting.value ?? "";
        if (setting.type === "button") {
          return (
            <button
              key={setting.id}
              type="button"
              onClick={() => setting.onChange?.(quiz, value)}
            >
              {setting.label}
            </button>
          );
        }
        if (setting.type === "toggle") {
          return (
            <label class="pq-check" key={setting.id}>
              <input
                type="checkbox"
                checked={value === true}
                onChange={(event) => {
                  const next = event.currentTarget.checked;
                  setValues((current) => ({ ...current, [setting.id]: next }));
                  setting.onChange?.(quiz, next);
                }}
              />
              {setting.label}
            </label>
          );
        }
        return (
          <label class="pq-field" key={setting.id}>
            <span class="pq-field-label">{setting.label}</span>
            <input
              class="pq-input"
              type="text"
              value={String(value)}
              placeholder={setting.placeholder}
              onInput={(event) => {
                const next = event.currentTarget.value;
                setValues((current) => ({ ...current, [setting.id]: next }));
                setting.onChange?.(quiz, next);
              }}
            />
          </label>
        );
      })}
    </fieldset>
  );
}

export function StartScreen({
  quiz,
  screen,
}: {
  readonly quiz: Quiz;
  readonly screen: StartViewModel;
}): JSX.Element {
  const t = useT();
  const date = quiz.config.dateCreation;
  return (
    <main class="pq-screen pq-screen-start">
      {quiz.config.bannerImage === undefined ? null : (
        <img
          class="pq-banner"
          src={quiz.config.bannerImage}
          alt=""
          decoding="async"
        />
      )}
      <header class="pq-header">
        <p class="pq-kicker">{t("startKicker")}</p>
        <h1 class="pq-title" data-pq-heading tabIndex={-1}>
          {screen.title || t("untitled")}
        </h1>
        {screen.description === null ? null : (
          <p class="pq-description">{screen.description}</p>
        )}
        {screen.author.length === 0 ? null : (
          <p class="pq-byline">{t("by", { author: screen.author })}</p>
        )}
        {quiz.config.dateCreation === undefined ? null : (
          <p class="pq-intro pq-date">
            {t("startDate", { year: date ?? "" })}
          </p>
        )}
        {screen.comments.length === 0 ? null : (
          <div class="pq-intro">
            <Inline nodes={screen.comments} />
          </div>
        )}
      </header>

      {screen.media.length === 0 ? null : (
        <div class="pq-media-list">
          {screen.media.map((item) => (
            <Media key={item.path} item={item} />
          ))}
        </div>
      )}

      <dl class="pq-stats">
        <div>
          <dt>{t("questions")}</dt>
          <dd>{screen.questionCount}</dd>
        </div>
        <div>
          <dt>{t("rounds")}</dt>
          <dd>{screen.roundCount}</dd>
        </div>
        <div>
          <dt>{t("seed")}</dt>
          <dd>{screen.seed.length === 0 ? t("none") : screen.seed}</dd>
        </div>
      </dl>

      <LanguagePicker quiz={quiz} />

      {screen.resume === null ? null : (
        <section class="pq-resume" aria-label={t("resumeTitle")}>
          <h2 class="pq-resume-title">{t("resumeTitle")}</h2>
          <p class="pq-resume-note">
            {t("resumeNote", {
              answered: screen.resume.answered,
              total: screen.resume.total,
            })}
          </p>
          <div class="pq-resume-actions">
            <button
              type="button"
              class="pq-primary"
              onClick={() => quiz.resume()}
            >
              {t("resume")}
            </button>
            <button type="button" onClick={() => void quiz.clearAttempt()}>
              {t("startOver")}
            </button>
          </div>
        </section>
      )}

      <ThemePicker quiz={quiz} />

      {quiz.config.hideErrors === true ? null : (
        <Problems diagnostics={quiz.diagnostics()} />
      )}

      {allowed(screen.buttons, "settings") &&
      quiz.config.disableUI !== true &&
      quiz.config.hideDefaultSettings !== true ? (
        <SettingsPanel quiz={quiz} seed={screen.seed} />
      ) : null}

      <CustomSettings quiz={quiz} />

      {quiz.config.disableUI === true ? null : (
        <p class="pq-keys">
          {t("keys")} <kbd>→</kbd> {t("keyNext")}, <kbd>←</kbd>{" "}
          {t("keyBack")}, <kbd>r</kbd> {t("keyReveal")}, <kbd>h</kbd>{" "}
          {t("keyHint")}.
        </p>
      )}

      <footer class="pq-toolbar">
        <Actions quiz={quiz} />
        {allowed(screen.buttons, "play") && showsAction(quiz, "next") ? (
          <button type="button" class="pq-primary" onClick={() => quiz.next()}>
            {t("play")}
          </button>
        ) : null}
      </footer>
    </main>
  );
}
