import type { Question } from "../../questions/question";
import type { Quiz } from "../../quiz";
import { createQuestionNode } from "../createQuestionNode";
import { QuizScreen } from "./quizScreen";

export class QuizScreenPlay extends QuizScreen
{
    selfUpdatesTheme = true

    showQuestion(q:Question, quiz:Quiz)
    {
        // create the whole question and replace whatever exists now
        quiz.nodes.clearScreen();
        const node = createQuestionNode(q, quiz);
        quiz.nodes.addScreenNode(node);
    }
}