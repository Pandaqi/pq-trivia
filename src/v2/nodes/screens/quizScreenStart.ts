import type { Quiz } from "../../quiz";
import { createNode } from "../createNode";
import { QuizScreen } from "./quizScreen";

const createLanguagePicker = (parent: HTMLElement, quiz: Quiz) => {
  const select = document.createElement("select");
  parent.appendChild(select);

  const languages = quiz.translator.languagesAvailable;
  for (const lang of languages) {
    const option = document.createElement("option");
    select.appendChild(option);
    option.innerHTML = lang;
    option.value = lang;
  }

  select.value = quiz.translator.getCurrentLanguage();

  select.addEventListener("input", (ev) => {
    quiz.translator.setLanguage(select.value);
    quiz.reloadScreen();
  });
};

export class QuizScreenStart extends QuizScreen {
  enter(quiz: Quiz) {
    const cont = createNode({ tag: "div", class: "quiz-screen" });
    const h1 = createNode({
      tag: "h1",
      value: `[start-heading]`,
      class: ["screen-title", "screen-title-start"],
      parent: cont,
      quiz: quiz,
    });
    const instruc = createNode({
      tag: "p",
      value: `[start-message]`,
      class: ["instruction-text"],
      parent: cont,
      quiz: quiz,
    });

    if (quiz.params.dateCreation) {
      const dateText = createNode({
        tag: "p",
        value: `[start-message-date]`,
        class: ["instruction-text"],
        parent: cont,
        quiz: quiz,
      });
    }

    const buttonList = createNode({
      tag: "div",
      class: "button-list",
      parent: cont,
    });

    if (!quiz.translator.isMonoLanguage()) {
      createLanguagePicker(buttonList, quiz);
    }

    // simply play the quiz (no answers given, not interactive)
    const buttonStart = createNode({
      tag: "button",
      value: `[start-button-play]`,
      title: `[start-button-play-tooltip]`,
      quiz: quiz,
      parent: buttonList,
      click: (ev) => {
        ev.stopPropagation();
        quiz.gotoQuestionMode();
        quiz.start();
      },
    });

    // play the quiz on interactive mode: provides inputs, graded automatically at end
    if (quiz.canBeInteractive()) {
      const buttonPlay = createNode({
        tag: "button",
        value: `[start-button-interactive]`,
        title: `[start-button-interactive-tooltip]`,
        quiz: quiz,
        parent: buttonList,
        click: (ev) => {
          ev.stopPropagation();
          quiz.setInteractive(true);
          quiz.gotoQuestionMode();
          quiz.start();
        },
      });
    }

    const buttonRestart = createNode({
      tag: "button",
      value: `[start-button-answers]`,
      title: `[start-button-answers-tooltip]`,
      quiz: quiz,
      parent: buttonList,
      click: (ev) => {
        ev.stopPropagation();
        quiz.gotoAnswerMode();
        quiz.start();
      },
    });

    const buttonSettings = createNode({
      tag: "button",
      value: `[start-button-settings]`,
      title: `[start-button-settings-tooltip]`,
      quiz: quiz,
      parent: buttonList,
      click: (ev) => {
        ev.stopPropagation();
        quiz.gotoSettings();
      },
    });

    return cont;
  }
}
