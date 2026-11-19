import { ExportAnswersParams } from "../exporter/exporterAnswerSheet";
import { createAnswerNode } from "../nodes/createAnswerNode";
import { DynamicNodeParams } from "../nodes/createQuestionNode";
import type { Quiz } from "../quiz";
import { translate } from "../translator/translator";
import { QuestionTyper } from "./questionTyper";

export class QuestionTyperSection extends QuestionTyper {
  getAnswerTypeRemark(quiz: Quiz): string {
    const stats = this.question.sectionObject.calculateStatistics();
    return translate(`[question-section-answer-type]`, quiz, { stats: stats });
  }

  // returns HTML nodes to display in answer section of question
  getAnswerNodes(quiz: Quiz, params: DynamicNodeParams): HTMLElement[] {
    const paramsAnswer = { value: this.getAnswerTypeRemark(quiz) };
    return [createAnswerNode(Object.assign(params, paramsAnswer), quiz)];
  }

  toAnswerSheet(params: ExportAnswersParams, _quiz: Quiz): HTMLElement {
    const shouldShow = params.showSections ?? true;
    if (!shouldShow) {
      return null;
    }

    const div = document.createElement("div");
    const h3 = document.createElement("h3");
    div.appendChild(h3);
    h3.style.margin = "0";
    h3.innerHTML = this.question.getQuestionFormatted();
    return div;
  }

  grade(answersGiven: any[]) {
    return {};
  }
}
