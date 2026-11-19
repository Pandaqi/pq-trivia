import { showMessage } from "./errorHandler";
import { Question, QuestionType } from "../questions/question";
import { QVal, QValType } from "../questions/questionValue";
import type { QuizParams } from "./params";
import {
  createHiddenSection,
  propertyAlreadyHasData,
  QuestionData,
  questionDataMatchesSection,
  updateQuestionDataProperty,
} from "./questions";

export const IMAGE_FORMATS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "svg",
  "tiff",
  "bmp",
  "jxl",
];
export const AUDIO_FORMATS = ["mp3", "ogg", "wav", "m4a", "aac"];
export const VIDEO_FORMATS = ["mp4", "webm", "mov", "avi"];
const ALL_FORMATS = [IMAGE_FORMATS, AUDIO_FORMATS, VIDEO_FORMATS].flat();
const LINK_PREFIXES = ["http://", "https://", "www.", ".com"];

const PROPS_ACCEPTING_LIST = [
  "category",
  "media",
  "answers",
  "correct",
  "author",
  "comment",
  "hints",
  "sources",
  "placeafter",
  "placebefore",
];
const PROPS_FORCED_LOWERCASE = [
  "category",
  "author",
  "type",
  "id",
  "answerorder",
  "mediaorder",
  "placeafter",
  "placebefore",
  "language",
];

const MASK_QUESTION_SYMBOL = "?";
const MASK_ANSWER_SYMBOL = "!";
const MASK_KEEP_AS_IS_SYMBOL = "$";
const INLINE_SPLIT_SYMBOL = "|";
const ATTRIBUTE_PAIRING_SYMBOL = "=>";
const SECTION_SYMBOL = "#";
const QUESTION_SYMBOL = "##";
const COMMENT_SYMBOL = "//";

export const DEF_SECTION_NAME = "General";

export const isValidMediaType = (path: string, params: QuizParams = {}) => {
  const ext = parseExtension(path);
  const allFormats = params.mediaFormats ?? ALL_FORMATS;
  return allFormats.includes(ext);
};

export const parseRawFile = (data: string, url: string): string => {
  const ext = parseExtension(url);
  if (ext == "txt" || ext == "md") {
    return data;
  } else if (ext == "json") {
    return JSON.parse(data);
  } else if (ext == "doc" || ext == "docx") {
    // @NOTE: too heavyweight, too hard, skip
  } else if (ext == "pdf") {
    // @NOTE: too heavyweight, too hard, skip
  }
};

// OLD NAME = parseFileObject
export const parseQuestionDataIntoObjects = (
  data: QuestionData[],
  params: QuizParams = {},
): Question[] => {
  const questions = [];
  for (const questionData of data) {
    const q = new Question();
    q.fromData(questionData, params);
    if (!q.isValid()) {
      continue;
    }
    questions.push(q);
  }
  return questions;
};

export const parseStringIntoData = (
  data: string,
  params: QuizParams = {},
): QuestionData[] => {
  const lines = data.split(/\r?\n/);

  const commentSymbol = params.symbols.comment ?? COMMENT_SYMBOL;
  const sectionSymbol = params.symbols.section ?? SECTION_SYMBOL;
  const questionSymbol = params.symbols.question ?? QUESTION_SYMBOL;
  const attributePairingSymbol =
    params.symbols.pairing ?? ATTRIBUTE_PAIRING_SYMBOL;

  let curQuestion: QuestionData = null;
  let curSection: QuestionData = null;
  let currentProperty: string = "";
  const questions: QuestionData[] = [];

  const finalizeQuestion = (q: QuestionData) => {
    // sections default to their own name as their ID; because they, well, START the new section, this won't be inherited from the current section automatically
    // (which is what questions do below), so we need to check here and set it
    const isSection = q.type == QuestionType.SECTION;
    if (isSection && !propertyAlreadyHasData(q, "section")) {
      const sectionName = q.id ?? q.question[0];
      q.section = sectionName;
    }

    // if section issues, use a default section that is hidden from users
    const noSectionSet = !curSection;
    const questionWantsAnotherSection =
      curSection &&
      !isSection &&
      propertyAlreadyHasData(q, "section") &&
      !questionDataMatchesSection(q, curSection);
    if (noSectionSet || questionWantsAnotherSection) {
      curSection = createHiddenSection(q, params);
      questions.push(curSection);
    }

    const sectionAlreadySet = propertyAlreadyHasData(q, "section");
    if (!sectionAlreadySet) {
      // this is a crucial bit of code that defaults all questions that come after a section declaration, to simply take over that section ID
      const curSectionName = curSection.section ?? DEF_SECTION_NAME;
      q.section = curSectionName;
    }

    if (isSection && params.excludeSections) {
      return;
    }

    // @NOTE: we used to call q.finalize() here,
    // but now that the parser just returns flat objects that will be turned into Questions _later_
    // that finalize call also happens later automatically! (see `parseQuestionDataIntoObjects`)
    questions.push(q);
  };

  for (const line of lines) {
    const lineTrimmed = line.trim();
    const isEmptyLine = lineTrimmed.length <= 0;
    if (isEmptyLine) {
      continue;
    }

    const isComment = lineTrimmed.indexOf(commentSymbol) == 0;
    if (isComment) {
      continue;
    }

    const isShorthandQuestion = lineTrimmed.indexOf(questionSymbol) == 0;
    const isShorthandSection =
      lineTrimmed.indexOf(sectionSymbol) == 0 && !isShorthandQuestion; // because these use the same "#", this is needed to prevent BOTH Question+Section triggering on its appearance
    if (isShorthandSection) {
      if (params.excludeSections) {
        continue;
      }

      // if a question was being handled, close it first
      const mustSavePreviousQuestion = curQuestion != null;
      if (mustSavePreviousQuestion) {
        finalizeQuestion(curQuestion);
      }

      curQuestion = {};
      // remove the section symbol from start of string, then save remainder as section name
      const sectionName = lineTrimmed.slice(sectionSymbol.length).trim();
      curQuestion.question = [sectionName]; // @NOTE: important to make sure things that should be lists (according to QuestionData interface) are lists!
      curQuestion.type = QuestionType.SECTION;
      curSection = curQuestion;
      continue;
    }

    let parts = lineTrimmed.split(attributePairingSymbol);
    parts = parts.map((s) => s.trim());

    // a shorthand question cuts off the symbol at the start and forcefully sets this property to be ["Question", QuestionData] for further parsing
    // (as if we wrote Question => QuestionData)
    if (isShorthandQuestion) {
      const lineData = lineTrimmed.slice(questionSymbol.length).trim();
      parts = ["Question", lineData];
    }

    const invalid = parts.length > 2;
    if (invalid) {
      showMessage(`Can't parse invalid line: ${lineTrimmed}`);
      continue;
    }

    const continueCurrentProperty = parts.length <= 1;
    if (continueCurrentProperty) {
      if (!curQuestion) {
        showMessage(
          `Can't continue property because no question started: `,
          parts,
        );
        continue;
      }
      const rawValue = parts[0];
      updateQuestionDataProperty(
        curQuestion,
        currentProperty,
        rawValue,
        params,
      );
      continue;
    }

    currentProperty = parts[0].toLowerCase();
    const rawValue = parts[1];

    const startNewQuestion = currentProperty == "question";
    if (startNewQuestion) {
      const mustSavePreviousQuestion = curQuestion != null;
      if (mustSavePreviousQuestion) {
        finalizeQuestion(curQuestion);
      }
      curQuestion = {};
    }

    const val = parseInlinePropertyValue(currentProperty, rawValue, params);
    updateQuestionDataProperty(curQuestion, currentProperty, val, params);

    // once we've figured out that the question marks a new section, update immediately
    const shouldUpdateSection =
      currentProperty == "type" && curQuestion.type == QuestionType.SECTION;
    if (shouldUpdateSection) {
      curSection = curQuestion;
    }
  }

  // don't forget to add the very last question we were working on too!
  if (curQuestion) {
    finalizeQuestion(curQuestion);
  }

  return questions;
};

