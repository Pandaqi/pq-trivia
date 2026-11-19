import type { Quiz } from "../quiz";
import { showMessage } from "../tools/errorHandler";
import { filterSections, shuffle } from "../tools/helpers";
import type { QuizParams } from "../tools/params";
import { QuestionData } from "../tools/questions";
import { seedRandom } from "../tools/seedRandom";
import { translate } from "../translator/translator";
import { Question } from "./question";
import { Section } from "./section";

export const sortQuestionsIntoSections = (questions: Question[]) => {
  // collect all sections
  const sectionStarts = questions.filter((q) => q.isSection());
  const sectionDict: Map<string, Section> = new Map();
  let sectionCounter = 0;
  for (const sectionStart of sectionStarts) {
    // @NOTE: if no ID set, we default to "SECTIONCOUNTER" -> crucial for ID matching on multiple languages
    const defaultID = `section-${sectionCounter}`;
    let sectionID = sectionStart.getID();
    if (sectionID.trim().length <= 0) {
      sectionID = defaultID;
    }

    const alreadyExists = sectionDict.has(sectionStart.getSection());
    if (alreadyExists) {
      continue;
    } // this fixes people putting questions from different sections in random order, causing the same section to be created multiple times

    const newSection = new Section().setStart(sectionStart);
    newSection.setID(sectionID);

    sectionDict.set(sectionStart.getSection(), newSection);
    sectionCounter++;
  }

  // move through all questions and assign
  for (const q of questions) {
    if (q.isSection()) {
      continue;
    }
    const sectionObject = sectionDict.get(q.getSection());
    if (!sectionObject) {
      showMessage(
        `Can't sort question into section that doesn't exist.`,
        q,
        sectionDict,
        this,
      );
      continue;
    }
    sectionObject.addQuestion(q);
  }

  return sectionDict;
};

export const sortQuestionsIntoDictionary = (sections: Map<string, Section>) => {
  const questionDict: Map<string, Question> = new Map();

  let sectionCounter = 0;
  for (const [name, section] of sections.entries()) {
    const questions = section.getQuestions();
    let counter = 0;
    for (const q of questions) {
      // if it has no id, we default to "SECTIONCOUNTER-QUESTIONCOUNTER"
      // @NOTE: this is CRUCIAL for making sure questions across different files (different languages) match up
      const defaultID = `section-${sectionCounter}-question-${counter}`;
      let id = q.getID();
      if (id.trim().length <= 0) {
        id = defaultID;
      }
      q.setID(id);
      questionDict.set(id, q);
      counter++;
    }
    sectionCounter++;
  }

  return questionDict;
};

export const moveElementIfNeeded = (elem: any, list: any[], dir: string) => {
  const constraints = elem[`_dynamicPlace${dir}`];
  for (const otherElem of constraints) {
    const myIdx = list.indexOf(elem);
    const otherIdx = list.indexOf(otherElem);

    if (dir == "Before") {
      if (myIdx < otherIdx) {
        continue;
      }
      list.splice(myIdx, 1); // remove where we are now
      list.splice(otherIdx, 0, elem); // add before other
    }

    if (dir == "After") {
      if (myIdx > otherIdx) {
        continue;
      }
      list.splice(otherIdx + 1, 0, elem); // add after other
      list.splice(myIdx, 1); // remove where we are now
    }
  }
};

type RNG = () => number;

export interface Statistics {
  numQuestions?: number;
  numPoints?: number;
  numRounds?: number;
}

export class QuestionDatabase {
  questionsRaw: Question[];

  // @NOTE: the string keys here are SECTION NAMES, not IDs
  // Because those are actually consistent within languages, and it's all questions need to link themselves to section objects
  sectionDict: Map<string, Section>;
  sectionList: Section[];
  sectionListFull: Section[]; // without filtering

  questionDict: Map<string, Question>;
  questionList: Question[];

  rng: Record<string, RNG>;

  allAuthors: string[];
  allCategories: string[];

  constructor(questionsRaw: Question[]) {
    this.questionsRaw = questionsRaw.slice();

    this.sectionDict = sortQuestionsIntoSections(this.questionsRaw);
    this.questionDict = sortQuestionsIntoDictionary(this.sectionDict);
  }

  clear() {
    this.sectionList = [];
    this.questionList = [];
  }

  countQuestions() {
    return this.questionList.length;
  }
  countQuestionsWithoutSections() {
    return this.countQuestions() - this.countSections();
  }
  countSections() {
    return this.sectionList.length;
  }

  getQuestions() {
    return this.questionList.slice();
  }
  getQuestionByID(id: string) {
    return this.questionDict[id];
  }
  getQuestionAt(idx: number) {
    if (idx < 0 || idx >= this.countQuestions()) {
      return null;
    }
    return this.questionList[idx];
  }

  getSections() {
    return this.sectionList.slice();
  }
  getSectionIndex(s: Section) {
    return this.sectionList.indexOf(s);
  }
  getSectionAt(idx: number) {
    if (idx < 0 || idx >= this.countSections()) {
      return null;
    }
    return this.sectionList[idx];
  }

