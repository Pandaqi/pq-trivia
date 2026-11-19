import { ItemOrder, type Question, QuestionType } from "../questions/question";
import { QVal, QValType } from "../questions/questionValue";
import { showMessage } from "./errorHandler";
import { DEFAULT_AUTHOR, DEFAULT_CATEGORY, DEFAULT_SCORE, type QuizParams } from "./params";
import { DEF_SECTION_NAME, parseQuestionProperty } from "./parser";
import { QuestionTyperChoice } from "../typer/questionTyperChoice"
import { QuestionTyperCustom } from "../typer/questionTyperCustom"
import { QuestionTyperList } from "../typer/questionTyperList"
import { QuestionTyperOpen } from "../typer/questionTyperOpen"
import { QuestionTyperRange } from "../typer/questionTyperRange"
import { QuestionTyperSection } from "../typer/questionTyperSection"
import { QuestionTyperSort } from "../typer/questionTyperSort"

export const RANDOMIZED_PROPS = ["answers", "media"];

export const QUESTION_TYPER_CLASSES:Record<QuestionType,any> =
{
    [QuestionType.OPEN]: QuestionTyperOpen,
    [QuestionType.CHOICE]: QuestionTyperChoice,
    [QuestionType.LIST]: QuestionTyperList,
    [QuestionType.RANGE]: QuestionTyperRange,
    [QuestionType.SECTION]: QuestionTyperSection,
    [QuestionType.SORT]: QuestionTyperSort,
    [QuestionType.CUSTOM]: QuestionTyperCustom,
}

export type QuestionDataValue = string|string[]
export type QuestionDataDynamic = Record<string,QVal[]>;
export interface QuestionData
{
    type?: QuestionType,
    id?: string,

    // name of current section 
    // for clarity, this is equal to the `.section` on the Question object that marks the start of the round (the one saved in `.start` of the Section object)
    // (in other words, the ID of a section is NOT USED for linking QUESTIONS to SECTIONS)
    section?: string,

    media?: QuestionDataValue,
    mediaOrder?: ItemOrder,

    answers?: QuestionDataValue,
    answersOrder?: ItemOrder,

    question?: QuestionDataValue,
    comment?: QuestionDataValue,
    category?: QuestionDataValue,
    correct?: QuestionDataValue,
    author?: QuestionDataValue,

    score?: number,
    scoremethod?: string,
    language?: string,
    timer?: number,
    range?: number,

    secret?: string, // only applies to Sections => rounds can have a secret "theme", and guessing it will help answer questions
    hints?: QuestionDataValue, // only applies to Questions => bonus hints that are not shown by default but can be revealed one at a time
    sources?: QuestionDataValue,

    placeat?: number,
    placebefore?: QuestionDataValue,
    placeafter?: QuestionDataValue,
    
    hiddenAtExport?: boolean,
    hiddenAtPlay?: boolean,
    formatText?: boolean,
    syncAll?: boolean,
}

export const createHiddenSection = (q:QuestionData, params:QuizParams) : QuestionData =>
{
    const sectionName = q.section ?? DEF_SECTION_NAME;
    const s = {
        type: QuestionType.SECTION,
        section: sectionName,
        question: "",
        hiddenAtPlay: true, 
        hiddenAtExport: true,
    }

    if(params.addMissingSectionScreens)
    {
        s.question = sectionName;
        s.hiddenAtPlay = false;
    }

    return s;
}

export const invalidateQuestionData = (data:QuestionDataDynamic) =>
{
    data._failed = [];
}

export const propertyAlreadyHasData = (obj:QuestionData, prop:string) =>
{
    const val = obj[prop];
    if(!val) { return false; }
    if(Array.isArray(val)) { return val.length > 0; }
    if(!Array.isArray(val) && typeof val == "object") { return Object.keys(val).length > 0; }
    return val.toString().trim().length > 0;
}

export const updateQuestionDataProperty = (q:QuestionData, prop:string, val:string|string[], params:QuizParams = {}) =>
{
    if(!Array.isArray(val)) { val = [val]; }
    if(val.length <= 0) { return; }

    const propertyIsArray = Array.isArray(q[prop]);
    if(!propertyIsArray) { q[prop] = [q[prop] ?? ""].filter((x) => x != ""); } // filter makes sure no undefined values are added

    q[prop].push(...val);
}

