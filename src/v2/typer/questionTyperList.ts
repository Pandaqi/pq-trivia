import { ExportAnswersParams } from "../exporter/exporterAnswerSheet";
import type { DynamicNodeParams } from "../nodes/createQuestionNode";
import { createAnswerNode } from "../nodes/createAnswerNode";
import { createTextNode } from "../nodes/createTextNode";
import type { Quiz } from "../quiz";
import { QuestionTyper } from "./questionTyper";
import { translate } from "../translator/translator";
import { createMediaNodeIfNeeded } from "../nodes/createMediaNode";

export class QuestionTyperList extends QuestionTyper
{
    static allAnswersAreCorrect = true
    static needsMultipleAnswers = true

    disableAnswerRandomization = true

    getAnswerTypeRemark(quiz:Quiz) : string
    {
        const num = this.question.countCorrectAnswers();
        return translate(`[question-list-answer-type]`, quiz, { num });
    }

    // returns HTML nodes to display in answer section of question
    getAnswerNodes(quiz:Quiz, params:DynamicNodeParams) : HTMLElement[] 
    { 
        const instructionNode = createTextNode({ value: this.getAnswerTypeRemark(quiz) });
        const arr = [];
        arr.push(instructionNode);

        const answers = this.question.getAnswers(params.qValType);
        if(quiz.inQuestionMode())
        {
            if(!quiz.isInteractive()) { return arr; }

            const numAnswers = this.question.getAnswers().length;
            for(let i = 0; i < numAnswers; i++)
            {
                arr.push(this.createInteractiveNode(quiz, i));
            }
            return arr;
        }

        for(let i = 0; i < answers.length; i++)
        {
            const paramsAnswer = { number: i, value: answers[i] };
            arr.push(createAnswerNode(Object.assign(params, paramsAnswer), quiz));
        }
        return arr;
    }

    createInteractiveNode(quiz:Quiz, num:number = 0) : HTMLElement
    {
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = translate(`[play-interactive-answer-placeholder]`, quiz);
        input.dataset.id = num.toString();
        input.dataset.correct = this.question.params.correct[num].get();
        input.addEventListener("input", () => 
        {
            quiz.storage.saveAnswer(this.question, input);    
        })
        return input;
    }

    toAnswerSheet(params:ExportAnswersParams, quiz:Quiz) : HTMLElement 
    { 
        const answers = this.question.getAnswers();
        const qContent = document.createElement("td");
        if(params.simpleMultipleChoice) { return qContent; }

        const container = document.createElement("div");
        qContent.appendChild(container);

        // this ensures that we maximize the space for writing these answers, instead of collapsing into center
        container.style.width = "100%"; 
        if(!params.displayAnswers) { container.style.textAlign = "left"; }

        for(let i = 0; i < answers.length; i++)
        {
            const qOption = document.createElement("div");
            container.appendChild(qOption);

            const marker = document.createElement("b");
            qOption.appendChild(marker);
            marker.innerHTML = `${(i+1)} `;

            if(params.displayAnswers)
            {
                qOption.appendChild(createMediaNodeIfNeeded(answers[i], quiz));
            }
        }
        return qContent;
    }

    getScore() : number { return this.question.getScore() * this.question.getAnswers().length; }

    grade(answersGiven:any[])
    {
        const correctAnswers = this.question.getAnswers().map((x) => x.trim().toLowerCase());
        const answersCorrect = [];
        for(const answerGiven of answersGiven)
        {
            const answerGivenSanitized = answerGiven.trim().toLowerCase();
            if(!correctAnswers.includes(answerGivenSanitized)) { continue; }
            answersCorrect.push(answerGivenSanitized);
        }

        const numCorrect = answersCorrect.length;
        const isCorrect = numCorrect > 0;

        return {
            isCorrect: isCorrect,
            answersCorrect: answersCorrect,
            answersGiven: answersGiven,
            score: this.question.getScore() * numCorrect,
        }
    }
}