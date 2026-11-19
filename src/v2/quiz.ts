import { DOM } from "./interactive/dom";
import { Exporter } from "./exporter/exporter";
import { StorageInteractive } from "./interactive/storageInteractive";
import { Loader, SubLoader } from "./loader/loader";
import { Nodes } from "./nodes/nodes";
import type { Question } from "./questions/question";
import { ErrorHandler, showMessage } from "./tools/errorHandler";
import { initializeParameters, QuizParams } from "./tools/params";
import { Timer, TimerStrategy } from "./tools/timer";
import { translate, Translator } from "./translator/translator";
import { loaderBuiltIn } from "./loader/loaderBuiltIn";
import { refreshTheme, type QuizTheme } from "./theme/quizTheme";

export enum QuizMode
{
    QUESTIONS,
    ANSWERS
}

export enum QuizState
{
    LOAD = "load", // select what/how to load questions, then do it
    START = "start", // welcome screen, press button for how to play
    SETTINGS = "settings", // for modifying your settings
    PLAYING = "playing", // busy showing questions and stuff
    END = "end", // reached the end
}

export const VERSION = "2.5.0";

export class Quiz
{
    // data
    params: QuizParams;

    // modules/objects handling specific parts of the system
    loader: Loader;
    nodes: Nodes;
    dom: DOM;
    errorHandler: ErrorHandler;
    export: Exporter
    storage: StorageInteractive;
    translator: Translator;

    // current play/quiz state
    seedOriginal: string;
    themes: QuizTheme[];
    mode: QuizMode;
    questionMode: QuizMode;
    state: QuizState;
    counter: number;
    interactive: boolean; // whether we're playing interactively right now (not whether it's allowed/possible)

    // @TODO: timers might become their own module too at some point; not really needed when it's just two tiny bits of code now
    timerGlobal: Timer;
    timerQuestion: Timer;

    constructor(params:QuizParams = {})
    {
        this.params = initializeParameters(params);
        this.seedOriginal = this.params.seed;
        this.translator = new Translator(params); // translations need to be set and picked before loading anything else, as they might contain text to be translated

        this.counter = -1;
        this.mode = QuizMode.QUESTIONS;
        this.questionMode = QuizMode.QUESTIONS;
        this.state = QuizState.LOAD;

        this.loader = new Loader(params);
        this.errorHandler = new ErrorHandler(params);
        this.export = new Exporter(this);
        this.storage = new StorageInteractive(params.id);
        this.dom = new DOM(this);

        this.nodes = new Nodes(params);
        this.nodes.createHTML(this);
        this.themes = this.nodes.loadThemes(params);

        this.timerGlobal = new Timer({ hidden: params.hideTimerGlobal, countDown: false });
        this.timerQuestion = new Timer({ hidden: params.hideTimerQuestion, default: params.defaultTimer, strategy: params.timerStrategy, countDown: true })
        this.timerQuestion.addTimeoutListener((timer) => 
        {
            if(timer.strategy == TimerStrategy.NOTHING) { return; }
            else if(timer.strategy == TimerStrategy.AUTO_CONTINUE) { this.gotoNext(); }
            else if(timer.strategy == TimerStrategy.STAY_BUT_HIDE) { this.nodes.hideQuestion(); }
        });


        // finally, this starts the whole thing
        this.changeState(QuizState.LOAD);

        console.log("### Created Quiz Object ###");
        console.log(this);
    }

    async load(subLoader:SubLoader)
    {  
        const questions = await this.loader.load(subLoader);
        if(questions.length <= 0) { showMessage(`Fatal Error: No questions loaded!`); return; }
        this.translator.storeLoadedQuestions(questions);
        this.translator.registerLanguages(questions, this);
        this.finalizeQuestions();
        this.changeState(QuizState.START);
    }

    start()
    {
        this.finalizeQuestions();
        this.restart();
    }

    finalizeQuestions()
    {   
        this.translator.finalize(this);
        this.nodes.savePermanentMessage(translate(`[ui-stats-message]`, this, { stats: this.translator.db.getStatistics() }));
    }

