import { toWhiteSpaceString } from "../tools/helpers"
import { markdownify } from "../tools/markdownify"
import type { QuizParams } from "../tools/params"
import { isExternalURL, parsePathToID } from "../tools/parser"
import { addMissingQuestionValuesToList, createQuestionTyperForQuestion, finalizeQuestionData, getQuestionTyperForType, type QuestionData, type QuestionDataDynamic, RANDOMIZED_PROPS } from "../tools/questions"
import type { QuestionTyper } from "../typer/questionTyper"
import { Statistics } from "./questionDatabase"
import { QVal, QValType } from "./questionValue"
import { QValRandom } from "./questionValueRandom"
import type { Section } from "./section"

export enum QuestionType
{
    OPEN = "open", // an open question, only question displayed and nothing else
    CHOICE = "choice", // several options are displayed (labeled A, B, ...) People must pick the correct one(s).
    LIST = "list", // no options are displayed. People are expected to give multiple answers.
    RANGE = "range", // open question where people must give a number. If it falls within the error margin (`Range`) set by question, it's deemed correct.
    SECTION = "section", // not a question, but an intermediate section screen.
    SORT = "sort", // answers are given, you just need to sort them => @TODO: Interactive not implemented yet
    CUSTOM = "custom", // absolutely nothing is automatically done or given, customize however you like
}

export enum ItemOrder
{
    SHUFFLE = "shuffle",
    KEEP = "keep",
}

export class Question
{
    params: QuestionDataDynamic;
    paramsRaw: QuestionData;

    // specific object that will handle specific needs of this type; not sure if `typer` is a good name, but I wanted something short, active, and different from just `type`
    typer: QuestionTyper;
    sectionObject: Section 
    indexRelative: number // question number in relative order (if a section, index of SECTIONS; if question, index with SECTIONS REMOVED)
    failed: boolean = false;
    stats: Statistics;

    answers: QValRandom
    media: QValRandom

    hiddenAtExport: boolean;
    hiddenAtPlay: boolean;
    formatText: boolean;
    syncAllProperties: boolean;

    fromData(qData:QuestionData, quizParams:QuizParams)
    {
        this.paramsRaw = qData;
        this.params = finalizeQuestionData(this, quizParams);

        // any special properties (that are NOT just a string-based QVal) set here
        // @NOTE: they also usually read from paramsRaw instead of params
        this.hiddenAtExport = this.paramsRaw.hiddenAtExport ?? false;
        this.hiddenAtPlay = this.paramsRaw.hiddenAtPlay ?? false;
        this.formatText = this.paramsRaw.formatText ?? !quizParams.disableTextFormatting;
        this.syncAllProperties = this.paramsRaw.syncAll ?? quizParams.syncPropertiesWithTranslations;

        for(const prop of RANDOMIZED_PROPS)
        {
            this[prop] = new QValRandom(this.params[prop], this.paramsRaw[prop + "order"])
        }

        this.typer = createQuestionTyperForQuestion(this);
        this.failed = this.params._failed && this.params._failed.length <= 0;
    }

    getID() { return this.params.id ? this.getPropertyAsValue("id") : ""; }
    setID(id:string) { this.params.id = [new QVal(id)]; }
    getSection() { return this.params.section ? this.getPropertyAsValue("section") : ""; }
    getType() { return this.params.type ? this.getPropertyAsValue("type") as QuestionType : QuestionType.OPEN }
    getQuestion() { return toWhiteSpaceString(this.getPropertyAsList("question")); }
    getQuestionFormatted() { return toWhiteSpaceString(this.formatText ? this.getPropertyAsListFormatted("question") : this.getPropertyAsList("question")); }
    getLanguage() { return this.params.language ? this.getPropertyAsValue("language") : "" }

    hasQuestion() { return this.params.question.length >= 1; }
    hasAnswers() { return this.answers.count() >= 1; }
    hasCorrectAnswer() { return this.params.correct.filter((x) => x.isValid()).length == this.countCorrectAnswers(); }
    countCorrectAnswers() { return this.params.correct.length; }

    isHiddenAtExport() { return this.hiddenAtExport }
    isHiddenAtPlay() { return this.hiddenAtPlay }

