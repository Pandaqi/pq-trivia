/**
 * Global settings a `.trivia` file can set for itself.
 *
 * Every row is one header attribute and one `QuizConfig` key. Write it under
 * the top header, next to `Title` and `Seed`:
 *
 *   ShuffleQuestions => true
 *   MediaFormats => jpg | png | webp
 *   FilterSections => Round two | Round five
 *
 * The parser only splits `|` for attributes it knows as lists, so this module
 * splits the values itself. Every name is normalised, which means `SubFolderMedia`,
 * `sub_folder_media` and `subfoldermedia` are the same key.
 */

import type { AstAttribute } from "./ast";

export type ConfigValueKind = "text" | "list" | "number" | "boolean" | "pairs";

export interface ConfigHeaderRow {
  readonly attribute: string;
  readonly key: string;
  readonly kind: ConfigValueKind;
}

/** A setting that has no honest text form, with the reason it stays in code. */
export interface CodeOnlyConfigRow {
  readonly key: string;
  readonly why: string;
}

export const CONFIG_HEADER_ROWS = [
  // Order.
  { attribute: "ShuffleQuestions", key: "shuffleQuestions", kind: "boolean" },
  { attribute: "ShuffleRounds", key: "shuffleRounds", kind: "boolean" },
  { attribute: "KeepQuestionOrder", key: "keepQuestionOrder", kind: "boolean" },
  { attribute: "KeepSectionOrder", key: "keepSectionOrder", kind: "boolean" },
  { attribute: "KeepAnswerOrder", key: "keepAnswerOrder", kind: "boolean" },
  { attribute: "RandomizeMedia", key: "randomizeMedia", kind: "boolean" },

  // Which questions make it into the quiz.
  { attribute: "Include", key: "include", kind: "pairs" },
  { attribute: "Exclude", key: "exclude", kind: "pairs" },
  { attribute: "GroupBy", key: "groupBy", kind: "text" },
  {
    attribute: "QuestionTypesAllowed",
    key: "questionTypesAllowed",
    kind: "list",
  },
  { attribute: "FilterSections", key: "filterSections", kind: "list" },
  { attribute: "ExcludeSections", key: "excludeSections", kind: "boolean" },
  { attribute: "MinAnswers", key: "minAnswers", kind: "number" },
  { attribute: "MaxAnswers", key: "maxAnswers", kind: "number" },

  // Scores and properties.
  { attribute: "MinScore", key: "minScore", kind: "number" },
  { attribute: "MaxScore", key: "maxScore", kind: "number" },
  { attribute: "DefaultScore", key: "defaultScore", kind: "number" },
  { attribute: "HideScore", key: "hideScore", kind: "boolean" },
  {
    attribute: "HideScoreOnAnswers",
    key: "hideScoreOnAnswers",
    kind: "boolean",
  },
  { attribute: "DefaultAuthor", key: "defaultAuthor", kind: "text" },
  { attribute: "PossibleAuthors", key: "possibleAuthors", kind: "list" },
  { attribute: "HideAuthor", key: "hideAuthor", kind: "boolean" },
  { attribute: "DefaultCategory", key: "defaultCategory", kind: "text" },
  { attribute: "PossibleCategories", key: "possibleCategories", kind: "list" },
  { attribute: "HideCategory", key: "hideCategory", kind: "boolean" },
  {
    attribute: "ShowPropertiesWithoutDiversity",
    key: "showPropertiesWithoutDiversity",
    kind: "boolean",
  },

  // Shape of the play.
  {
    attribute: "AddMissingSectionScreens",
    key: "addMissingSectionScreens",
    kind: "boolean",
  },
  {
    attribute: "AddSecretThemeQuestions",
    key: "addSecretThemeQuestions",
    kind: "boolean",
  },
  {
    attribute: "HideSecretThemeMessage",
    key: "hideSecretThemeMessage",
    kind: "boolean",
  },
  {
    attribute: "DisableTextFormatting",
    key: "disableTextFormatting",
    kind: "boolean",
  },
  {
    attribute: "SyncPropertiesWithTranslations",
    key: "syncPropertiesWithTranslations",
    kind: "boolean",
  },
  { attribute: "LanguageDefault", key: "languageDefault", kind: "text" },

  // Staged reveals, for a whole quiz at once.
  { attribute: "DefaultSteps", key: "defaultSteps", kind: "list" },
  {
    attribute: "DefaultStepTransition",
    key: "defaultStepTransition",
    kind: "text",
  },

  // Interface switches.
  { attribute: "HideErrors", key: "hideErrors", kind: "boolean" },
  { attribute: "HideDefaultStyles", key: "hideDefaultStyles", kind: "boolean" },
  {
    attribute: "HideDefaultSettings",
    key: "hideDefaultSettings",
    kind: "boolean",
  },
  { attribute: "ThemeMode", key: "themeMode", kind: "text" },
  { attribute: "LayoutMode", key: "layoutMode", kind: "text" },
  { attribute: "ThemeDisabled", key: "themeDisabled", kind: "boolean" },
  { attribute: "ThemeUpload", key: "themeUpload", kind: "boolean" },
  {
    attribute: "PrintAnswerLines",
    key: "printAnswerLines",
    kind: "boolean",
  },
  { attribute: "PrintTypeHints", key: "printTypeHints", kind: "boolean" },
  { attribute: "EnableSafety", key: "enableSafety", kind: "boolean" },
  { attribute: "EnableMouse", key: "enableMouse", kind: "boolean" },
  { attribute: "DisableKeys", key: "disableKeys", kind: "boolean" },
  { attribute: "DisableUI", key: "disableUI", kind: "boolean" },
  { attribute: "DisableTouch", key: "disableTouch", kind: "boolean" },
  { attribute: "HotkeysForbidden", key: "hotkeysForbidden", kind: "list" },
  { attribute: "Toolbar", key: "toolbar", kind: "list" },
  { attribute: "AnswerLabels", key: "answerLabels", kind: "text" },
  { attribute: "MetadataIcons", key: "metadataIcons", kind: "boolean" },
  {
    attribute: "QuestionTypeHints",
    key: "questionTypeHints",
    kind: "boolean",
  },
  { attribute: "QuestionNumbers", key: "questionNumbers", kind: "boolean" },
  { attribute: "AllowInput", key: "allowInput", kind: "boolean" },
  { attribute: "CodeHighlight", key: "codeHighlight", kind: "boolean" },
  { attribute: "AllowScripts", key: "allowScripts", kind: "boolean" },

  // Timers.
  { attribute: "DateCreation", key: "dateCreation", kind: "number" },
  { attribute: "Hotkeys", key: "hotkeys", kind: "pairs" },
  { attribute: "HideTimerGlobal", key: "hideTimerGlobal", kind: "boolean" },
  { attribute: "HideTimerQuestion", key: "hideTimerQuestion", kind: "boolean" },
  {
    attribute: "AllowTimerOnSections",
    key: "allowTimerOnSections",
    kind: "boolean",
  },
  { attribute: "TimerStrategy", key: "timerStrategy", kind: "text" },
  { attribute: "TimerSound", key: "timerSound", kind: "boolean" },
  { attribute: "DefaultTimer", key: "defaultTimer", kind: "number" },

  // Media and files.
  { attribute: "MediaAutoPlay", key: "mediaAutoPlay", kind: "boolean" },
  {
    attribute: "LoadExternalMediaAsIframe",
    key: "loadExternalMediaAsIframe",
    kind: "boolean",
  },
  { attribute: "Url", key: "url", kind: "text" },
  { attribute: "LinkPrefixes", key: "linkPrefixes", kind: "list" },
  { attribute: "MediaFormats", key: "mediaFormats", kind: "list" },
  { attribute: "SubFolderMedia", key: "subFolderMedia", kind: "text" },
  { attribute: "SubFolderTheme", key: "subFolderTheme", kind: "text" },
  { attribute: "SubFolderQuestions", key: "subFolderQuestions", kind: "text" },
  { attribute: "FilenamePattern", key: "filenamePattern", kind: "text" },
  { attribute: "Filenames", key: "filenames", kind: "list" },
  { attribute: "FileExtensions", key: "fileExtensions", kind: "list" },
  { attribute: "BannerImage", key: "bannerImage", kind: "text" },
  { attribute: "Icon", key: "icon", kind: "text" },

  // Play policy.
  { attribute: "Restricted", key: "restricted", kind: "boolean" },
  { attribute: "RevealMode", key: "revealMode", kind: "text" },
  { attribute: "Policy", key: "policy", kind: "text" },
  { attribute: "Grading", key: "grading", kind: "text" },
] as const satisfies readonly ConfigHeaderRow[];

