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
import { coerceDuration } from "../values/coerce";

/** How a header value is read. The table below says which each one is. */
export enum ConfigValueKind {
  Text = "text",
  List = "list",
  Number = "number",
  Boolean = "boolean",
  Duration = "duration",
  Pairs = "pairs",
}

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

/** One header row, short enough to read in the table. */
const row = (
  attribute: string,
  key: string,
  kind: ConfigValueKind,
): ConfigHeaderRow => ({ attribute, key, kind });

export const CONFIG_HEADER_ROWS: readonly ConfigHeaderRow[] = [
  // Order.
  row("ShuffleQuestions", "shuffleQuestions", ConfigValueKind.Boolean),
  row("ShuffleRounds", "shuffleRounds", ConfigValueKind.Boolean),
  row("KeepQuestionOrder", "keepQuestionOrder", ConfigValueKind.Boolean),
  row("KeepSectionOrder", "keepSectionOrder", ConfigValueKind.Boolean),
  row("KeepAnswerOrder", "keepAnswerOrder", ConfigValueKind.Boolean),
  row("RandomizeMedia", "randomizeMedia", ConfigValueKind.Boolean),

  // Which questions make it into the quiz.
  row("Include", "include", ConfigValueKind.Pairs),
  row("Exclude", "exclude", ConfigValueKind.Pairs),
  row("GroupBy", "groupBy", ConfigValueKind.Text),
  row("QuestionTypesAllowed", "questionTypesAllowed", ConfigValueKind.List),
  row("FilterSections", "filterSections", ConfigValueKind.List),
  row("ExcludeSections", "excludeSections", ConfigValueKind.Boolean),
  row("MinAnswers", "minAnswers", ConfigValueKind.Number),
  row("MaxAnswers", "maxAnswers", ConfigValueKind.Number),

  // Scores and properties.
  row("MinScore", "minScore", ConfigValueKind.Number),
  row("MaxScore", "maxScore", ConfigValueKind.Number),
  row("DefaultScore", "defaultScore", ConfigValueKind.Number),
  row("HideScore", "hideScore", ConfigValueKind.Boolean),
  row("HideScoreOnAnswers", "hideScoreOnAnswers", ConfigValueKind.Boolean),
  row("DefaultAuthor", "defaultAuthor", ConfigValueKind.Text),
  row("PossibleAuthors", "possibleAuthors", ConfigValueKind.List),
  row("HideAuthor", "hideAuthor", ConfigValueKind.Boolean),
  row("DefaultCategory", "defaultCategory", ConfigValueKind.Text),
  row("PossibleCategories", "possibleCategories", ConfigValueKind.List),
  row("HideCategory", "hideCategory", ConfigValueKind.Boolean),
  row(
    "ShowPropertiesWithoutDiversity",
    "showPropertiesWithoutDiversity",
    ConfigValueKind.Boolean,
  ),

  // Shape of the play.
  row(
    "AddMissingSectionScreens",
    "addMissingSectionScreens",
    ConfigValueKind.Boolean,
  ),
  row(
    "AddSecretThemeQuestions",
    "addSecretThemeQuestions",
    ConfigValueKind.Boolean,
  ),
  row(
    "HideSecretThemeMessage",
    "hideSecretThemeMessage",
    ConfigValueKind.Boolean,
  ),
  row(
    "DisableTextFormatting",
    "disableTextFormatting",
    ConfigValueKind.Boolean,
  ),
  row(
    "SyncPropertiesWithTranslations",
    "syncPropertiesWithTranslations",
    ConfigValueKind.Boolean,
  ),
  row("LanguageDefault", "languageDefault", ConfigValueKind.Text),

  // Staged reveals, for a whole quiz at once.
  row("DefaultSteps", "defaultSteps", ConfigValueKind.List),
  row("DefaultStepTransition", "defaultStepTransition", ConfigValueKind.Text),

  // Interface switches.
  row("HideErrors", "hideErrors", ConfigValueKind.Boolean),
  row("HideDefaultStyles", "hideDefaultStyles", ConfigValueKind.Boolean),
  row("HideDefaultSettings", "hideDefaultSettings", ConfigValueKind.Boolean),
  row("ThemeMode", "themeMode", ConfigValueKind.Text),
  row("LayoutMode", "layoutMode", ConfigValueKind.Text),
  row("ThemeDisabled", "themeDisabled", ConfigValueKind.Boolean),
  row("ThemeUpload", "themeUpload", ConfigValueKind.Boolean),
  row("PrintAnswerLines", "printAnswerLines", ConfigValueKind.Boolean),
  row("PrintTypeHints", "printTypeHints", ConfigValueKind.Boolean),
  row("EnableSafety", "enableSafety", ConfigValueKind.Boolean),
  row("EnableMouse", "enableMouse", ConfigValueKind.Boolean),
  row("DisableKeys", "disableKeys", ConfigValueKind.Boolean),
  row("DisableUI", "disableUI", ConfigValueKind.Boolean),
  row("DisableTouch", "disableTouch", ConfigValueKind.Boolean),
  row("HotkeysForbidden", "hotkeysForbidden", ConfigValueKind.List),
  row("Toolbar", "toolbar", ConfigValueKind.List),
  row("AnswerLabels", "answerLabels", ConfigValueKind.Text),
  row("MetadataIcons", "metadataIcons", ConfigValueKind.Boolean),
  row("QuestionTypeHints", "questionTypeHints", ConfigValueKind.Boolean),
  row("QuestionNumbers", "questionNumbers", ConfigValueKind.Boolean),
  row("AllowInput", "allowInput", ConfigValueKind.Boolean),
  row("CodeHighlight", "codeHighlight", ConfigValueKind.Boolean),
  row("AllowScripts", "allowScripts", ConfigValueKind.Boolean),

  // Timers.
  row("DateCreation", "dateCreation", ConfigValueKind.Number),
  row("Hotkeys", "hotkeys", ConfigValueKind.Pairs),
  row("HideTimerGlobal", "hideTimerGlobal", ConfigValueKind.Boolean),
  row("HideTimerQuestion", "hideTimerQuestion", ConfigValueKind.Boolean),
  row("AllowTimerOnSections", "allowTimerOnSections", ConfigValueKind.Boolean),
  row("TimerStrategy", "timerStrategy", ConfigValueKind.Text),
  row("TimerSound", "timerSound", ConfigValueKind.Boolean),
  row("DefaultTimer", "defaultTimer", ConfigValueKind.Number),

  // Media and files.
  row("MediaAutoPlay", "mediaAutoPlay", ConfigValueKind.Boolean),
  row(
    "LoadExternalMediaAsIframe",
    "loadExternalMediaAsIframe",
    ConfigValueKind.Boolean,
  ),
  row("Url", "url", ConfigValueKind.Text),
  row("LinkPrefixes", "linkPrefixes", ConfigValueKind.List),
  row("MediaFormats", "mediaFormats", ConfigValueKind.List),
  row("SubFolderMedia", "subFolderMedia", ConfigValueKind.Text),
  row("SubFolderTheme", "subFolderTheme", ConfigValueKind.Text),
  row("SubFolderQuestions", "subFolderQuestions", ConfigValueKind.Text),
  row("FilenamePattern", "filenamePattern", ConfigValueKind.Text),
  row("Filenames", "filenames", ConfigValueKind.List),
  row("FileExtensions", "fileExtensions", ConfigValueKind.List),
  row("BannerImage", "bannerImage", ConfigValueKind.Text),
  row("Icon", "icon", ConfigValueKind.Text),

  // Drawing and balancing a round.
  row("Pool", "pool", ConfigValueKind.Number),
  row("BalanceDifficulty", "balanceDifficulty", ConfigValueKind.Boolean),

  // Points.
  row("ScoringPreset", "scoringPreset", ConfigValueKind.Text),
  row("NegativeMarking", "negativeMarking", ConfigValueKind.Number),
  row("Streaks", "streaks", ConfigValueKind.Boolean),

  // Play policy.
  row("Restricted", "restricted", ConfigValueKind.Boolean),
  row("Lifelines", "lifelines", ConfigValueKind.List),
  row("Teams", "teams", ConfigValueKind.List),
  row("QuizLimit", "quizLimit", ConfigValueKind.Duration),
  row("RoundTimer", "roundTimer", ConfigValueKind.Duration),
  row("RevealMode", "revealMode", ConfigValueKind.Text),
  row("Policy", "policy", ConfigValueKind.Text),
  row("Grading", "grading", ConfigValueKind.Text),
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
      case ConfigValueKind.Boolean:
        out[row.key] = truthy(values[0] ?? "");
        break;
      case ConfigValueKind.Number: {
        const number = Number(values[0]);
        if (Number.isFinite(number)) {
          out[row.key] = number;
        }
        break;
      }
      case ConfigValueKind.Duration: {
        const ms = coerceDuration(values[0] ?? "");
        if (ms !== undefined) {
          out[row.key] = ms;
        }
        break;
      }
      case ConfigValueKind.List:
        out[row.key] = splitList(values);
        break;
      case ConfigValueKind.Pairs: {
        const map = pairs(values);
        if (Object.keys(map).length > 0) {
          out[row.key] = map;
        }
        break;
      }
      case ConfigValueKind.Text:
      default:
        out[row.key] = (values[0] ?? "").trim();
        break;
    }
  }
  return out;
}