    canHaveMultipleCorrect() { return this.shouldHaveMultipleAnswers(); }
    shouldHaveMultipleAnswers() { return getQuestionTyperForType(this.getType()).needsMultipleAnswers }
    shouldHaveOneAnswer() { return [QuestionType.OPEN, QuestionType.RANGE].includes(this.getType()); }

    hasMultipleAnswers() { return this.countCorrectAnswers() > 0; }

    hasMedia() { return this.media.count() >= 1; }

    shuffle(params:QuizParams, rng) 
    {
        if(!params.keepAnswerOrder && !this.typer.disableAnswerRandomization)
        {
            this.answers.shuffle(rng.answers);
        }

        if(params.randomizeMedia && !this.typer.disableMediaRandomization)
        {
            this.media.shuffle(rng.media);
        }
    }

    getIndexReadable() { return (this.indexRelative ?? 0) + 1; }

    isOpen() { return !this.typer.showsAnswers }
    isSection() { return this.getType() == QuestionType.SECTION; }

    isValid() { return !this.failed; }

    getScoreRaw() { return this.params.score[0].get(); }
    getScore() { return this.isSection() ? 0 : parseInt(this.getScoreRaw()); }
    getScoreMaximum()
    {
        if(this.isSection()) { return 0; }
        const scorePerCorrect = parseFloat(this.getScoreRaw()) ?? 1;
        const numCorrectAnswers = this.countCorrectAnswers() ?? 1;
        return scorePerCorrect * numCorrectAnswers;
    }

    formatTextIfNeeded(val:string) 
    { 
        if(!this.formatText) { return val; }
        return markdownify(val);
    }

    formatTextListIfNeeded(val:string[]) 
    { 
        if(!this.formatText) { return val; }
        return val.map((x) => markdownify(x));
    }

    getScoreTextFormatted() { return this.formatTextIfNeeded(this.getScoreText()); }
    getScoreText()
    {
        let str = this.getScoreRaw();
        if(this.params.scoremethod)
        {
            str += " (<span class='metadata-score-method'>" + this.params.scoremethod[0].get() + "</span>)";
        }
        return str;
    }

    isRange() { return this.getType() == QuestionType.RANGE; }
    getRange() { return this.params.range ? parseFloat(this.params.range[0].get()) : 0; }

    hasTimer() { return this.getTimer() > 0; }
    getTimer() { return this.params.timer ? parseInt(this.params.timer[0].get()) : 0; }

    getSecret() { return this.params.secret ? this.getPropertyAsValue("secret") : ""; }
    getHintsFormatted() { return this.formatTextListIfNeeded(this.getHints()); }
    getHints() { return (this.params.hints && this.params.hints.length > 0) ? this.getPropertyAsList("hints") : [] }
    getSources()
    {
        if(!this.params.sources || this.params.sources.length <= 0) { return ""; }
        const sourcesFormatted = this.getPropertyAsList("sources").map((x) => isExternalURL(x) ? `<a href="${x}">${x}</a>` : x);
        return sourcesFormatted.join(", ");
    }

    getPropertyAsValueFormatted(prop:string, qVal = QValType.ALL) : string
    {
        return this.formatTextIfNeeded(this.getPropertyAsValue(prop, qVal));
    }

    getPropertyAsValue(prop:string, qVal = QValType.ALL) : string
    {
        const values = this.getPropertyAsList(prop, qVal);
        if(!values) { return ""; }
        if(!Array.isArray(values)) { return values; }
        return values[0] ?? "";
    }

    getPropertyAsListFormatted(prop:string, qVal = QValType.ALL) : string[]
    {
        return this.formatTextListIfNeeded(this.getPropertyAsList(prop, qVal));
    }