export const convertQuestionDataToDynamic = (q:QuestionData, prop:string, val:string[], params:QuizParams = {}) =>
{
    if(val.length <= 0) { return; }

    // parse the string into final form (QVal objects), check if still correct
    const valParsed : QVal[] = parseQuestionProperty(prop, val, params);
    if(valParsed.length <= 0)
    {
        showMessage(`Can't set property ${prop} to empty value: ${val}`);
        return;
    }

    // if property doesn't exist yet, create empty array
    // if property already exists but not an array, turn it into one
    const propertyIsArray = Array.isArray(q[prop]);
    if(!propertyIsArray)
    { 
        q[prop] = [q[prop] ?? ""].filter((x) => x != ""); 
    }

    // then simply add the new elements
    q[prop].push(...valParsed);
}

export const questionDataMatchesSection = (a:QuestionData, b:QuestionData) =>
{
    if(!a.section) { return false; }
    if(!b.section) { return false; }
    return a.section == b.section;
}

export const getQuestionDataPropertyAsList = (data: QuestionDataDynamic, key:string, type:QValType = QValType.ALL) : string[] =>
{
    let list = data[key];
    if(!list) { return []; }
    if(!Array.isArray(list)) { list = [list]; }

    const arr = [];
    let matches = [QValType.QUESTION, QValType.ALL, QValType.ANSWER];
    if(type == QValType.QUESTION) { matches = [QValType.QUESTION, QValType.ALL]; }
    else if(type == QValType.ANSWER) { matches = [QValType.ANSWER, QValType.ALL]; }

    for(const elem of list)
    {
        if(!matches.includes(elem.type)) { continue; }
        arr.push(elem.get());
    }

    return arr;
}

export const finalizeQuestionData = (q:Question, params:QuizParams) : QuestionDataDynamic =>
{
    // convert each parameter to a QVal[] and save on object
    // this merely ensures it's all there and in the right FORMAT
    const obj : QuestionDataDynamic = {};
    for(const [key, data] of Object.entries(q.paramsRaw))
    {
        let dataFormatted = data;
        if(!Array.isArray(data)) { dataFormatted = [dataFormatted]; }
        dataFormatted.map((x) => x.toString());

        const isValidData = dataFormatted.filter((x) => typeof x != "string").length <= 0;
        if(!isValidData) { continue; }
        convertQuestionDataToDynamic(obj, key, dataFormatted, params);
    }

    // now actually check the value/meaning and make sure it's correct
    if(!obj.id) { obj.id = [new QVal()] }

    finalizeType(obj, params); // @NOTE: must come before the others; order doesn't matter for the rest
    finalizeLanguage(obj, params);
    finalizeAnswers(obj);
    finalizeCorrectAnswer(obj, params);
    finalizeMedia(obj);
    finalizeCategories(obj, params);
    finalizeAuthors(obj, params);
    finalizeScore(obj, params);
    finalizeHolistic(obj, params);
    
    return obj;
}

export const getQuestionTyperForType = (type:QuestionType) =>
{
    return QUESTION_TYPER_CLASSES[type];
}

export const createQuestionTyperForQuestion = (q:Question) =>
{
    return new QUESTION_TYPER_CLASSES[q.getType()](q); 
}

export const finalizeType = (data:QuestionDataDynamic, params:QuizParams) =>
{  
    let typeInferred = QuestionType.OPEN;
    if(data.range) { typeInferred = QuestionType.RANGE; }
    if((data.answers && data.answers.length > 1) || (data.correct && data.correct.length > 1)) { typeInferred = QuestionType.CHOICE; }

    data.type = data.type ?? [new QVal(typeInferred)];

    const finalType = data.type[0].get();
    if(!(finalType in QUESTION_TYPER_CLASSES))
    {
        showMessage(`Question has a question type that does not exist: ${finalType}. (Removed from quiz.)`, this);
        invalidateQuestionData(data);
        return false;
    }

    if(params.questionTypesAllowed.length > 0 && !params.questionTypesAllowed.includes(finalType))
    {
        showMessage(`Question has a forbidden question type: ${finalType}. (Removed from quiz.)`, this);
        invalidateQuestionData(data);
        return false;
    }
}

