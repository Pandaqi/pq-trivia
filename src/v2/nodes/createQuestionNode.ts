import { ExportTarget } from "../exporter/exporter";
import type { Question } from "../questions/question";
import { QValType } from "../questions/questionValue";
import type { Quiz } from "../quiz";
import { refreshTheme } from "../theme/quizTheme";
import {
  getRelativeIndexMax,
  toMiddotString,
  toMultiNodeString,
} from "../tools/helpers";
import { markdownify } from "../tools/markdownify";
import { markdownifyNode } from "../tools/markdownifyNode";
import { convertTimeToString } from "../tools/timer";
import { translate } from "../translator/translator";
import { revealCorrectAnswersOnNodes } from "./createAnswerNode";
import { createNode } from "./createNode";

export interface DynamicNodeParams {
  target?: ExportTarget;
  qValType?: QValType;

  removeFonts?: boolean;
  removeBackground?: boolean;
  removeColor?: boolean;
  questionModeOverride?: QValType;

  value?: string; // actual answer value (if set, automatically adds A,B,C,etc in front)
  number?: number; // index of answer in full list of answers
  hideEnumeration?: boolean; // forcefully disables the "A,B,C" in front of multi-answers
  score?: number; // how much this answer scores if correct
  hideScore?: boolean;
}