    getPropertyAsList(key:string, type:QValType = QValType.ALL) : string[]
    {
        let list = this.params[key];

        const isSpecialRandomizedProperty = RANDOMIZED_PROPS.includes(key);
        if(isSpecialRandomizedProperty) { list = this[key].get(); }

        if(!list) { return []; }
        if(!Array.isArray(list)) { list = [list]; }

        const arr = [];
        let matches = [QValType.QUESTION, QValType.ALL, QValType.ANSWER];
        if(type == QValType.QUESTION) { matches = [QValType.QUESTION, QValType.ALL]; }
        else if(type == QValType.ANSWER) { matches = [QValType.ANSWER, QValType.ALL]; }

        for(const elem of list)
        {
            if(!(elem instanceof QVal)) { arr.push(elem); continue; } // raw properties are just instantly added
            if(!matches.includes(elem.type)) { continue; }
            arr.push(elem.get());
        }

        return arr;
    }

    // @TODO: might move to interactive/grader code instead, as the functionality is for THAT
    isCorrectAnswer(val:string) { return this.getCorrectAnswerIndex(val) >= 0; }
    getCorrectAnswerIndex(val:string)
    {
        const correctAnswers = this.getCorrect();
        for(let i = 0; i < correctAnswers.length; i++)
        {
            const valCorrect = correctAnswers[i];
            
            // range questions are converted to numbers and checked if close enough
            if(this.isRange())
            {
                const valCorrectNum = parseFloat(valCorrect);
                const valNum = parseFloat(val);
                const withinRange = Math.abs(valNum - valCorrectNum) <= this.getRange();
                if(!withinRange) { continue; }
                return i;
            }

            // anything else just needs a precise string match with an answer
            if(valCorrect == val || valCorrect == parsePathToID(val)) { return i; }
        }
        return -1;
    }

    getCorrect(qValType = QValType.ALL)
    {
        const rawValues = this.getPropertyAsList("correct", qValType);
        if(!this.canHaveMultipleCorrect() && rawValues.length > 1) { return [toWhiteSpaceString(rawValues)]; }
        return rawValues;
    }

    getAnswers(qValType = QValType.ALL)
    {
        const rawValues = this.getPropertyAsList("answers", qValType);
        // fail-safe: if we get multiple values, but we shouldn't, they're just combined into one string and returned
        if(!this.shouldHaveMultipleAnswers() && rawValues.length > 1) { return [toWhiteSpaceString(rawValues)]; }
        return rawValues;
    }

    toString() { return "<strong>&ldquo;" + this.getPropertyAsList("question").join(" ") + "&rdquo;</strong>"; }

    syncWith(q:Question)
    {
        // no sense syncing with ourselves :p
        if(this == q) { return; }

        this.indexRelative = q.indexRelative;

        // only if enabled (we often don't want/need this), 
        // check for any properties we don't have ourselves, and populate that with translation
        const propertiesChanged = [];
        if(this.syncAllProperties)
        {
            const otherParams = q.params;
            const allUniqueProperties = Array.from(new Set(Object.keys(this.params).concat(Object.keys(q.params))));
            for(const prop of allUniqueProperties)
            {
                const theirValue = otherParams[prop];
                const theyHaveData = theirValue != null && theirValue.length > 0;
                if(!theyHaveData) { continue; }

                // @NOTE: we look at RAW params, because final values have lots of defaults filled in by system
                const currentValue = this.params[prop];
                const weHaveData = this.paramsRaw[prop] != null; 
                if(weHaveData) { continue; }
                
                /*
                // If we have data, only add missing values => 
                // @NOTE: DISABLED THIS BECAUSE IT LEADS TO A BUNCH OF ISSUES AND JUST ISN'T WORTH IT
                // I'd need to define which properties are allowed to sync + which are allowed to be a list (and which are not) + bleh
                const newValues = addMissingQuestionValuesToList(currentValue, theirValue);
                if(newValues.length > currentValue.length)
                {
                    this.params[prop] = newValues;
                    propertiesChanged.push(prop)
                }
                continue;
                */

                // If we have no data at all, override/set from other question entirely
                this.params[prop] = theirValue.slice();
                propertiesChanged.push(prop)
            }
        }

        // @NOTE: Must come after the `syncAllProperties` bit, as that might CHANGE our answers/media!
        // QValRandom stuff has its own syncing logic
        for(const prop of RANDOMIZED_PROPS)
        {
            if(propertiesChanged.includes(prop)) { this[prop].updateInput(this.params[prop]); }
            (this[prop] as QValRandom).sync(q[prop]);
        }
    }
}