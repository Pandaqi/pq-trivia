import type { Quiz } from "../../quiz";

export class QuizScreen
{
    selfUpdatesTheme = false

    enter(quiz:Quiz) : HTMLElement { return document.createElement("div"); }
    exit(quiz:Quiz) { }
}