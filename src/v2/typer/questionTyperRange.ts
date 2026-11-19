import { ExportAnswersParams } from "../exporter/exporterAnswerSheet";
import { createAnswerNode } from "../nodes/createAnswerNode";
import type { DynamicNodeParams } from "../nodes/createQuestionNode";
import { createTextNode } from "../nodes/createTextNode";
import { QValType } from "../questions/questionValue";
import type { Quiz } from "../quiz";
import { translate } from "../translator/translator";
import { QuestionTyper } from "./questionTyper";

// @NOTE: this one is quite short/simple because the DEFAULTS of QuestionTyper are all made for open questions
export class QuestionTyperRange extends QuestionTyper
{
    getAnswerTypeRemark(quiz:Quiz) : string
    {
        const range = this.question.getRange();
        return translate(`[question-range-answer-type]`, quiz, { range });
    }

    getRangeHint()
    {
        return `(+-${this.question.getRange()})`;
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

        // @NOTE: adds range hint! That's how it differs from open question
        const str = `${this.question.getPropertyAsValue("correct", params.qValType)} ${this.getRangeHint()}`;
        const paramsAnswer = { value: str };
        return [createAnswerNode(Object.assign(params, paramsAnswer), quiz)];
    }

    // returns HTML node needed for interactivity
    createInteractiveNode(quiz:Quiz) : HTMLElement 
    { 
        const input = document.createElement("input");
        input.type = "number";
        input.placeholder = translate(`[question-range-interactive-answer-placeholder]`, quiz);
        input.title = "Only accepts numbers.";
        input.step = "0.05"; // @TODO: what's a good steps value?
        input.dataset.id = "0";
        input.dataset.correct = this.question.getPropertyAsValue("correct");
        input.addEventListener("input", () => 
        {
            quiz.storage.saveAnswer(this.question, input);    
        })
        return input;
    }

    toAnswerSheet(params:ExportAnswersParams, quiz:Quiz) : HTMLElement 
    { 
        const qContent = document.createElement("td");
        if(!params.displayAnswers) { return qContent; }
        qContent.innerHTML = `${this.question.getPropertyAsValue("answers")} <small>${this.getRangeHint()}</small>`;
        return qContent;
    }

    grade(answersGiven:any[])
    {
        const answerGiven = parseFloat(answersGiven[0]);
        const answerReal = parseFloat(this.question.getPropertyAsValue("correct"));
        const errorMargin = this.question.getRange();
        const isCorrect = Math.abs(answerGiven - answerReal) <= errorMargin;

        return {
            isCorrect: isCorrect,
            answersCorrect: isCorrect ? [answerGiven] : [],
            answersGiven: answersGiven,
            score: isCorrect ? this.getScore() : 0
        }; 
    }
}