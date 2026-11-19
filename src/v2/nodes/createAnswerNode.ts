import type { Question } from "../questions/question";
import { QValType } from "../questions/questionValue";
import type { Quiz } from "../quiz";
import { getMultipleChoiceLetter } from "../tools/helpers";
import { isValidMediaType } from "../tools/parser";
import { createMediaNode, transformMediaNodeForExportTarget } from "./createMediaNode";
import { DynamicNodeParams } from "./createQuestionNode";

export const LONG_ANSWER_THRESHOLD = 20; // number of characters

export const revealCorrectAnswersOnNodes = (answerNodes:HTMLElement[], question:Question, params:DynamicNodeParams) =>
{
    if(question.isSection()) { return; }

    const openQuestion = question.isOpen();
    const revealAnswers = params.qValType != QValType.QUESTION;
    for(const elem of answerNodes)
    {
        if(!elem.classList.contains("answer")) { continue; }

        const isAnswer = question.isCorrectAnswer(elem.dataset.id) || openQuestion;
        if(revealAnswers) {
            if(isAnswer) { elem.classList.add("answer-right"); }
            else { elem.classList.add("answer-wrong"); }
            elem.style.display = "flex";
        } else {
            elem.classList.remove("answer-right");
            elem.classList.remove("answer-wrong");
            if(openQuestion) { elem.style.display = "none"; }
        }
    }
}

export const createAnswerNode = (params:DynamicNodeParams, quiz:Quiz) =>
{
    const value = params.value;
    if(!value) { return null; }

    const shouldEnumerate = (params.number != null) && !params.hideEnumeration;
    const number = params.number ?? 0;    

    const div = document.createElement("div");
    div.classList.add("answer");
    div.dataset.id = value;
    div.dataset.number = number.toString();

    if(shouldEnumerate)
    {
        const numberNode = document.createElement("div");
        numberNode.innerHTML = getMultipleChoiceLetter(number);
        numberNode.classList.add("answer-number");
        div.appendChild(numberNode);
    }
    
    const answer = document.createElement("div");
    answer.classList.add("answer-text");
    div.appendChild(answer);

    const isMedia = isValidMediaType(value, quiz.params);
    if(isMedia) {
        answer.appendChild(transformMediaNodeForExportTarget(createMediaNode(params, quiz), params.target));
    } else {
        answer.innerHTML = `<span class="answer-text-inner">${value}</span>`;
    }

    const shouldShowScore = !params.hideScore && !quiz.params.hideScoreOnAnswers;
    if(shouldShowScore)
    {
        const score = document.createElement("div");
        score.innerHTML = (params.score ?? 1).toString();
        score.classList.add("answer-score");
        div.appendChild(score);
    }

    const isLongAnswer = isMedia || value.length > LONG_ANSWER_THRESHOLD;
    if(isLongAnswer) { div.classList.add("answer-long"); }
    else { div.classList.add("answer-short"); }

    return div;
}