export const finalizeLanguage = (data:QuestionDataDynamic, params:QuizParams) =>
{
    if(!data.language) { return; }
    const customLanguage = data.language[0].get();
    if(params.languages.length > 0 && !params.languages.includes(customLanguage))
    {
        showMessage(`Question has a language (${data.language}) that is not in the supported languages (${params.languages})`, this);
        invalidateQuestionData(data);
        return false;
    }
    return true;
}

export const finalizeAnswers = (data:QuestionDataDynamic) =>
{
    if(!data.answers) { data.answers = []; }

    const answersSanitized = [];
    const stringAnswers = [];
    const duplicateAnswers = [];
    for(const answer of data.answers)
    {
        const answerString = answer.get();
        const existsEarlier = stringAnswers.includes(answerString);
        if(existsEarlier) { duplicateAnswers.push(answerString); continue; }
        answersSanitized.push(answer);
        stringAnswers.push(answerString);
    }

    if(duplicateAnswers.length > 0)
    {
        showMessage(`Question has identical answers (${duplicateAnswers.join(", ")}). Removed the duplicates.`, this);
    }

    data.answers = answersSanitized;
}

export const finalizeMedia = (_data:QuestionDataDynamic) =>
{
    // @TODO: this became useless after refactor
}

export const finalizeCategories = (data:QuestionDataDynamic, params:QuizParams) =>
{
    if(!data.category || data.category.length <= 0) { data.category = [new QVal(params.defaultCategory.toLowerCase())]; }
    if(params.possibleCategories)
    {
        for(const cat of data.category)
        {
            if(params.possibleCategories.includes(cat.get())) { continue; }
            showMessage(`Question has category ${cat} which is not a possible category`, this);
        }
    }
}

export const finalizeCorrectAnswer = (data:QuestionDataDynamic, params:QuizParams) =>
{
    const type = data.type[0].get() as QuestionType;
    const isSection = type == QuestionType.SECTION
    if(isSection) { data.correct = []; return; }

    // default to first answer if nothing set
    if(!data.correct || data.correct.length <= 0) { data.correct = [data.answers[0]]; }

    // special question types that should automatically mark all answers correct
    const typer = getQuestionTyperForType(type);
    if(typer.allAnswersAreCorrect) { data.correct = data.answers.slice(); }

    let allCorrectAnswersIncluded = true;

    // we only care about matching answers on multiple choice
    if(typer.correctAnswersMustMatch)
    {
        const list = getQuestionDataPropertyAsList(data, "answers", QValType.QUESTION);
        const listLowercase = list.map((x) => x.toLowerCase());
        for(let i = 0; i < data.correct.length; i++)
        {
            const val = data.correct[i].get();

            // safeguard against some annoying situations
            const correctAnswerIsVisible = data.correct[i].type != QValType.ANSWER;
            if(!correctAnswerIsVisible)
            {
                showMessage(`A question's correct answer is not "question visible"`, this);
                allCorrectAnswersIncluded = false;
                break;
            }

            // easiest case: correct answer included, great, stop here
            if(list.includes(val)) { continue; }

            // a different version is included, modify and stop here
            if(listLowercase.includes(val.toLowerCase()))
            {
                const answer = list[listLowercase.indexOf(val.toLowerCase())];
                showMessage(`Question had a correct answer (${val}), but spelled differently from the real one (${answer})`, this);
                data.correct[i] = new QVal(answer);
                continue;
            }

            // if all fails, all fails
            allCorrectAnswersIncluded = false;
            break;
        }
    }

    // fail-safe: if still not included, mention it and try our best with the first answer
    if(!allCorrectAnswersIncluded) 
    { 
        showMessage(`Question has no (or not enough) valid answers.`, this);
        data.correct = [data.answers[0]];
    }
}