  getSectionFromQuestion(q: Question) {
    return this.sectionDict.get(q.getSection());
  }
  getIndexForSectionStart(s: Section) {
    return this.questionList.indexOf(s.start);
  }

  getSection(startIndex: number, dir: string = "next") {
    const q = this.getQuestionAt(startIndex);
    if (!q) {
      return this.getSectionAt(dir == "next" ? 0 : this.sectionList.length - 1);
    }

    const sec = this.getSectionFromQuestion(q);
    const secIndex = this.sectionList.indexOf(sec) + (dir == "next" ? 1 : -1);
    return this.getSectionAt(secIndex);
  }

  shuffleSeeded(list: any[], rngKey: string = "custom") {
    const rng = this.rng[rngKey] ?? this.rng.custom;
    return shuffle(list, rng);
  }

  refreshQuestionList() {
    this.questionList = this.sectionList
      .map((x) => x.getQuestionsWithStart())
      .flat()
      .filter((x) => !x.isHiddenAtPlay());
  }

  // @NOTE: this is an ugly exception for things that should NOT be matched across multiple languages
  randomizeUnsynced(quiz: Quiz) {
    this.addSecretThemeQuestions(quiz);
  }

  randomize(quiz: Quiz) {
    this.randomizePre(quiz.params);

    this.sortAndShuffle(quiz.params);
    this.solveConstraints(quiz.params);
    this.filterAndFinalizeSections(quiz.params);

    this.randomizePost(quiz.params);
  }

  // prepare random number generators
  randomizePre(params: QuizParams) {
    this.rng = {
      sections: seedRandom(`${params.seed}-sections`),
      questions: seedRandom(`${params.seed}-questions`),
      answers: seedRandom(`${params.seed}-answers`),
      grouping: seedRandom(`${params.seed}-grouping`),
      media: seedRandom(`${params.seed}-media`),
      colors: seedRandom(`${params.seed}-media`),
      custom: seedRandom(`${params.seed}-custom`),
    };

    const sectionList: Section[] = Array.from(this.sectionDict.values());
    this.sectionList = sectionList;

    // apply any custom config to filter/exclude/mask specific questions
    for (const section of this.sectionList) {
      section.applyFilters(params);
    }
  }

  // do stable sorts on relevant properties (to compensate for input/upload delay mucking things up)
  // then shuffle
  sortAndShuffle(params: QuizParams) {
    if (!params.keepSectionOrder) {
      this.sectionList.sort((a, b) =>
        a.getName().localeCompare(b.getName(), "en", {
          sensitivity: "variant",
          numeric: true,
        }),
      );
      shuffle(this.sectionList, this.rng.sections);
    }

    for (const section of this.sectionList) {
      section.shuffle(params, this.rng);
    }
  }

  solveConstraints(params: QuizParams) {
    const sectionsRaw: Section[] = this.sectionList.slice();

    // 0) Rounds with a FIXED NUMBER are placed first; it's up to you not to screw up their placement with other constraints
    // Initialize an array of final size, then place sections at exactly the index they want, and fill all empty spaces remaining with the remaining sections who don't care.
    const sections: Section[] = new Array(sectionsRaw.length).fill(null);
    const sectionsWithFixedIndices = sectionsRaw.filter((x) =>
      x.getFixedIndex(),
    );
    for (const sectionFixed of sectionsWithFixedIndices) {
      const idx = sectionFixed.getFixedIndex();
      sections[idx - 1] = sectionFixed; // starts counting at 1
    }

    for (const sectionLeft of sectionsRaw) {
      if (sections.includes(sectionLeft)) {
        continue;
      }
      const firstEmptyPosition = sections.findIndex((x) => x == null);
      sections[firstEmptyPosition] = sectionLeft;
    }

    // 1) Now we extract/manipulate all sorting information into something we can use. If a question mentions a question FROM A DIFFERENT ROUND, we remove it from the question's own sorting and give it to round sorting
    for (const dir of ["Before", "After"]) {
      for (const section of sections) {
        const arr = section.start.getPropertyAsList(`place${dir}`) ?? [];

        for (const q of section.getQuestions()) {
          const qArr = q.getPropertyAsList(`place${dir}`) ?? [];
          for (const elem of qArr) {
            const elemSection = this.getSectionFromQuestion(
              this.getQuestionByID(elem),
            );
            if (elemSection == section) {
              continue;
            }
            qArr.splice(qArr.indexOf(elem), 1);
            arr.push(elemSection.getName());
          }

          q[`_dynamicPlace${dir}`] = qArr;
        }

        section[`_dynamicPlace${dir}`] = Array.from(new Set(arr));
      }
    }

    // 2) Now we can be certain rounds and questions can be sorted internally (according to their new `fullPlaceBefore/After` properties)
    // (if your constraints are IMPOSSIBLE to solve, this will still function, you'll just not get what you want)
    const sectionsOriginal = sections.slice();
    for (const section of sectionsOriginal) {
      moveElementIfNeeded(section, sections, "Before");
      moveElementIfNeeded(section, sections, "After");

      const questionsOriginal = Object.values(section.questions);
      const questions = questionsOriginal.slice();
      for (const question of questionsOriginal) {
        moveElementIfNeeded(question, questions, "Before");
        moveElementIfNeeded(question, questions, "After");
      }

      section.questions = questions;
    }

    this.sectionList = sections;
  }