    stopTimer() { this.timerGlobal.stop(); }
    startTimer()
    {
        if(this.timerGlobal.isRunning()) { this.timerGlobal.stop(); }
        this.timerGlobal.setNode(this.nodes.nodesUI.timerGlobal);
        this.timerGlobal.start();
    }

    gotoQuestionMode() { this.mode = QuizMode.QUESTIONS; }
    gotoAnswerMode() { this.mode = QuizMode.ANSWERS; }

    atStart() { return this.counter < 0; }
    gotoStart() 
    { 
        if(this.isSafetyEnabled() && !confirm(translate(`[ui-skip-start-safety-message]`, this))) { return; }
        this.changeQuestion(-Infinity); 
    }

    atEnd() { return this.counter >= this.translator.countQuestions(); }
    gotoEnd() 
    { 
        if(this.isSafetyEnabled() && !confirm(translate(`[ui-skip-end-safety-message]`, this))) { return; }
        this.changeQuestion(Infinity); 
    }

    gotoNext()
    {
        this.changeQuestion(+1);
    }

    gotoPrevious()
    {
        this.changeQuestion(-1);
    }

    getCounter(c = this.counter)
    {
        return this.translator.clampQuestionIndex(c);
    }

    gotoNextSection()
    {
        console.log(this.translator.db, this.counter);
        const section = this.translator.db.getSection(this.getCounter(), "next");
        const questionIndex = section ? this.translator.db.getIndexForSectionStart(section) : Infinity;
        this.setQuestion(questionIndex);
    }

    gotoPreviousSection()
    {
        const section = this.translator.db.getSection(this.getCounter(), "prev");
        const questionIndex = section ? this.translator.db.getIndexForSectionStart(section) : -Infinity;
        this.setQuestion(questionIndex);
    }

    restart()
    {
        this.counter = -1;
        this.changeQuestion(+1);
    }

    reset()
    {
        this.counter = -1;
        this.changeQuestion(0);
    }

    isSectionFiltered(s:string) { return this.params.filterSections.length <= 0 || this.params.filterSections.includes(s); }
    setSectionsFilter(f:string[]) { this.params.filterSections = f ?? []; }

    exit()
    {
        this.changeState(QuizState.LOAD);
    }

    clear()
    {
        this.gotoQuestionMode();
        this.setInteractive(false);
        this.clearSettings();
    }

    // @TODO: maybe it's cleaner to have a "shutdown" callback on quiz settings that automatically calls these specific things
    clearSettings()
    {
        this.params.filterSections = [];
        this.params.seed = this.seedOriginal;
    }

    isInteractive() { return this.params.allowInput && this.interactive; }
    canBeInteractive() { return this.params.allowInput; }
    setInteractive(val:boolean) { this.interactive = val; }
    isRestricted() { return this.isInteractive(); }
    isSafetyEnabled() { return this.params.enableSafety; }

    isPlaying() { return this.state == QuizState.PLAYING; }
    changeState(s:QuizState)
    {
        this.state = s;
        this.nodes.onStateUpdate(this);
        if(s == QuizState.LOAD) { 
            this.clear();

            if(this.params.skipLoadingScreen || (this.params.skipLoadingScreenIfBuiltin && this.params.builtin))
            {
                this.load(loaderBuiltIn(this.params.builtin ?? {}));
            }

        } else if(s == QuizState.START) { 
            this.storage.clear();
        } else if(s == QuizState.END) { 
            this.stopTimer();
        } else if(s == QuizState.PLAYING) {
            this.resetQuestionAnswerMode();
            if(this.inQuestionMode()) { this.startTimer(); }
        }
    }

    reloadScreen()
    {
        this.changeState(this.state);
    }

    currentQuestionHasInput()
    {
        const curQuestion = this.getCurrentQuestion();
        if(curQuestion.isSection()) { return true; }
        const knownData = this.storage.loadAnswer(curQuestion);
        const knownDataHasAtLeastOneValue = knownData.filter((x:any) => x != undefined).length > 0;
        return knownDataHasAtLeastOneValue;
    }