/**
 * Settings a file cannot reasonably write, documented instead of silently
 * missing. The compile-time check in `quiz/types.ts` makes this list total.
 */
export const CONFIG_CODE_ONLY = [
  {
    key: "answersKey",
    why: "Opens encrypted files. A secret belongs in the host, never in a shared quiz file.",
  },
  {
    key: "builtin",
    why: 'Prepared quiz data, not text. Use `load({ type: "inline", data })`.',
  },
  {
    key: "forbidInlineLists",
    why: "A parser option. The header is read while parsing, so it would arrive too late for its own file.",
  },
  {
    key: "id",
    why: "The player mounts into this element. A shared quiz file should not pick its own place on the page.",
  },
  { key: "language", why: "The `Language` header sets the current language." },
  {
    key: "languages",
    why: "The `Languages` header lists what the files carry.",
  },
  { key: "seed", why: "The `Seed` header sets the plan seed." },
  {
    key: "settings",
    why: "Host controls are functions. Add them with `settings` in code.",
  },
  {
    key: "symbols",
    why: "A parser option. The file must be read before its own symbols are known.",
  },
  {
    key: "theme",
    why: "The `Theme` header names a theme folder or stylesheet.",
  },
  { key: "title", why: "The `Title` (or `Quiz`) header sets it." },
  {
    key: "translations",
    why: "Nested language tables. Pass them with `translations` in code.",
  },
] as const satisfies readonly CodeOnlyConfigRow[];