export const finalizeScore = (data:QuestionDataDynamic, params:QuizParams) =>
{
    const score = data.score ? parseInt(data.score[0].get()) : params.defaultScore;
    let scoreSanitized = score;
    if(score > params.maxScore || score < params.minScore)
    {
        showMessage(`Question has a score that's too high or too low: ${score}. (Modified to fit within bounds.)`, this);
        scoreSanitized = Math.max(Math.min(score, params.maxScore), params.minScore);
    }
    data.score = [new QVal(scoreSanitized.toString())];
}

export const finalizeAuthors = (data:QuestionDataDynamic, params:QuizParams) =>
{
    if(!data.author || data.author.length <= 0) { data.author = [new QVal(params.defaultAuthor.toLowerCase())]; }

    if(params.possibleAuthors)
    {
        for(const author of data.author)
        {
            if(params.possibleAuthors.includes(author.get())) { continue; }
            showMessage(`Question has author ${author} which is not a possible author`, this);
        }
    }
}

export const finalizeHolistic = (data:QuestionDataDynamic, params:QuizParams) =>
{
    const type = data.type[0].get() as QuestionType;
    const typer = getQuestionTyperForType(type);
    if(typer.needsMultipleAnswers)
    {
        const tooFewAnswers = data.answers.length < (params.minAnswers ?? 2);
        if(tooFewAnswers) { showMessage(`Multiple choice question has too few answers (${data.answers.length})`, this); }

        const tooManyAnswers = data.answers.length > (params.maxAnswers ?? Infinity);
        if(tooManyAnswers) { showMessage(`Multiple choice question has too many answers (${data.answers.length}).`, this); }
    }

    const hasVisibleQuestion = getQuestionDataPropertyAsList(data, "question", QValType.QUESTION).length > 0;
    const hiddenAtPlay = data.hiddenAtPlay && data.hiddenAtPlay[0].get();
    if(!hasVisibleQuestion && !hiddenAtPlay)
    {
        const answers = getQuestionDataPropertyAsList(data, "answers");
        showMessage(`Question has no VISIBLE question text. (Answers for identification = ${answers}).`, this);
        invalidateQuestionData(data);
    }

    const isSection = type == QuestionType.SECTION
    const hasEnoughCorrectAnswers = data.correct.length > 0 || isSection;
    if(!hasEnoughCorrectAnswers)
    {
        showMessage(`Question has no CORRECT answer(s). (And is not a section.)`, this);
        invalidateQuestionData(data);
    }

    const answersVisible = getQuestionDataPropertyAsList(data, "answers", QValType.QUESTION);
    const hasVisibleAnswersIfNeeded = type != QuestionType.CHOICE || answersVisible.length > 0;
    if(!hasVisibleAnswersIfNeeded)
    {
        showMessage(`Question has no VISIBLE answer(s), but its type needs them.`, this);
        invalidateQuestionData(data);
    }

    if(data._failed)
    {
        showMessage(`Question wants to be finalized, but isn't valid. Removed from quiz.`, this);
    }
}

export const isQuestionPropertyDefault = (q:Question, prop:string, val:string[]) =>
{
    if(val.length <= 0) { return true; } // most things are empty by default

    const valSingle = val[0].toLowerCase();
    if(prop == "category") { return valSingle == DEFAULT_CATEGORY.toLowerCase(); }
    if(prop == "author") { return valSingle == DEFAULT_AUTHOR.toLowerCase(); }
    if(prop == "score") { return parseInt(valSingle) == DEFAULT_SCORE; }

    if(prop == "correct")
    {
        // single answer = open question, no need to save correct
        if(q.answers.count() <= 1) { return false; }

        // ALL answers are correct = no need to save
        if(q.answers.count() <= val.length) { return false; }
    }

    return false;
}

export const addMissingQuestionValuesToList = (a:QVal[], b:QVal[]) =>
{
    const arr = a.slice();
    const arrValues = arr.map((x) => x.get());
    for(const elem of b)
    {
        const val = elem.get();
        if(arrValues.includes(val)) { continue; }
        arr.push(elem);
        arrValues.push(val);
    }
    return arr;
}