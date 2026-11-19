import { createInputNode } from "../nodes/createInputNode";
import type { Quiz } from "../quiz";

type SettingsCallback = (quiz) => string;

export enum QuizSettingType
{
    TEXT = "text",
    CHECKBOX = "checkbox",
    BUTTON = "button",
}

export interface QuizSettingParams
{
    quiz?: Quiz,
    type?: QuizSettingType,
    label?: string | SettingsCallback,
    value?: string | SettingsCallback,
    parent?: HTMLElement,
    class?: string|string[],
    title?: string | SettingsCallback,
    placeholder?: string | SettingsCallback,
    input?: (elem, quiz) => void,
}

export class QuizSetting
{
    params:QuizSettingParams

    constructor(params:QuizSettingParams = {})
    {
        this.params = params;
    }

    createAndAppend(node:HTMLElement, quiz: Quiz)
    {
        this.params.parent = node;
        this.params.quiz = quiz;
        createInputNode(this.params);
    }
}