  filterAndFinalizeSections(params: QuizParams) {
    // finally, save the final result in the all-important lists
    // @NOTE: we do `filterSections` at the END to ensure the exact question/answer order stays the same when you ignore sections; those ignored sections are simply hidden after the fact
    this.sectionListFull = this.sectionList.slice();
    this.sectionList = filterSections(this.sectionList, params.filterSections);
    this.refreshQuestionList();
  }

  addSecretThemeQuestions(quiz: Quiz) {
    // if we find rounds with secret themes, auto-insert proper question at the end
    // @NOTE: It's crucial to do this AFTER all the shuffling and selecting we do before now; also, I decided to COUNT this question when giving section statistics to make them fully "correct" with the final product
    if (!quiz.params.addSecretThemeQuestions) {
      return;
    }

    const sectionsWithSecret = this.sectionList.filter((x) => x.getSecret());
    for (const section of sectionsWithSecret) {
      const secret = section.getSecret();
      const sectionName = section.getName();
      if (!secret) {
        continue;
      }

      const newQuestionData: QuestionData = {
        question: translate(`[play-secret-theme-question]`, quiz),
        answers: secret,
        section: sectionName,
        hiddenAtExport: true,
      };

      const newQuestion = new Question();
      newQuestion.fromData(newQuestionData, quiz.params);
      section.addQuestion(newQuestion);
    }
  }

  randomizePost(params: QuizParams) {
    // save some stats
    this.allCategories = Array.from(
      new Set(
        this.questionList.map((x) => x.getPropertyAsList("category")).flat(),
      ),
    );
    this.allAuthors = Array.from(
      new Set(
        this.questionList.map((x) => x.getPropertyAsList("author")).flat(),
      ),
    );

    // assign questions some helpful extra properties (e.g. index in list)
    let indexRelativeQuestions = 0;
    for (const section of this.sectionList) {
      section.start.indexRelative = this.getSectionIndex(section);
      section.assignQuestionIndices(indexRelativeQuestions);
      indexRelativeQuestions += section.countQuestions();
    }
  }

  getStatistics() {
    return {
      numQuestions: this.countQuestionsWithoutSections(),
      numPoints: this.sectionList.reduce(
        (prev, cur) => prev + cur.calculateStatistics().numPoints,
        0,
      ),
      numRounds: this.countSections(),
    };
  }

  sectionIsFiltered(s: Section) {
    return !this.sectionList.includes(s) && this.sectionListFull.includes(s);
  }

  // given another ("main/anchor") database, find the matching sections (to put our own in the same order),
  // and then find the matching questions inside for similar sorting
  // WHY? So we can grab questions by index at any time and be sure they all follow the same order
  matchDatabase(db: QuestionDatabase) {
    const sectionList = new Array(db.countSections()).fill(null);

    for (const section of this.sectionDict.values()) {
      const myID = section.getID();
      const otherSection = db.sectionListFull.find((x) => x.getID() == myID);
      if (!otherSection) {
        showMessage(
          `Can't match section with ID ${myID} with section in main language`,
          section,
          this,
        );
        continue;
      }

      // because sections can be filtered on demand, we need to look for the matching section in the FULL list above
      // and then, if it was never used, discard this one too; otherwise, match it up (with the REAL index in the final list) below
      if (db.sectionIsFiltered(otherSection)) {
        continue;
      }

      const indexInOtherDB = db.sectionList.indexOf(otherSection);
      sectionList[indexInOtherDB] = section;
      section.start.syncWith(otherSection.start);

      const newQuestions = new Array(otherSection.countQuestions()).fill(null);
      for (const question of section.questions) {
        const myID = question.getID();
        const indexInOtherDB = otherSection.questions.findIndex(
          (x) => x.getID() == myID,
        );
        const otherQuestion = otherSection.questions[indexInOtherDB];
        if (indexInOtherDB < 0 || indexInOtherDB >= newQuestions.length) {
          showMessage(
            `Can't match question with ID ${myID} with question in main language`,
            question,
            this,
          );
        } else {
          newQuestions[indexInOtherDB] = question;
          question.syncWith(otherQuestion);
        }
      }
      section.setQuestions(newQuestions);

      const unmatchedQuestions = newQuestions.filter((x) => x == null);
      if (unmatchedQuestions.length > 0) {
        showMessage(
          `Main database has unmatched questions with QuestionDatabase. Section = ${section.getID()}, First Index = ${newQuestions.indexOf(null)}.`,
          this,
        );
      }
    }

    const unmatchedSections = sectionList.filter((x) => x == null);
    if (unmatchedSections.length > 0) {
      showMessage(
        `Main database has unmatched sections with QuestionDatabase. First Index = ${sectionList.indexOf(null)}.`,
        unmatchedSections,
        this,
      );
    }

    this.sectionList = sectionList;
    this.questionList = sectionList
      .map((x) => x.getQuestionsWithStart())
      .flat();
  }
}
