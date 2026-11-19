import { createAnswerNode } from "../nodes/createAnswerNode";
import { createTextNode } from "../nodes/createTextNode";
import { QValType } from "../questions/questionValue";
import type { Quiz } from "../quiz";
import { getMultipleChoiceLetter, shuffle } from "../tools/helpers";
import { seedRandom } from "../tools/seedRandom";
import { QuestionTyper } from "./questionTyper";
import type { DynamicNodeParams } from "../nodes/createQuestionNode";
import { ExportAnswersParams } from "../exporter/exporterAnswerSheet";
import { translate } from "../translator/translator";
import { createMediaNodeIfNeeded } from "../nodes/createMediaNode";

// @NOTE: this one is quite short/simple because the DEFAULTS of QuestionTyper are all made for open questions
export class QuestionTyperSort extends QuestionTyper
{
    static correctAnswersMustMatch = true;
    static needsMultipleAnswers = true;
    static allAnswersAreCorrect = true;

    showsAnswers = true;
    disableAnswerRandomization = true;

    answerNodes = [];
    answersClicked = [];

    answersShuffled = [];

    getAnswerTypeRemark(quiz:Quiz) : string
    {
        return translate(`[question-sort-answer-type]`, quiz);
    }

    // returns HTML nodes to display in answer section of question
    getAnswerNodes(quiz:Quiz, params:DynamicNodeParams) : HTMLElement[] 
    { 
        const arr = [];
        arr.push(createTextNode({ value: this.getAnswerTypeRemark(quiz) }));
        
        // @NOTE: The special thing here is that we "fake" randomization for display, because we must remember the true order of everything behind the scenes
        // In truth, the order of answers saved in the question is just the original correct one that's never altered
        let answers = this.question.getAnswers(params.qValType);
        const answersCorrect = answers.slice();

        // we only actually DISPLAY/USE the wrong shuffled answers in question mode
        const answersShuffled = shuffle(answers.slice(), seedRandom(quiz.params.seed));
        if(quiz.inQuestionMode()) { answers = answersShuffled; }
        
        this.answersClicked = [];
        this.answerNodes = [];
        for(let i = 0; i < answers.length; i++)
        {
            const numberQuestionOrder = answersShuffled.indexOf(answers[i]);
            const paramsAnswer = { number: numberQuestionOrder, value: answers[i] };
            const numberCorrect = answersCorrect.indexOf(answers[i]);
            const node = createAnswerNode(Object.assign(params, paramsAnswer), quiz);
            if(quiz.isInteractive()) { this.makeInteractive(node, quiz, numberCorrect); }
            arr.push(node);
            this.answerNodes.push(node);
        }
        return arr;
    }

    // @TODO: I should really change this to drag-and-drop sorting, but how to do that easily???
    makeInteractive(node:HTMLElement, quiz:Quiz, numberCorrect:number) : void
    {
        const answerNum = parseInt(node.dataset.number);
        const answerString = this.question.getAnswers()[answerNum];
        node.dataset.toggled = "false";
        node.dataset.value = answerString;
        node.dataset.id = answerNum.toString();
        
        const toggleNodeOn = (node:HTMLElement) =>
        {
            node.dataset.toggled = "true";
            node.classList.add("answer-toggled");
            node.dataset.correct = (this.answersClicked.length == numberCorrect).toString();
            quiz.storage.saveAnswer(this.question, node); // @TODO: HOW THE FUCK DID THIS WORK AGAIN?
        }

        const toggleNodeOff = (node:HTMLElement) =>
        {
            node.dataset.toggled = "false";
            node.classList.remove("answer-toggled");
            node.dataset.correct = "false";
            quiz.storage.clearAnswer(this.question, node);
        }

        node.addEventListener("click", () => 
        {
            // can't click again if already assigned place in sorting order
            const alreadyPicked = node.dataset.toggled == "true";
            const allPicked = this.answersClicked.length >= this.answerNodes.length;
            if(alreadyPicked && !allPicked) { return; }

            // if all picked, RESET completely to start inputting order again
            if(allPicked)
            {
                for(const node of this.answerNodes)
                {
                    toggleNodeOff(node);
                }
                this.answersClicked = [];
            }

            toggleNodeOn(node);
        })
    }

    toAnswerSheet(params:ExportAnswersParams, quiz:Quiz) : HTMLElement 
    { 
        const answers = this.question.getAnswers();
        const qContent = document.createElement("td");

        const container = document.createElement("div");
        qContent.appendChild(container);

        // this ensures that we maximize the space for writing these answers, instead of collapsing into center
        container.style.width = "100%"; 
        if(!params.displayAnswers) { container.style.textAlign = "left"; }

        const answersShuffled = shuffle(answers.slice(), seedRandom(params.seed));

        for(let i = 0; i < answers.length; i++)
        {
            const qOption = document.createElement("div");
            container.appendChild(qOption);
            const numberQuestionOrder = answersShuffled.indexOf(answers[i]);
            const letter = getMultipleChoiceLetter(numberQuestionOrder);

            if(params.displayAnswers) {
                const marker = document.createElement("b");
                qOption.appendChild(marker);
                marker.innerHTML = `${letter} `;

                qOption.appendChild(createMediaNodeIfNeeded(answers[i], quiz));
            } else {
                qOption.innerHTML = `${(i+1)}. `;
            }
        }
        return qContent;
    }

    // @TODO: Now we grab answers directly. Should the "correct" value be used if available instead?
    grade(answersGiven:any[])
    {
        const correctAnswersReal = this.question.answers.getRaw();
        const answersCorrect = [];
        for(let i = 0; i < correctAnswersReal.length; i++)
        {
            if(correctAnswersReal[i] != answersGiven[i]) { continue; }
            answersCorrect.push(correctAnswersReal[i]);
        }
        
        const numCorrect = answersCorrect.length;
        const isCorrect = numCorrect >= correctAnswersReal.length;
        return {
            isCorrect: isCorrect,
            answersCorrect: answersCorrect,
            answersGiven: answersGiven,
            score: this.getScore() * numCorrect,
        }
    }
}