import { createQuestionNode } from "../nodes/createQuestionNode";
import { QValType } from "../questions/questionValue";
import type { Quiz } from "../quiz";
import { ExportTarget } from "./exporter";

export interface ExportPrintParams
{
    removeBackground?: boolean
    removeColors?: boolean
    target?: ExportTarget,
    questionModeOverride?: QValType
}

export const exporterPrint = (params:ExportPrintParams) =>
{
    return (quiz:Quiz) =>
    {
        const root = document.createElement("div");
        root.classList.add("quiz-container");

        const container = document.createElement("div");
        root.appendChild(container);
        container.classList.add("quiz-screens-area");

        // removing background just seems the most practical thing for printing, so it defaults to true
        params.removeBackground = params.removeBackground ?? true; 
        params.target = ExportTarget.PRINT;

        const questions = quiz.getCurrentDatabase().questionList;
        for(const question of questions)
        {
            container.appendChild(createQuestionNode(question, quiz, params));
        }

        return root;
    }
}