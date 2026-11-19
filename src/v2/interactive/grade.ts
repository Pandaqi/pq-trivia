import type { Question } from "../questions/question";
import type { Quiz } from "../quiz";
import { GradeData } from "../typer/questionTyper";

export type GradeResults = Map<Question, GradeData>;
export const grade = (quiz:Quiz) =>
{
    const questions = quiz.getCurrentDatabase().getQuestions();
    const result:GradeResults = new Map();
    for(const q of questions)
    {
        const answersGiven = quiz.storage.loadAnswer(q);

        const badInput = !answersGiven || answersGiven.length <= 0;
        if(badInput) { result.set(q, {}); continue; }

        result.set(q, q.typer.grade(answersGiven));
    }
    return result;
}