import { QuizSetting, QuizSettingType } from "lib/pq-trivia/tools/quizSetting";
import type { Quiz } from "../../quiz";
import { QuizState } from "../../quiz";
import { createInputNode } from "../createInputNode";
import { createNode } from "../createNode";
import { QuizScreen } from "./quizScreen";

export const createSectionSelector = (cont: HTMLElement, quiz: Quiz) => {
  // > pick which rounds to include
  const roundsContainer = createNode({
    tag: "div",
    class: ["rounds-container"],
    parent: cont,
  });
  const roundsHeading = createNode({
    tag: "h2",
    class: "screen-title",
    value: `[settings-rounds]`,
    parent: roundsContainer,
    quiz: quiz,
  });
  const roundsExplainer = createNode({
    tag: "div",
    value: `[settings-rounds-message]`,
    parent: roundsContainer,
    quiz: quiz,
  });
  const sectionList = createNode({
    tag: "div",
    class: "button-list",
    parent: roundsContainer,
  });
  const sections = quiz.translator.db.sectionListFull;
  for (const section of sections) {
    const name = section.getName();
    const isIncluded = quiz.isSectionFiltered(name);
    const checkboxInput = createInputNode({
      type: QuizSettingType.CHECKBOX,
      class: "setting-section-inclusion",
      value: isIncluded ? "true" : "false",
      label: name,
      parent: sectionList,
      quiz: quiz,
      input: (elem: HTMLInputElement, quiz: Quiz) => {
        // collect all checkboxes that are currently CHECKED => tell Quiz to only use those sections from now on
        const checkboxes = Array.from(
          sectionList.querySelectorAll(`[type="checkbox"]`),
        ) as HTMLInputElement[];
        const sectionsIncluded = [];
        for (const checkbox of checkboxes) {
          if (!checkbox.checked) {
            continue;
          }
          sectionsIncluded.push(checkbox.id);
        }
        // @NOTE: if we set the filter to empty, the system assumes "no filtering, include all rounds"
        // so, instead, we set it to some round that doesn't exist if we want to exclude ALL (for whatever reason ...)
        if (sectionsIncluded.length <= 0) {
          quiz.setSectionsFilter(["round-that-doesnt-exist"]);
          return;
        }
        quiz.setSectionsFilter(sectionsIncluded);
      },
    });
  }
};

export const createExportButtons = (cont, quiz: Quiz) => {
  // > export buttons
  const exportContainer = createNode({
    tag: "div",
    class: ["export-container", "button-list"],
    parent: cont,
  });
  const exportHeading = createNode({
    tag: "h2",
    class: "screen-title",
    value: `[settings-export]`,
    parent: exportContainer,
    quiz: quiz,
  });
  const exportExplainer = createNode({
    tag: "div",
    value: `[settings-export-message]`,
    parent: exportContainer,
    quiz: quiz,
  });

  const buttonAnswerSheet = createNode({
    tag: "button",
    value: `[settings-export-answer-sheet]`,
    title: `[settings-export-answer-sheet-tooltip]`,
    quiz: quiz,
    parent: exportContainer,
    click: () => quiz.export.toAnswerSheet(),
  });

  const buttonAnswerForm = createNode({
    tag: "button",
    value: `[settings-export-answer-form]`,
    title: `[settings-export-answer-form-tooltip]`,
    quiz: quiz,
    parent: exportContainer,
    click: () => quiz.export.toAnswerForm(),
  });

  const buttonPrintQuestions = createNode({
    tag: "button",
    value: `[settings-export-print]`,
    title: `[settings-export-print-tooltip]`,
    quiz: quiz,
    parent: exportContainer,
    click: () => quiz.export.toPrintQuestions(),
  });

  const buttonPrintAnswers = createNode({
    tag: "button",
    value: `[settings-export-print-answers]`,
    title: `[settings-export-print-answers-tooltip]`,
    quiz: quiz,
    parent: exportContainer,
    click: () => quiz.export.toPrintAnswers(),
  });

  const buttonEmbedded = createNode({
    tag: "button",
    value: `[settings-export-builtin]`,
    title: `[settings-export-builtin-tooltip]`,
    quiz: quiz,
    parent: exportContainer,
    click: () => quiz.export.toEmbedded(),
  });
};

export const createBackButton = (cont: HTMLElement, quiz: Quiz) => {
  // button to return to start menu
  // @NOTE: It changes/saves on the fly, but user feels more at ease if it says "save" here ;)
  const buttonList = createNode({
    tag: "div",
    class: "button-list",
    parent: cont,
  });
  const buttonReturn = createNode({
    tag: "button",
    value: `[settings-save]`,
    title: `[settings-save-tooltip]`,
    quiz: quiz,
    parent: buttonList,
    click: (ev) => {
      quiz.changeState(QuizState.START);
      ev.stopPropagation();
    },
  });
};

export class QuizScreenSettings extends QuizScreen {
  enter(quiz: Quiz) {
    const screen = createNode({ tag: "div", class: "quiz-screen" });
    const cont = createNode({
      tag: "div",
      class: "settings-container",
      parent: screen,
    });

    const h1 = createNode({
      tag: "h1",
      value: `[settings-heading]`,
      class: ["screen-title", "screen-title-settings"],
      parent: cont,
      quiz: quiz,
    });

    const settingsParams = quiz.params.settings ?? [];
    const settings = [];
    for (const settingParams of settingsParams) {
      const setting = new QuizSetting(settingParams);
      settings.push(setting);
      setting.createAndAppend(cont, quiz);
    }

    createSectionSelector(cont, quiz);
    createExportButtons(cont, quiz);
    createBackButton(cont, quiz);

    return screen;
  }
}
