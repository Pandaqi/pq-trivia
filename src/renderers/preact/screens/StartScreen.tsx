/** Start screen: the slide you put up while people settle in. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { Quiz } from "../../../core/session/quiz";
import { PlayMode } from "../../../core/session/session";
import {
  findQuizFiles,
  type QuizSourceFile,
} from "../../../platform/browser/source";
import { setTheme, themeFromFiles } from "../../../platform/browser/theme";
import type { StartViewModel } from "../../../core/session/viewModel";
import { Actions } from "../components/Actions";
import { Inline } from "../components/Inline";
import { Media } from "../components/Media";
import { Problems } from "../components/Problems";
import { useT } from "../i18n";
import { showsButton } from "../toolbar";

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

/** Probed once per page. A second look at the same folder is a second of silence. */
let onlineFiles: readonly QuizSourceFile[] | null = null;

async function findOnlineFiles(quiz: Quiz): Promise<readonly QuizSourceFile[]> {
  if (onlineFiles !== null) {
    return onlineFiles;
  }
  const files = await findQuizFiles({
    base: quiz.config.url ?? "",
    folder: quiz.config.subFolderQuestions ?? "",
    ...(quiz.config.filenames === undefined
      ? {}
      : { filenames: quiz.config.filenames }),
    ...(quiz.config.fileExtensions === undefined
      ? {}
      : { extensions: quiz.config.fileExtensions }),
    ...(quiz.config.filenamePattern === undefined
      ? {}
      : { pattern: quiz.config.filenamePattern }),
  });
  onlineFiles = files;
  return files;
}

/**
 * V2's load screen, minus the upload: a prepared quiz in the page, and files
 * found next to it on a server. Both sit above the theme folder button.
 */
function LoadQuestions({ quiz }: { readonly quiz: Quiz }): JSX.Element | null {
  const t = useT();
  const [online, setOnline] = useState<readonly QuizSourceFile[] | null>(null);
  const builtin = quiz.config.builtin;

  useEffect(() => {
    let cancelled = false;
    if (
      typeof location === "undefined" ||
      !/^https?:/i.test(location.protocol)
    ) {
      return;
    }
    void findOnlineFiles(quiz)
      .then((files) => {
        if (!cancelled) {
          setOnline(files);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [quiz]);

  const hasBuiltin = builtin !== undefined && builtin !== null;
  const hasOnline = online !== null && online.length > 0;
  if (!hasBuiltin && !hasOnline) {
    return null;
  }

  return (
    <section class="pq-load-questions" aria-label={t("loadHeading")}>
      {hasBuiltin ? (
        <button
          type="button"
          class="pq-primary"
          onClick={() => void quiz.load({ type: "inline", data: builtin })}
        >
          {t("loadBuiltin")}
        </button>
      ) : null}
      {hasOnline ? (
        <button
          type="button"
          onClick={() =>
            void quiz.load({
              type: "files",
              files: online ?? [],
            })
          }
        >
          {t("loadOnline", { count: online?.length ?? 0 })}
        </button>
      ) : null}
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

  const begin = (mode: PlayMode, interactive: boolean): void => {
    quiz.setMode(mode);
    quiz.setInteractive(interactive);
    quiz.next();
  };

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
          <p class="pq-description">
            <Inline nodes={screen.descriptionNodes} />
          </p>
        )}
        {screen.author.length === 0 ? null : (
          <p class="pq-byline">{t("by", { author: screen.author })}</p>
        )}
        {quiz.config.dateCreation === undefined ? null : (
          <p class="pq-intro pq-date">{t("startDate", { year: date ?? "" })}</p>
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

      <div class="pq-start-actions">
        {showsButton(screen.buttons, "play") ? (
          <button
            type="button"
            class="pq-primary"
            onClick={() => begin(PlayMode.Questions, false)}
          >
            {t("playQuestions")}
          </button>
        ) : null}
        {showsButton(screen.buttons, "answers") ? (
          <button type="button" onClick={() => begin(PlayMode.Answers, false)}>
            {t("playAnswers")}
          </button>
        ) : null}
        {quiz.config.allowInput !== false &&
        showsButton(screen.buttons, "interactive") ? (
          <button type="button" onClick={() => begin(PlayMode.Questions, true)}>
            {t("playInteractive")}
          </button>
        ) : null}
      </div>

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

      <LoadQuestions quiz={quiz} />
      <ThemePicker quiz={quiz} />

      {quiz.config.hideErrors === true ? null : (
        <Problems diagnostics={quiz.diagnostics()} />
      )}

      <CustomSettings quiz={quiz} />

      {quiz.config.disableUI === true ? null : (
        <p class="pq-keys">
          {t("keys")} <kbd>→</kbd> {t("keyNext")}, <kbd>←</kbd> {t("keyBack")},{" "}
          <kbd>r</kbd> {t("keyReveal")}, <kbd>h</kbd> {t("keyHint")}.
        </p>
      )}

      <footer class="pq-toolbar">
        <Actions quiz={quiz} />
      </footer>
    </main>
  );
}