export const acceptsInlineList = (prop: string) => {
  return PROPS_ACCEPTING_LIST.includes(prop);
};

export const parseInlinePropertyValue = (
  prop: string,
  val: string,
  params: QuizParams = {},
): string[] => {
  if (val.length <= 0) {
    return [];
  }
  if (acceptsInlineList(prop) && !params.forbidInlineLists) {
    const splitSymbol = params.symbols.inlineList ?? INLINE_SPLIT_SYMBOL;
    return val.split(splitSymbol);
  }
  return [val];
};

export const parseQuestionProperty = (
  prop: string,
  val: string[],
  params: QuizParams = {},
): QVal[] => {
  val = val.map((s) => s.trim());
  if (PROPS_FORCED_LOWERCASE.includes(prop)) {
    val = val.map((s) => s.toLowerCase());
  }
  val = val.filter((x) => x != ""); // no completely empty entries

  if (!params.symbols) {
    params.symbols = {};
  }

  const questionMaskSymbol =
    params.symbols.questionOnly ?? MASK_QUESTION_SYMBOL;
  const answerMaskSymbol = params.symbols.answerOnly ?? MASK_ANSWER_SYMBOL;
  const keepAsIsSymbol = params.symbols.keepAsIs ?? MASK_KEEP_AS_IS_SYMBOL;

  const arr: QVal[] = [];
  for (let elem of val) {
    const firstChar = elem.charAt(0);
    let qValType = QValType.ALL;
    let keepAsIs = false;
    if (firstChar == questionMaskSymbol) {
      elem = elem.slice(1).trim();
      qValType = QValType.QUESTION;
    } else if (firstChar == answerMaskSymbol) {
      elem = elem.slice(1).trim();
      qValType = QValType.ANSWER;
    } else if (firstChar == keepAsIsSymbol) {
      elem = elem.slice(1).trim();
      keepAsIs = true;
    }

    arr.push(new QVal(elem, qValType, keepAsIs));
  }
  return arr;
};

export const getAllPossibleValuesFor = (list: Question[], prop: string) => {
  const set: Set<string> = new Set();
  for (const elem of list) {
    const values = elem.getPropertyAsList(prop);
    for (const val of values) {
      set.add(val);
    }
  }
  return Array.from(set);
};

export const parseExtension = (path: string) => {
  const splitPath = path.split(".");
  return splitPath[splitPath.length - 1];
};

export const parsePathToID = (path: string) => {
  const splitPath = path.split("/");
  return splitPath[splitPath.length - 1];
};

export const isExternalURL = (val: string, params: QuizParams = {}) => {
  const prefixes = params.linkPrefixes ?? LINK_PREFIXES;
  for (const prefix of prefixes) {
    if (val.includes(prefix)) {
      return true;
    }
  }
  return false;
};

export const parseQuestionsIntoList = (cache: Record<string, Question[]>) => {
  const list = [];
  for (const elem of Object.values(cache)) {
    list.push(elem);
  }
  return list.flat();
};

export const parseQuestionValueIntoString = (v: QVal) => {
  if (!(v instanceof QVal)) {
    return v;
  }

  const val = v.getRaw() ?? v.get();
  if (v.type == QValType.ALL) {
    return val;
  } else if (v.type == QValType.ANSWER) {
    return MASK_ANSWER_SYMBOL + val;
  } else if (v.type == QValType.QUESTION) {
    return MASK_QUESTION_SYMBOL + val;
  }
};
