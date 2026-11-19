import { ExportAnswersParams } from "../exporter/exporterAnswerSheet";
import { createAnswerNode } from "../nodes/createAnswerNode";
import { createMediaNode, createMediaNodeIfNeeded, transformMediaNodeForExportTarget } from "../nodes/createMediaNode";
import type { DynamicNodeParams } from "../nodes/createQuestionNode";
import { createTextNode } from "../nodes/createTextNode";
import type { Question } from "../questions/question";
import type { Quiz } from "../quiz";
import { translate } from "../translator/translator";

export interface GradeData
{
    isCorrect?: boolean,
    answersCorrect?: any[],
    answersGiven?: any[],
    score?: number,
}

export class QuestionTyper
{
    question: Question

    static allAnswersAreCorrect = false;
    static correctAnswersMustMatch = false;
    static needsMultipleAnswers = false;

    showsAnswers = false;

    disableAnswerRandomization = false;
    disableMediaRandomization = false;
    
    constructor(q:Question)
    {
        this.question = q;
    }
    
    // returns HTML nodes to display in answer section of question
    getAnswerNodes(quiz:Quiz, params:DynamicNodeParams) : HTMLElement[] 
    { 
        const arr = [];
        const div = createTextNode({ value: this.getAnswerTypeRemark(quiz) });
        if(div) { arr.push(div); }

        const shouldDisplayInteractiveInput = quiz.inQuestionMode() && quiz.isInteractive();
        if(shouldDisplayInteractiveInput) { arr.push(this.createInteractiveNode(quiz)); }

        const shouldDisplayAnswers = quiz.inAnswerMode();
        if(!shouldDisplayAnswers) { return arr; }

        const paramsAnswer = { value: this.question.getPropertyAsValue("correct", params.qValType) };
        arr.push(createAnswerNode(Object.assign(params,paramsAnswer), quiz))
        return arr;
    }

    // returns the basic message for how to answer this question
    getAnswerTypeRemark(quiz:Quiz) : string { return translate(`[question-open-answer-type]`, quiz); }

    // returns the proper media nodes (native Image/Audio/Video)
    getMediaNodes(quiz:Quiz, params:DynamicNodeParams) : HTMLElement[]
    {
        const media = this.question.getPropertyAsList("media", params.qValType);
        let counter = 0;
        const nodes = [];
        for(const mediaElement of media)
        {
            const mediaNode = createMediaNode(Object.assign(params, { number: counter, value: mediaElement }), quiz);
            const mediaNodeSanitized = transformMediaNodeForExportTarget(mediaNode, params.target);
            nodes.push(mediaNodeSanitized);
            counter++;
        }
        return nodes;
    }

    // returns HTML nodes for ANSWERS, for answer sheet/form
    // DEFAULT = open question, so display nothing if form, display full answer if sheet
    toAnswerSheet(params:ExportAnswersParams, quiz:Quiz) : HTMLElement 
    { 
        const qContent = document.createElement("td");
        if(!params.displayAnswers) { return qContent; }
        qContent.appendChild(createMediaNodeIfNeeded(this.question.getPropertyAsValue("answers"), quiz));
        return qContent;
    }

    // returns HTML node needed for interactivity
    createInteractiveNode(quiz:Quiz) : HTMLElement 
    { 
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = translate(`[play-interactive-answer-placeholder]`, quiz);
        input.dataset.id = "0";
        input.dataset.correct = this.question.getPropertyAsValue("correct");
        input.addEventListener("input", () => 
        {
            quiz.storage.saveAnswer(this.question, input);    
        })
        return input;
    }
    
    // returns the exact TOTAL score for its question (which can change depending on its type!)
    // DEFAULT = just return given score
    getScore() : number { return this.question.getScore(); }

    // returns which answers were correct and how many points you get
    // DEFAULT = open question that just checks if answer is identical
    grade(answersGiven:any[]) : GradeData 
    {
        const correctAnswers = this.question.getPropertyAsList("correct");
        const isCorrect = answersGiven[0].trim().toLowerCase() == correctAnswers[0];
        return {
            isCorrect: isCorrect,
            answersCorrect: correctAnswers,
            answersGiven: answersGiven,
            score: isCorrect ? this.getScore() : 0
        }; 
    }
}