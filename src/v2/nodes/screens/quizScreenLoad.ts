import { VERSION, type Quiz } from "../../quiz";
import { QuizScreen } from "./quizScreen";

import { loaderBuiltIn } from "../../loader/loaderBuiltIn";
import { loaderHTTP } from "../../loader/loaderHTTP";
import { loaderUpload } from "../../loader/loaderUpload";
import { createNode } from "../createNode";
import {
  getFileExtensionAcceptList,
  isHosted,
} from "lib/pq-trivia/loader/loader";

export class QuizScreenLoad extends QuizScreen {
  enter(quiz: Quiz) {
    const cont = createNode({ tag: "div", class: "quiz-screen" });
    const h1 = createNode({
      tag: "h1",
      value: `[load-heading]`,
      class: ["screen-title", "screen-title-load"],
      parent: cont,
      quiz: quiz,
    });
    const instruc = createNode({
      tag: "div",
      value: `[load-message]`,
      class: ["instruction-text"],
      parent: cont,
      quiz: quiz,
    });

    if (quiz.params.bannerImage) {
      const img = document.createElement("img");
      img.src = quiz.params.bannerImage;
      img.classList.add("banner-image");
      cont.appendChild(img);
    }

    const buttonList = createNode({
      tag: "div",
      class: "button-list",
      parent: cont,
    });
    quiz.nodes.savePermanentMessage(
      `(${quiz.params.title} | PQ-TRIVIA v${VERSION})`,
    );

    // simply loads what has been prepared (always works, available offline, etc)
    const hasBuiltinQuestions = Object.keys(quiz.params.builtin).length > 0;
    if (hasBuiltinQuestions) {
      const buttonPlay = createNode({
        tag: "button",
        value: `[load-button-builtin]`,
        title: `[load-button-builtin-tooltip]`,
        quiz: quiz,
        parent: buttonList,
        click: () => quiz.load(loaderBuiltIn(quiz.params.builtin)),
      });
    }

    // allows adding dynamic files on your server and it loads them on the spot
    if (isHosted()) {
      const buttonDownload = createNode({
        tag: "button",
        value: `[load-button-server]`,
        title: `[load-button-server-tooltip]`,
        quiz: quiz,
        parent: buttonList,
        click: () => quiz.load(loaderHTTP()),
      });
    }

    // allows uploading local files to play with
    const uploadInput = createNode({
      tag: "input",
      type: "file",
      parent: buttonList,
      attributes: {
        multiple: "true",
        accept: getFileExtensionAcceptList(quiz.params),
      },
    }) as HTMLInputElement;

    const buttonUpload = createNode({
      tag: "button",
      value: `[load-button-upload]`,
      title: `[load-button-upload-tooltip]`,
      quiz: quiz,
      parent: buttonList,
      click: () => quiz.load(loaderUpload(uploadInput)),
    });

    return cont;
  }
}