export const createQuestionNode = (
  q: Question,
  quiz: Quiz,
  params: DynamicNodeParams = {},
) => {
  let qValType = quiz.inQuestionMode() ? QValType.QUESTION : QValType.ANSWER;
  if (params.questionModeOverride) {
    qValType = params.questionModeOverride;
  }
  params.qValType = qValType;

  const isSection = q.isSection();
  const inAnswerMode = qValType != QValType.QUESTION;

  const mediaNodes = q.typer.getMediaNodes(quiz, Object.assign({}, params));
  const hasMedia = mediaNodes.length > 0;

  params.score = q.getScore();
  const answerNodes = q.typer.getAnswerNodes(quiz, Object.assign({}, params));
  const hasAnswers = answerNodes.length > 0;
  const hasMultipleAnswers = answerNodes.length > 1;
  for (const answerNode of answerNodes) {
    markdownifyNode(answerNode, !quiz.params.disableTextFormatting);
  }

  const classes = ["quiz-screen"];
  if (isSection) {
    classes.push("quiz-section-container");
  } else {
    classes.push("quiz-question-container");
  }

  const cont = createNode({ tag: "div", class: classes });
  refreshTheme(quiz, q, cont, params);

  const metadata = createNode({ tag: "div", class: "question-metadata" });
  if (!isSection) {
    cont.appendChild(metadata);
  }

  const doubleView = createNode({
    tag: "div",
    class: "double-view",
    parent: cont,
  });
  const sideLeft = createNode({
    tag: "div",
    class: "double-view-left",
    parent: doubleView,
  });
  const sideRight = createNode({
    tag: "div",
    class: "double-view-right",
    parent: doubleView,
  });

  // metadata
  const indexMax = getRelativeIndexMax(q, quiz);

  const displayIcon = quiz.params.icon;
  if (displayIcon) {
    const img = document.createElement("img");
    img.src = quiz.params.icon;
    img.classList.add("metadata-part", "quiz-icon");
    metadata.appendChild(img);
  }

  const quizModeString = quiz.inAnswerMode()
    ? "❗ [play-mode-answer]"
    : "▶️ [play-mode-question]";
  const quizMode = createNode({
    tag: "div",
    value: `${quizModeString}`,
    class: ["metadata-part", "quiz-mode"],
    parent: metadata,
    quiz: quiz,
  });

  const displayLanguage = quiz.translator.isMultiLanguage();
  if (displayLanguage) {
    const questionLanguage = createNode({
      tag: "div",
      value: `🌐 ${q.getLanguage()}`,
      class: ["metadata-part", "question-language"],
      parent: metadata,
    });
  }

  const questionRound = createNode({
    tag: "div",
    value: `📌 ${q.getSection()}`,
    class: ["metadata-part", "question-round"],
    parent: metadata,
  });
  const questionIndex = createNode({
    tag: "div",
    value: `❔ ${q.getIndexReadable()}/${indexMax}`,
    class: ["metadata-part", "question-index"],
    parent: metadata,
  });

  quiz.nodes.timerQuestionNode = null;
  if (q.hasTimer()) {
    const timerContainer = createNode({
      tag: "div",
      value: "",
      class: "question-timer-container",
      parent: metadata,
    });
    const timerBar = createNode({
      tag: "div",
      class: "question-timer-bar",
      parent: timerContainer,
    });
    const timerIcon = createNode({
      tag: "div",
      value: "⌛",
      parent: timerContainer,
    });
    const timer = createNode({
      tag: "div",
      value: convertTimeToString(q.getTimer()),
      class: ["metadata-part", "question-timer"],
      parent: timerContainer,
    });
    quiz.nodes.timerQuestionNode = timer;
    quiz.nodes.timerQuestionBarNode = timerBar;
  }

  const scoreSuffix =
    q.getScore() == 1 ? "[ui-score-singular]" : "[ui-score-plural]";
  const questionScore = createNode({
    tag: "div",
    value: `⭐ ${q.getScoreTextFormatted()} ${scoreSuffix}`,
    class: ["metadata-part", "question-score"],
    title: `[play-question-score-tooltip]`,
    parent: metadata,
    quiz: quiz,
  });

  if (q.isRange()) {
    const str = `📏 ${q.getRange()}`;
    const questionRange = createNode({
      tag: "div",
      value: str,
      class: ["metadata-part", "question-range"],
      title: `[play-question-range-tooltip]`,
      parent: metadata,
      quiz: quiz,
    });
  }

  const displayCategory =
    quiz.translator.db.allCategories.length > 1 ||
    quiz.params.showPropertiesWithoutDiversity;
  if (displayCategory) {
    const questionCategory = createNode({
      tag: "div",
      value: `🏷️ ${toMiddotString(q.getPropertyAsListFormatted("category", qValType))}`,
      class: ["metadata-part", "question-category"],
      title: `[play-question-categories-tooltip]`,
      parent: metadata,
      quiz: quiz,
    });
  }

  const displayAuthor =
    quiz.translator.db.allAuthors.length > 1 ||
    quiz.params.showPropertiesWithoutDiversity;
  if (displayAuthor) {
    const questionAuthor = createNode({
      tag: "div",
      value: `🧑 ${toMiddotString(q.getPropertyAsListFormatted("author", qValType))}`,
      class: ["metadata-part", "question-author"],
      title: `[play-question-authors-tooltip]`,
      parent: metadata,
      quiz: quiz,
    });
  }

  // actual question
  // (displays on left by default, but if there's no media and multiple answers, it can fill the right side)
  let isSingleScreen = !hasMedia && !hasMultipleAnswers;
  if (q.isSection()) {
    isSingleScreen = !hasMedia;
  }
  if (isSingleScreen) {
    sideRight.style.display = "none";
  }

  const displayAnswersLeft = hasMedia || isSingleScreen;
  const answersParent = displayAnswersLeft ? sideLeft : sideRight;
  const question = createNode({
    tag: "h1",
    value: `${q.getIndexReadable().toString()}. ${q.getQuestionFormatted()}`,
    class: "question-question",
    parent: sideLeft,
  });

  let comment = toMultiNodeString(
    q.getPropertyAsListFormatted("comment", qValType),
  );
  if (isSection && !comment) {
    comment = translate(`[play-new-round-default-message]`, quiz);
  }
  if (comment) {
    const questionComment = createNode({
      tag: "div",
      value: comment,
      class: "question-comment",
      title: "Question Comment",
      parent: sideLeft,
    });
  }

  const hints = q.getHintsFormatted();
  const displayHints = !isSection && hints && hints.length > 0;
  if (displayHints) {
    const questionHints = createNode({
      tag: "div",
      class: ["question-comment", "question-hints"],
      parent: sideLeft,
    });

    const questionHintButton = createNode({
      tag: "button",
      value: `[question-hint-reveal] (${hints.length})`,
      class: ["question-hint-button", "hide-in-print"],
      parent: questionHints,
      quiz: quiz,
    });
    questionHintButton.addEventListener("click", (_ev) =>
      quiz.nodes.revealNextHint(),
    );
    if (inAnswerMode) {
      questionHintButton.style.display = "none";
    }

    const questionHintContainer = createNode({
      tag: "div",
      class: ["question-hint-container"],
      parent: questionHints,
    });
    for (const hint of hints) {
      const hintElem = createNode({
        tag: "span",
        value: hint,
        class: ["question-hint"],
        parent: questionHintContainer,
      });
      hintElem.dataset.revealed = "false";
      hintElem.style.display = inAnswerMode ? "block" : "none";
    }
  }

  const secret = q.getSecret();
  if (isSection && secret) {
    let str = quiz.params.hideSecretThemeMessage
      ? ""
      : `[play-secret-theme-message]`;
    if (quiz.inAnswerMode()) {
      str = `[play-secret-theme-word]: <b>${secret}</b>`;
    }
    const haveSomethingToDisplay = str.length > 0;
    if (haveSomethingToDisplay) {
      const sectionSecret = createNode({
        tag: "div",
        value: str,
        class: ["question-comment", "question-secret"],
        parent: sideLeft,
        quiz: quiz,
      });
    }
  }

  quiz.nodes.mediaNodes = [];
  if (hasMedia) {
    const media = createNode({
      tag: "div",
      class: "question-media",
      parent: sideRight,
    });
    mediaNodes.forEach((x) => media.appendChild(x));
    quiz.nodes.mediaNodes = mediaNodes;
  }

  if (hasAnswers) {
    const answers = createNode({
      tag: "div",
      class: "question-answers",
      parent: answersParent,
    });
    answerNodes.forEach((x) => answers.appendChild(x));
    revealCorrectAnswersOnNodes(answerNodes, q, params);
  }

  // Sources are more like "footnotes", should always be close to bottom
  const sources = q.getSources();
  if (sources) {
    const questionSources = createNode({
      tag: "div",
      value: `<b>[play-sources-word]:</b> ${sources}`,
      class: ["question-comment", "question-sources"],
      parent: sideLeft,
      quiz: quiz,
    });
  }

  return cont;
};