    checkIfQuestionCanChange(newCounter:number)
    {
        // if we don't currently have a question loaded at all, of course we can change
        // (this also prevents errors in further calls such as `currentQuestionHasInput` because ... there is no current question :p)
        if(!this.getCurrentQuestion()) { return true; }

        if(this.isRestricted() && newCounter < this.counter)
        {
            showMessage(translate(`[ui-interactive-cant-go-back-error]`, this));
            return false;
        }

        if(this.isInteractive() && !this.currentQuestionHasInput())
        {
            showMessage(translate(`[ui-interactive-no-input-error]`, this));
            return false;
        }

        return true;
    }

    setQuestion(ind:number) 
    { 
        const offset = (this.counter ?? 0); // we need to compensate for where we are right now, to land exactly on this index
        this.changeQuestion(ind - offset); 
    }

    changeQuestion(dc:number)
    {
        if(this.state == QuizState.LOAD) { return; }
    
        // @NOTE: this allows -1 and #questions+1 (start and end screen)
        // Use the `Safe()` version to keep the index to existing questions only
        const newCounter = this.getCounter(this.counter + dc);

        const success = this.checkIfQuestionCanChange(newCounter);
        if(!success) { return; } 

        this.timerQuestion.stop();
        this.counter = newCounter;
        if(this.counter <= -1)
        {
            return this.changeState(QuizState.START);
        }

        if(this.counter >= this.translator.countQuestions())
        {
            return this.changeState(QuizState.END);
        }

        if(this.state != QuizState.PLAYING)
        {
            this.changeState(QuizState.PLAYING);
        }

        if(Math.abs(dc) > 0.005) { this.resetQuestionAnswerMode(); }
        this.loadQuestion(this.getCurrentQuestion());
    }

    loadQuestion(q:Question)
    { 
        this.nodes.showQuestion(q, this);
    }

    getCurrentDatabase()
    {
        return this.translator.getCurrentQuestionDatabase();
    }

    getCurrentQuestion()
    {
        // @NOTE: this only works so efficiently because we MATCH the order of questions exactly between all languages/translations at load
        // Without that, we'd have to FIND the question with the same ID in the other database each time
        const db = this.getCurrentDatabase();
        if(!db) { return null; }
        return db.getQuestionAt(this.counter); 
    }

    toggleAnswer()
    {
        if(this.isSafetyEnabled() && !confirm(translate(`[ui-toggle-answer-safety-message]`, this))) { return; }
        if(this.isRestricted()) { showMessage(translate(`[ui-restricted-no-answers-error]`, this)); return; }
        this.questionMode = this.inQuestionAnswerMode() ? QuizMode.QUESTIONS : QuizMode.ANSWERS;
        this.changeQuestion(0);
    }

    inAnswerMode()
    {
        return this.mode == QuizMode.ANSWERS || this.questionMode == QuizMode.ANSWERS;
    }

    inQuestionMode()
    {
        return this.mode == QuizMode.QUESTIONS && this.questionMode == QuizMode.QUESTIONS;
    }

    inQuizAnswerMode() { return this.mode == QuizMode.ANSWERS; }
    inQuestionAnswerMode() { return this.questionMode == QuizMode.ANSWERS; }
    resetQuestionAnswerMode() { this.questionMode = QuizMode.QUESTIONS; }

    toggleMode(suppressSafety = false)
    {
        if(this.isSafetyEnabled() && !suppressSafety && !confirm(translate(`[ui-toggle-mode-message]`, this))) { return; }
        if(this.isRestricted()) { showMessage(translate(`[ui-restricted-no-answers-error]`, this)); return; }
        if(this.inQuizAnswerMode()) { this.gotoQuestionMode(); }
        else { this.gotoAnswerMode(); }
        this.changeQuestion(0);
    }

    gotoSettings()
    {
        this.changeState(QuizState.SETTINGS);
    }

    gotoNextLanguage()
    {
        this.translator.advance(+1);
        const curQuestion = this.getCurrentQuestion();
        if(!curQuestion && this.isPlaying())
        {
            showMessage(`Switched to ${this.translator.getCurrentLanguage()}, but no matching question exists. Did not refresh page.`);
            return;
        }
        this.nodes.createToolbar(this); // refresh UI (so it recreates from new language)
        this.changeQuestion(0); // refresh question
    }

    toggleTheme()
    {
        this.params.themeDisabled = !this.params.themeDisabled;
        refreshTheme(this);
    }
}