import { QuizAction } from "../interactive/dom";
import { QuizThemeParams } from "../theme/quizTheme";
import { DEFAULT_SETTINGS } from "./defaultSettings";
import { QuizSettingParams } from "./quizSetting";
import { TimerStrategy } from "./timer";

export interface ParseSymbols {
  comment?: string;
  pairing?: string;
  questionOnly?: string;
  answerOnly?: string;
  inlineList?: string;
  keepAsIs?: string;
  section?: string;
  question?: string;
}

export interface QuizParams {
  id?: string; // if you want multiple quizzes on the same page, they need unique IDs
  title?: string;
  seed?: string;
  excludeSections?: boolean;
  allowInput?: boolean;

  languageDefault?: string;
  languages?: string[];
  translations?: Record<string, Record<string, any>>;
  syncPropertiesWithTranslations?: boolean;

  theme?: QuizThemeParams;
  themeDisabled?: boolean; // defaults to false; just a quick toggle to test with/without current theme(s)
  icon?: string; // link to favicon image file, must be relative to current directory
  bannerImage?: string; // link to large header/banner/hero image for quiz

  hideDefaultSettings?: boolean;
  settings?: QuizSettingParams[];

  url?: string;
  builtin?: Record<any, any>; // a prepared JSON object that can be thrown into the quiz immediately

  skipLoadingScreen?: boolean;
  skipLoadingScreenIfBuiltin?: boolean;

  filenamePattern?: string; // for automatic pattern matching (name-0, name-1, ...)
  filenames?: string[]; // for fixed filenames given by user, can be anything
  fileExtensions?: string[];
  fileExtensionsUpload?: string[];

  subFolderMedia?: string;
  subFolderQuestions?: string;
  subFolderTheme?: string;

  loadExternalMediaAsIframe?: boolean;
  linkPrefixes?: string[];
  mediaFormats?: string[];

  defaultCategory?: string;
  possibleCategories?: string[];
  hideCategory?: boolean;

  defaultAuthor?: string;
  possibleAuthors?: string[];
  hideAuthor?: boolean;

  minScore?: number;
  maxScore?: number;
  defaultScore?: number;
  hideScore?: boolean;

  symbols?: ParseSymbols;
  groupBy?: string;
  exclude?: Record<string, any>; // a FILTER: any properties with these values are removed from the question set
  include?: Record<string, any>; // a MASK: only questions with properties matching these values are added to the question set
  minAnswers?: number;
  maxAnswers?: number;
  questionTypesAllowed?: string[];
  filterSections?: string[];

  forbidInlineLists?: boolean;
  hideErrors?: boolean;
  hideDefaultStyles?: boolean;

  enableSafety?: boolean;
  enableMouse?: boolean;
  disableKeys?: boolean;
  disableUI?: boolean;
  disableTouch?: boolean;
  hotkeys?: Record<string, string | string[]>;
  hotkeysForbidden?: string[]; // disables any matching actions entirely
  toolbar?: QuizAction[];

  keepSectionOrder?: boolean;
  keepQuestionOrder?: boolean;
  keepAnswerOrder?: boolean;
  randomizeMedia?: boolean;

  showPropertiesWithoutDiversity?: boolean;
  addSecretThemeQuestions?: boolean;
  hideSecretThemeMessage?: boolean;
  addMissingSectionScreens?: boolean;
  disableTextFormatting?: boolean;
  hideScoreOnAnswers?: boolean;

  defaultTimer?: number;
  hideTimerGlobal?: boolean;
  hideTimerQuestion?: boolean;
  allowTimerOnSections?: boolean;
  timerStrategy?: TimerStrategy;
  dateCreation?: number;

  mediaAutoPlay?: boolean;
}

const DEFAULT_ID = "quiz-id";
const DEFAULT_SEED = "quiz";
export const DEFAULT_SCORE = 1;
export const DEFAULT_AUTHOR = "Anyone";
export const DEFAULT_CATEGORY = "Any";

const MAX_SCORE = 10;
const MIN_SCORE = 1;

export const BASE_URL = "";
export const QUESTION_FILE_NAME_PATTERN = "questions";
export const DEF_FILE_EXTENSIONS = ["txt"];
export const VALID_FILE_EXTENSIONS = ["txt", "md", "json", "rtf"]; //["txt", "md", "doc", "docx", "pdf", "json"];

export const SUB_FOLDER_MEDIA = "media/";
export const SUB_FOLDER_QUESTIONS = "questions/";
export const SUB_FOLDER_THEME = "theme/";

export const initializeParameters = (params) => {
  // ID is the "sanitized" version of title/seed, with no spaces and consistent formatting, to use within the system
  // Title is the humanized/prettier name for the quiz that's displayed on the outside
  params.seed = params.seed ?? DEFAULT_SEED;
  params.title = params.title ?? params.id ?? params.seed;
  params.id = params.title.toLowerCase().replaceAll(" ", "-") ?? DEFAULT_ID;

  params.defaultAuthor = params.defaultAuthor ?? DEFAULT_AUTHOR;
  params.defaultCategory = params.defaultCategory ?? DEFAULT_CATEGORY;
  params.defaultScore = params.defaultScore ?? DEFAULT_SCORE;
  params.title = params.title ?? params.id;
  params.symbols = params.symbols ?? {};
  params.exclude = params.exclude ?? {};
  params.include = params.include ?? {};

  params.hotkeys = params.hotkeys ?? {};
  params.hotkeysForbidden = params.hotkeysForbidden ?? [];
  params.toolbar = params.toolbar ?? [];
  params.questionTypesAllowed = params.questionTypesAllowed ?? [];
  params.maxScore = params.maxScore ?? MAX_SCORE;
  params.minScore = params.minScore ?? MIN_SCORE;

  params.filterSections = params.filterSections ?? [];

  params.url = params.url ?? BASE_URL;
  params.filenamePattern = params.filenamePattern ?? QUESTION_FILE_NAME_PATTERN;
  params.filenames = params.filenames ?? [];
  params.fileExtensions = params.fileExtensions ?? DEF_FILE_EXTENSIONS;
  params.fileExtensionsUpload =
    params.fileExtensionsUpload ?? VALID_FILE_EXTENSIONS;

  params.subFolderMedia = params.subFolderMedia ?? SUB_FOLDER_MEDIA;
  params.subFolderQuestions = params.subFolderQuestions ?? SUB_FOLDER_QUESTIONS;
  params.subFolderTheme = params.subFolderTheme ?? SUB_FOLDER_THEME;

  params.builtin = params.builtin ?? {};

  params.settings = params.settings ?? [];
  if (!params.hideDefaultSettings) {
    params.settings.push(...DEFAULT_SETTINGS);
  }

  return params;
};
