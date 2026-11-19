import { QuizSettingParams, QuizSettingType } from "../tools/quizSetting";
import { translate } from "../translator/translator";

export const createInputNode = (params:QuizSettingParams) =>
{
    const quiz = params.quiz;
    const container = document.createElement("div");
    if(params.parent) { params.parent.appendChild(container); }
    
    let titleText = (typeof params.title == "function" ? params.title(quiz) : params.title);
    if(quiz) { titleText = translate(titleText, quiz); }
    container.title = titleText;

    container.classList.add("input-node-combination");

    const type = params.type ?? QuizSettingType.TEXT;
    let labelText = (typeof params.label == "function") ? params.label(quiz) : params.label;
    if(quiz) { labelText = translate(labelText, quiz); }

    if(type != QuizSettingType.BUTTON)
    {
        const label = document.createElement("label");
        container.appendChild(label);
        label.innerHTML = labelText;
        // @ts-ignore
        label.for = labelText;
    }

    const tag = params.type == QuizSettingType.BUTTON ? "button" : "input";
    const inputElement = document.createElement(tag);
    container.appendChild(inputElement);
    inputElement.id = labelText

    let classes = params.class ?? [];
    if(!Array.isArray(classes)) { classes = [classes]; }
    inputElement.classList.add(...classes);
    
    let value = typeof params.value == "function" ? params.value(quiz) : params.value;
    if(quiz) { value = translate(value, quiz); }

    if(type == QuizSettingType.TEXT) {
        inputElement.innerHTML = value;
        let placeholder = typeof params.placeholder == "function" ? params.placeholder(quiz) : (params.placeholder ?? "");
        if(quiz) { placeholder = translate(placeholder, quiz); }
        (inputElement as HTMLInputElement).placeholder = placeholder;
        inputElement.type = "text";
    } else if(type == QuizSettingType.CHECKBOX) {
        inputElement.type = "checkbox";
        (inputElement as HTMLInputElement).checked = (value == "true");
    } else if(type == QuizSettingType.BUTTON) {
        inputElement.innerHTML = value;
    }

    if(params.input) 
    {
        const relevantEvent = type == QuizSettingType.BUTTON ? "click" : "input"; 
        inputElement.addEventListener(relevantEvent, (ev) => params.input(inputElement, quiz)); 
    }

    return inputElement;
}