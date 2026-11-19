import type { Quiz } from "../quiz";
import { QuestionTyper } from "./questionTyper";

// @NOTE: this one is quite empty because it's literally the "custom" type, so it's up to you to add comments/answers/whatever to make the question work in whatever custom way you envisioned
export class QuestionTyperCustom extends QuestionTyper
{
    getAnswerTypeRemark(quiz:Quiz) : string { return ""; }
}