import type { Quiz } from "../../quiz";
import { QuizScreen } from "./quizScreen";

import { displayGrade } from "../../interactive/displayGrade";
import { grade } from "../../interactive/grade";
import { createNode } from "../createNode";

export class QuizScreenEnd extends QuizScreen {
  showFinalGrade(quiz: Quiz) {
    quiz.nodes.toggleLeaveProtection(true, quiz);

    const node = displayGrade(grade(quiz), quiz);
    document.body.innerHTML = "";
    document.body.appendChild(node);
  }

  enter(quiz: Quiz): HTMLElement {
    const cont = createNode({ tag: "div", class: "quiz-screen" });
    const h1 = createNode({
      tag: "h1",
      value: `[end-heading]`,
      class: ["screen-title", "screen-title-end"],
      parent: cont,
      quiz: quiz,
    });
    const instruc = createNode({
      tag: "div",
      value: `[end-message]`,
      class: ["instruction-text"],
      parent: cont,
      quiz: quiz,
    });

    const buttonList = createNode({
      tag: "div",
      class: "button-list",
      parent: cont,
    });

    // if we were interactive, now we can grade our answers
    if (quiz.isInteractive()) {
      const buttonGrade = createNode({
        tag: "button",
        value: `[end-button-grade]`,
        title: `[end-button-grade-tooltip]`,
        quiz: quiz,
        parent: buttonList,
        click: (ev) => {
          ev.stopPropagation();
          this.showFinalGrade(quiz); // @TODO: probably a temporary table dump, until I find a cleaner display
        },
      });
    }

    if (quiz.isRestricted()) {
      return cont;
    }

    // reset and view answers
    const buttonAnswers = createNode({
      tag: "button",
      value: `[end-button-answers]`,
      title: `[end-button-answers-tooltip]`,
      quiz: quiz,
      parent: buttonList,
      click: (ev) => {
        ev.stopPropagation();
        quiz.gotoAnswerMode();
        quiz.restart();
      },
    });

    // go back to start
    const buttonStart = createNode({
      tag: "button",
      value: `[end-button-start]`,
      title: `[end-button-start-tooltip]`,
      quiz: quiz,
      parent: buttonList,
      click: (ev) => {
        quiz.gotoStart();
      },
    });

    // completely reset; storage cleared, back to start, no questions loaded
    const buttonExit = createNode({
      tag: "button",
      value: `[end-button-exit]`,
      title: `[end-button-exit-tooltip]`,
      quiz: quiz,
      parent: buttonList,
      click: (ev) => {
        ev.stopPropagation();
        quiz.exit();
      },
    });

    return cont;
  }
}
