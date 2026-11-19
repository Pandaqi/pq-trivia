import { displayGrade } from "../interactive/displayGrade";
import { grade } from "../interactive/grade";
import { createNode } from "../nodes/createNode";
import { QValType } from "../questions/questionValue";
import type { Quiz } from "../quiz";
import { applyThemeFonts } from "../theme/quizTheme";
import { exporterAnswerForm } from "./exporterAnswerForm";
import { exporterAnswerSheet, ExportAnswersParams } from "./exporterAnswerSheet";
import { exporterEmbedded } from "./exporterEmbedded";
import { exporterPrint, ExportPrintParams } from "./exporterPrint";

export enum ExportTarget
{
    SCREEN,
    PRINT,
    BUILTIN
}

export const toggleQuizContainer = (show = false) =>
{
    const elem = Array.from(document.getElementsByClassName("quiz-container"))[0] as HTMLElement;
    elem.style.display = show ? "block" : "none";
}

export const addExportUIButtons = (node:HTMLElement, quiz:Quiz, inline = false) =>
{
    const container = document.createElement("div");
    node.appendChild(container);

    if(!inline) { container.classList.add("export-ui-float-on-top"); }

    // printing
    const button = createNode({ tag: "button", parent: container, value: "[export-ui-button-print]", title: "[export-ui-button-print-tooltip]", class: ["export-button-print", "hide-in-print"], click: (ev) => print(), quiz: quiz });

    // going back
    const buttonBack = createNode({ tag: "button", parent: container, value: "[export-ui-button-back]", title: "[export-ui-button-back-tooltip]", class: ["export-button-back", "hide-in-print"], click: (ev) => {
        toggleQuizContainer(true);
        node.remove();
    }, quiz: quiz });

    // make sure it follows our styling
    for(const theme of quiz.themes)
    {
        theme.applyTo([container], quiz);
    }
}

export type SubExporter = (q:Quiz) => any;
export class Exporter
{
    quiz: Quiz

    constructor(q:Quiz)
    {
        this.quiz = q;
    }

    export(subExporter:SubExporter)
    {
        this.quiz.finalizeQuestions();
        return subExporter(this.quiz);
    }

    toEmbedded()
    {
        const obj = this.export(exporterEmbedded());
        console.log("### Embedded JSON Quiz Data ###");
        console.log(obj);
        navigator.clipboard.writeText(JSON.stringify(obj));
    }

    toAnswerSheet(params:ExportAnswersParams = {})
    {
        const newPage = this.export(exporterAnswerSheet(params));
        toggleQuizContainer(false);
        document.body.appendChild(newPage);
        addExportUIButtons(newPage, this.quiz);
    }

    toAnswerForm(params:ExportAnswersParams = {})
    {
        const newPage = this.export(exporterAnswerForm(params));
        toggleQuizContainer(false);
        document.body.appendChild(newPage);
        addExportUIButtons(newPage, this.quiz);
    }

    toPrintQuestions(params:ExportPrintParams = {})
    {
        params.questionModeOverride = QValType.QUESTION;

        const newNodes = this.export(exporterPrint(params));
        toggleQuizContainer(false);
        document.body.appendChild(newNodes);
        addExportUIButtons(newNodes, this.quiz);
    }

    toPrintAnswers(params:ExportPrintParams = {})
    {
        params.questionModeOverride = QValType.ANSWER;

        const newNodes = this.export(exporterPrint(params));
        toggleQuizContainer(false);
        document.body.appendChild(newNodes);
        addExportUIButtons(newNodes, this.quiz);
    }

    toFinalQuestions()
    {
        this.quiz.finalizeQuestions();
    }

    toGrade()
    {
        const node = displayGrade(grade(this.quiz), this.quiz);
        toggleQuizContainer(false);
        document.body.appendChild(node);
        addExportUIButtons(node, this.quiz, true);
    }
}