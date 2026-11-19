import { ExportAnswersParams } from "../exporter/exporterAnswerSheet";
import { createAnswerNode } from "../nodes/createAnswerNode";
import type { DynamicNodeParams } from "../nodes/createQuestionNode";
import { createTextNode } from "../nodes/createTextNode";
import type { Quiz } from "../quiz";
import { getMultipleChoiceLetter } from "../tools/helpers";
import { translate } from "../translator/translator";
import { QuestionTyper } from "./questionTyper";

// @NOTE: this one is quite short/simple because the DEFAULTS of QuestionTyper are all made for open questions
export class QuestionTyperChoice extends QuestionTyper {
  static correctAnswersMustMatch = true;
  showsAnswers = true;
  static needsMultipleAnswers = true;

  numToggled = 0;
  answerNodes = [];

  getAnswerTypeRemark(quiz: Quiz): string {
    const num = this.question.countCorrectAnswers();
    return translate(`[question-choice-answer-type]`, quiz, { num });
  }

  // returns HTML nodes to display in answer section of question
  getAnswerNodes(quiz: Quiz, params: DynamicNodeParams): HTMLElement[] {
    const answers = this.question.getAnswers(params.qValType);
    const arr = [];
    arr.push(createTextNode({ value: this.getAnswerTypeRemark(quiz) }));

    this.answerNodes = [];
    for (let i = 0; i < answers.length; i++) {
      const paramsAnswer = { number: i, value: answers[i] };
      const node = createAnswerNode(Object.assign(params, paramsAnswer), quiz);
      if (quiz.isInteractive()) {
        this.makeInteractive(node, quiz);
      }
      arr.push(node);
      this.answerNodes.push(node);
    }

    return arr;
  }

  makeInteractive(node: HTMLElement, quiz: Quiz): void {
    const answerNum = parseInt(node.dataset.number);
    const answerString = this.question.getAnswers()[answerNum];
    node.dataset.toggled = "false";
    node.dataset.value = answerString;
    node.dataset.id = answerNum.toString();
    node.dataset.correct = this.question.isCorrectAnswer(answerString)
      ? answerString
      : "";

    const toggleNodeOn = (node: HTMLElement) => {
      node.dataset.toggled = "true";
      node.classList.add("answer-toggled");
      this.numToggled++;
      quiz.storage.saveAnswer(this.question, node);
    };

    const toggleNodeOff = (node: HTMLElement) => {
      node.dataset.toggled = "false";
      node.classList.remove("answer-toggled");
      this.numToggled--;
      quiz.storage.clearAnswer(this.question, node);
    };

    node.addEventListener("click", () => {
      const toggleOn = node.dataset.toggled == "false";
      const toggleOff = node.dataset.toggled == "true";

      const atMaximum = this.numToggled >= this.question.countCorrectAnswers();
      if (atMaximum && toggleOn) {
        const firstSelected = this.answerNodes.find(
          (x) => x.dataset.toggled == "true",
        );
        toggleNodeOff(firstSelected);
      }

      if (toggleOn) {
        toggleNodeOn(node);
      }
      if (toggleOff) {
        toggleNodeOff(node);
      }
    });
  }

  toAnswerSheet(params: ExportAnswersParams, quiz: Quiz): HTMLElement {
    const answers = this.question.getAnswers();
    const qContent = document.createElement("td");
    if (params.simpleMultipleChoice) {
      return qContent;
    }

    const container = document.createElement("span");
    qContent.appendChild(container);
    container.classList.add("answer-sheet-multiple-choice-list");

    for (let i = 0; i < answers.length; i++) {
      const qOption = document.createElement("span");
      container.appendChild(qOption);

      // if displaying answers, focus/unfocus on the right ones
      let str = getMultipleChoiceLetter(i);
      if (params.displayAnswers) {
        if (!this.question.isCorrectAnswer(answers[i])) {
          str = "<small>" + str + "</small>";
        } else {
          str = "<b>" + str + "</b>";
        }
      }
      qOption.innerHTML = str;
    }
    return qContent;
  }

  grade(answersGiven: any[]) {
    const correctAnswersReal = this.question.getCorrect();
    const answersCorrect = [];
    for (let i = 0; i < correctAnswersReal.length; i++) {
      if (correctAnswersReal[i] != answersGiven[i]) {
        continue;
      }
      answersCorrect.push(correctAnswersReal[i]);
    }
    const numCorrect = answersCorrect.length;
    const isCorrect = numCorrect >= correctAnswersReal.length;
    return {
      isCorrect: isCorrect,
      answersCorrect: answersCorrect,
      answersGiven: answersGiven,
      score: isCorrect ? this.getScore() : 0,
    };
  }
}