export const CONFIG_HEADER_NAMES: readonly string[] = CONFIG_HEADER_ROWS.map(
  (row) => row.attribute,
);

function normalise(name: string): string {
  return name.replace(/[\s_-]/g, "").toLowerCase();
}

const BY_NAME = new Map<string, ConfigHeaderRow>();
for (const row of CONFIG_HEADER_ROWS) {
  BY_NAME.set(normalise(row.attribute), row);
}

function truthy(value: string): boolean {
  const text = value.trim().toLowerCase();
  return text === "true" || text === "yes" || text === "on" || text === "1";
}

function splitList(values: readonly string[]): string[] {
  return values
    .flatMap((value) => value.split("|"))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** `Author = Pandaqi | Type = Choice` becomes `{ author: "Pandaqi", ... }`. */
function pairs(values: readonly string[]): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const entry of splitList(values)) {
    const equals = entry.indexOf("=");
    if (equals <= 0) {
      continue;
    }
    const key = entry.slice(0, equals).trim().toLowerCase();
    const value = entry.slice(equals + 1).trim();
    if (key.length === 0 || value.length === 0) {
      continue;
    }
    const existing = out[key];
    if (existing === undefined) {
      out[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      out[key] = [existing, value];
    }
  }
  return out;
}

function valuesOf(header: readonly AstAttribute[], key: string): string[] {
  const out: string[] = [];
  for (const attribute of header) {
    if (attribute.key === key) {
      out.push(...attribute.values);
    }
  }
  return out.filter((value) => value.trim().length > 0);
}

/** Header attributes that name a global setting, as a plain config object. */
export function parseHeaderConfig(
  header: readonly AstAttribute[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const row of CONFIG_HEADER_ROWS) {
    const values = valuesOf(header, row.attribute);
    if (values.length === 0) {
      continue;
    }
    switch (row.kind) {
      case "boolean":
        out[row.key] = truthy(values[0] ?? "");
        break;
      case "number": {
        const number = Number(values[0]);
        if (Number.isFinite(number)) {
          out[row.key] = number;
        }
        break;
      }
      case "list":
        out[row.key] = splitList(values);
        break;
      case "pairs": {
        const map = pairs(values);
        if (Object.keys(map).length > 0) {
          out[row.key] = map;
        }
        break;
      }
      case "text":
      default:
        out[row.key] = (values[0] ?? "").trim();
        break;
    }
  }
  return out;
}
