import type { Quiz } from "../quiz";
import { translate } from "../translator/translator";
import { QuizSettingType } from "./quizSetting";

export const DEFAULT_SETTINGS =
[
    { 
        type: QuizSettingType.TEXT, 
        label: `[settings-seed]`, 
        class: "setting-seed", 
        title: `[settings-seed-tooltip]`, 
        placeholder: (quiz:Quiz) => quiz.params.seed,
        input: (elem:HTMLInputElement, quiz:Quiz) =>
        {
            quiz.params.seed = elem.value;
        }
    },

    { 
        type: QuizSettingType.BUTTON, 
        value: (quiz:Quiz) => translate(`[settings-button-theme]`, quiz), 
        title: `[settings-button-theme-tooltip]`,
        input: (elem:HTMLButtonElement, quiz:Quiz) => 
        {
            quiz.toggleTheme();
            elem.innerHTML = translate(`[settings-button-theme]`, quiz);
        }
    },
];