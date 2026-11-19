import type { Question } from "../questions/question";
import { QuestionDatabase } from "../questions/questionDatabase";
import type { Quiz } from "../quiz";
import { showMessage } from "../tools/errorHandler";
import { clamp } from "../tools/helpers";
import type { QuizParams } from "../tools/params";
import { TRANSLATIONS } from "./translations";

export const DEFAULT_UI_LANGUAGE = "en";

export const translate = (message:string, quiz:Quiz, params:Record<string,any> = {}) =>
{
    if(!message || message.length <= 0) { return ""; }

    const regex = /\[(.+?)\]/gi
    const matches = Array.from( message.matchAll(regex) );
    if(matches.length <= 0) { return message; }

    const relevantDictionary = quiz.translator.getCurrentTranslations();
    for(const match of matches)
    {
        const fullMatch = match[0];
        const messageKey = match[1]; // index 0 is the FULL MATCH, index 1 is the first subgroup `(.+)` matched
        const value = relevantDictionary[messageKey] ?? ""; // these two lines actually translate
        if(typeof value == "function") { return value(quiz, params); }
        message = message.replace(fullMatch, value); // and this REPLACES the original with the translation
    }

    return message;
}

export class Translator
{    
    db:QuestionDatabase;
    databasesByLanguage: Map<string, QuestionDatabase>;
    questionsRaw: Question[];

    language: string;
    // this one is always used as the default/base/root, all OTHER languages are "calibrated" to it
    // because if we use this.language, then it will SORT EVERYTHING DIFFERENTLY depending on what language we select before going into the quiz!
    languageRoot: string; 
    languagesAvailable: string[];

    translations:Record<string,Record<string,any>>; // UI

    constructor(params:QuizParams)
    {
        params.languageDefault = params.languageDefault ?? DEFAULT_UI_LANGUAGE;
        params.languages = params.languages ?? [];
        params.translations = Object.assign(TRANSLATIONS, params.translations ?? {});

        // @NOTE: setting this in constructor allows already translating loading page, 
        // where no questions have actually been loaded yet and we don't know anything else about languages
        this.translations = params.translations;
        this.languagesAvailable = [DEFAULT_UI_LANGUAGE];
        this.language = params.languageDefault;
    }

    isMonoLanguage() { return this.languagesAvailable.length <= 1; }
    isMultiLanguage() { return !this.isMonoLanguage(); }

    getCurrentLanguage() { return this.language; }
    setLanguage(l:string) { this.language = l; }

    countSections()
    {
        return this.db ? this.db.countSections() : 0;
    }

    countQuestions()
    {
        return this.db ? this.db.countQuestions() : 0;
    }

    countQuestionsWithoutSections()
    {
        return this.countQuestions() - this.countSections();
    }

    advance(dl:number = 1)
    {
        const maxIdx = this.languagesAvailable.length;
        const curIdx = this.languagesAvailable.indexOf(this.language);
        const newIdx = (curIdx + dl) % maxIdx;
        const newLanguage = this.languagesAvailable[newIdx];
        this.setLanguage(newLanguage);
    }

    clampQuestionIndexSafe(idx:number)
    {
        return clamp(idx, 0, this.db.countQuestions() - 1);
    }

    clampQuestionIndex(idx:number)
    {
        if(!this.db) { return idx; }
        return clamp(idx, -1, this.db.countQuestions());
    }

    getCurrentTranslations()
    {
        return this.translations[this.language] ?? this.translations[DEFAULT_UI_LANGUAGE];
    }

    getCurrentQuestionDatabase()
    {
        if(!this.db) { return null; }
        if(this.isMonoLanguage()) { return this.db; }
        return this.databasesByLanguage.get(this.getCurrentLanguage());
    }

    storeLoadedQuestions(questions:Question[])
    {
        this.questionsRaw = questions;
    }

    registerLanguages(questions:Question[], quiz:Quiz)
    {
        // Use the given default language; if unavailable, pick first one alphabetically.
        const uniqueLanguages = Array.from(new Set(questions.map((x) => x.getPropertyAsValue("language"))));
        const languagesSorted = uniqueLanguages.sort((a,b) => {
            return a.localeCompare(b, "en", { sensitivity: "variant", numeric: true });
        });

        quiz.params.languageDefault = quiz.params.languageDefault ?? languagesSorted[0];
        if(!uniqueLanguages.includes(quiz.params.languageDefault)) { quiz.params.languageDefault = languagesSorted[0]; }
        this.languagesAvailable = uniqueLanguages;
        this.language = quiz.params.languageDefault;
        this.languageRoot = this.language;
    }

    finalize(quiz:Quiz)
    {
        this.saveQuestionsByLanguage(this.questionsRaw, quiz);
        this.randomizeAndSyncDatabases(quiz);
    }

    saveQuestionsByLanguage(questions:Question[], quiz:Quiz)
    {
        // now we split this long list of questions (while strictly keeping order!) by language code
        // (for most quizzes, this will just be put into a single one called "unknown" as language is not set and doesn't matter)
        const questionsByLanguage : Map<string,Question[]> = new Map();
        for(const q of questions)
        {
            const language = q.getPropertyAsValue("language");
            if(!questionsByLanguage.has(language)) { questionsByLanguage.set(language, []); }
            questionsByLanguage.get(language).push(q);
        }

        // SANITY CHECK: All languages need equally many questions (otherwise some will lack translations)
        const numLanguages = questionsByLanguage.size ?? 1;
        const requiredLength = Math.round(questions.length / numLanguages);
        for(const lang of questionsByLanguage.keys())
        {
            const langLength = questionsByLanguage.get(lang).length;
            if(langLength == requiredLength) { continue; }
            showMessage(`Fatal Error: Language ${lang} has the wrong number of questions (${langLength} vs ${requiredLength})`)
        }

        // Create the main database for the main language
        this.db = new QuestionDatabase(questionsByLanguage.get(this.languageRoot));

        // Then create all the others (which SHOULD maintain order and set exactly the same IDs to match translations)
        this.databasesByLanguage = new Map();
        for(const [languageCode,questions] of questionsByLanguage.entries())
        {
            const dbLang = new QuestionDatabase(questions);
            this.databasesByLanguage.set(languageCode, dbLang);
        }
    }

    randomizeAndSyncDatabases(quiz:Quiz)
    {   
        this.db.randomize(quiz);

        for(const [languageCode,dbLang] of this.databasesByLanguage.entries())
        {
            dbLang.matchDatabase(this.db);
        }

        this.db.randomizeUnsynced(quiz);
    }
}