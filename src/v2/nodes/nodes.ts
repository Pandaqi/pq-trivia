import { QuizAction } from "../interactive/dom";
import type { Question } from "../questions/question";
import { type Quiz, QuizState } from "../quiz";
import { loadCoreTheme } from "../theme/loadCoreTheme";
import { loadDefaultTheme } from "../theme/loadDefaultTheme";
import { QuizTheme, refreshTheme } from "../theme/quizTheme";
import { showMessage } from "../tools/errorHandler";
import { clamp } from "../tools/helpers";
import type { QuizParams } from "../tools/params";
import { translate } from "../translator/translator";
import { createNode } from "./createNode";
import { QuizScreen } from "./screens/quizScreen";
import { QuizScreenEnd } from "./screens/quizScreenEnd";
import { QuizScreenLoad } from "./screens/quizScreenLoad";
import { QuizScreenPlay } from "./screens/quizScreenPlay";
import { QuizScreenSettings } from "./screens/quizScreenSettings";
import { QuizScreenStart } from "./screens/quizScreenStart";

export interface NodesChange {
  question?: string;
  questionComment?: string;
  questionNumber?: number;
  questionCategory?: string;
  questionAuthor?: string;
  questionScore?: string;
  answers?: string;
  media?: string;
  timer?: string;
  range?: string;
  instruction?: string;
}

export const FONT_SIZE_DEFAULT = 20;
export const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32];

export const readFontSizeFromDocument = () => {
  const curSizeString = window.getComputedStyle(document.body).fontSize;
  return parseInt(curSizeString.slice(0, curSizeString.length - 2));
};

export const SCREENS: Record<QuizState, QuizScreen> = {
  [QuizState.LOAD]: new QuizScreenLoad(),
  [QuizState.START]: new QuizScreenStart(),
  [QuizState.SETTINGS]: new QuizScreenSettings(),
  [QuizState.PLAYING]: new QuizScreenPlay(),
  [QuizState.END]: new QuizScreenEnd(),
};

export const createFullscreenOverlay = (imageInside: HTMLImageElement) => {
  const overlay = document.createElement("div");
  document.body.appendChild(overlay);

  overlay.style.display = "flex";
  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.right = "0";
  overlay.style.top = "0";
  overlay.style.bottom = "0";
  overlay.style.backgroundColor = "rgba(0,0,0,0.66)";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.padding = "3em";

  const overlayImage = document.createElement("img");
  overlayImage.src = imageInside.src;
  overlay.appendChild(overlayImage);

  // close it again
  overlay.addEventListener("click", (ev) => {
    overlay.remove();
    ev.preventDefault();
  });

  return overlay;
};

export const DEFAULT_TOOLBAR_ACTIONS = [
  QuizAction.PREV,
  QuizAction.FONT_SIZE_MIN,
  QuizAction.FONT_SIZE_PLUS,
  QuizAction.NEXT,
];

export const createToolbarNode = (
  action: QuizAction,
  nodes: Nodes,
  quiz: Quiz,
) => {
  const key = `ui-button-${action}`;
  const cont = nodes.nodesUI.container;
  nodes.nodesUI[action] = createNode({
    tag: "button",
    class: key,
    value: `[${key}]`,
    parent: cont,
    quiz: quiz,
    action: action,
  });
};

export class Nodes {
  params: QuizParams;
  nodes: Record<string, HTMLElement>;
  nodesUI: Record<string, HTMLElement>;
  answerNodes: HTMLElement[];
  mediaNodes: HTMLElement[];

  fontSize: number;
  currentScreen: QuizScreen;

  node: HTMLElement; // root node of the whole thig
  nodeScreenContainer: HTMLElement; // root node that contains individual screens
  nodeScreen: HTMLElement; // the actual current screen

  hiddenNodes: string[];
  timerQuestionNode: HTMLElement;
  timerQuestionBarNode: HTMLElement;

  permanentMessage: string;

  constructor(params: QuizParams) {
    this.hiddenNodes = [];
    if (params.hideAuthor) {
      this.hiddenNodes.push("questionAuthor");
    }
    if (params.hideCategory) {
      this.hiddenNodes.push("questionCategory");
    }
    if (params.hideScore) {
      this.hiddenNodes.push("questionScore");
    }

    this.params = params;
    this.nodes = {};
    this.nodesUI = {};
  }

  createHTML(quiz: Quiz) {
    // HEAD/METADATA stuff for webpage template
    document.documentElement.lang = document.documentElement.lang ?? "en-US";
    document.title = this.params.title ?? "Quiz";

    const metaChar = document.createElement("meta");
    metaChar.setAttribute("charset", "utf-8");
    document.head.appendChild(metaChar);

    const metaView = document.createElement("meta");
    metaView.name = "viewport";
    metaView.content = "width=device-width, initial-scale=1";
    document.head.appendChild(metaView);

    if (quiz.params.icon) {
      const favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.href = quiz.params.icon;
    }

    // root container
    this.node = createNode({
      tag: "div",
      class: "quiz-container",
      parent: document.body,
    });

    // toolbar/ui container
    this.nodesUI.container = createNode({
      tag: "div",
      class: "quiz-ui",
      parent: this.node,
    });

    // container for individual loaded screens/questions
    this.nodeScreenContainer = createNode({
      tag: "div",
      class: "quiz-screens-area",
      parent: this.node,
    });
  }

  loadThemes(params: QuizParams) {
    // @NOTE: we do this BEFORE the nodes have been created, as that one actually applies those styles to what's on the screen
    let customTheme: QuizTheme;
    if (this.params.theme) {
      this.params.theme.folderRoot = params.subFolderTheme;
      customTheme = new QuizTheme(this.params.theme);
    }

    const themes = [loadCoreTheme()];
    if (!this.params.hideDefaultStyles && !customTheme) {
      themes.push(loadDefaultTheme());
    }
    if (customTheme) {
      themes.push(customTheme);
    }

    for (const theme of themes) {
      theme.load();
    }

    return themes;
  }

  /*
        SWITCHING SCREENS/STATES
    */
  setScreenData(data: NodesChange) {
    for (const [name, node] of Object.entries(this.nodes)) {
      const noEntry = !data[name];
      const forcedHidden = this.hiddenNodes.includes(name);
      const shouldHide = noEntry || forcedHidden;
      if (shouldHide) {
        node.style.display = "none";
        node.innerHTML = "";
        continue;
      }
      node.innerHTML = data[name];
      node.style.display = "flex";
    }
  }

  toggleLeaveProtection(val: boolean, quiz: Quiz) {
    if (val && this.params.enableSafety) {
      window.onbeforeunload = () =>
        translate(`[ui-leave-safety-message]`, quiz);
      return;
    }
    window.onbeforeunload = null;
  }

  clearScreen() {
    this.nodeScreenContainer.innerHTML = "";
  }
  addScreenNode(node: HTMLElement) {
    this.nodeScreen = node;
    this.nodeScreenContainer.appendChild(node);
  }

  changeScreen(quiz: Quiz) {
    if (this.currentScreen) {
      this.currentScreen.exit(quiz);
    }
    this.clearScreen();
    this.currentScreen = SCREENS[quiz.state];
    const newScreen = this.currentScreen.enter(quiz);
    this.addScreenNode(newScreen);
    this.createToolbar(quiz);
    this.applyThemesToScreen(newScreen, quiz);
  }

  createToolbar(quiz: Quiz) {
    if (this.params.disableUI) {
      return;
    }
    if (!this.nodesUI.container) {
      return;
    }

    this.nodesUI.container.innerHTML = "";

    let toolbarActions = quiz.params.toolbar;
    if (toolbarActions.length <= 0) {
      toolbarActions = DEFAULT_TOOLBAR_ACTIONS.slice();
    }
    const halfNumberActions = Math.round(toolbarActions.length * 0.5);
    const actionsLeft = toolbarActions.splice(0, halfNumberActions);
    const actionsRight = toolbarActions;

    for (const action of actionsLeft) {
      createToolbarNode(action, this, quiz);
    }

    const middleNode = createNode({
      tag: "div",
      style: { width: "100%" },
      parent: this.nodesUI.container,
    });
    this.nodesUI.timerGlobal = createNode({
      tag: "div",
      class: "ui-timer-global",
      value: "00:00",
      parent: middleNode,
    });
    this.nodesUI.permanentMessageNode = createNode({
      tag: "div",
      value: this.permanentMessage,
      class: "quiz-statistics",
      parent: middleNode,
    });

    for (const action of actionsRight) {
      createToolbarNode(action, this, quiz);
    }
  }

  applyThemesToScreen(node: HTMLElement, quiz: Quiz) {
    if (this.currentScreen && this.currentScreen.selfUpdatesTheme) {
      return;
    }
    refreshTheme(quiz, null, node);
  }

  onStateUpdate(quiz: Quiz) {
    this.checkButtonAvailability(quiz);

    // check if we're actively playing and should be protected against accidentally leaving
    const cantLeave = quiz.isPlaying() || quiz.isInteractive();
    this.toggleLeaveProtection(cantLeave, quiz);

    // switch actual screens
    this.changeScreen(quiz);
  }

  checkButtonAvailability(quiz: Quiz) {
    // check which buttons should be enabled
    if (this.nodesUI["ui-button-prev"]) {
      (this.nodesUI["ui-button-prev"] as HTMLButtonElement).disabled =
        quiz.atStart() || quiz.state != QuizState.PLAYING;
    }

    if (this.nodesUI["ui-button-next"]) {
      (this.nodesUI["ui-button-next"] as HTMLButtonElement).disabled =
        quiz.atEnd() || quiz.state != QuizState.PLAYING;
    }
  }

  /*
        QUESTION DISPLAY
    */
  hideQuestion() {
    this.clearScreen();
  }
  showQuestion(q: Question, quiz: Quiz) {
    if (!(this.currentScreen instanceof QuizScreenPlay)) {
      showMessage(`Can't show question if we're not in PLAYING quiz state.`);
      return;
    }
    this.currentScreen.showQuestion(q, quiz);
    this.checkButtonAvailability(quiz);
    quiz.dom.onScreenChanged(this.nodeScreenContainer);

    const shouldStartTimer =
      (!q.isSection() || quiz.params.allowTimerOnSections) &&
      quiz.inQuestionMode();
    const canStartTimer = q.getTimer() > 0 && this.timerQuestionNode;
    if (shouldStartTimer && canStartTimer) {
      quiz.timerQuestion.setNode(this.timerQuestionNode);
      quiz.timerQuestion.addRefreshListener((timer) => {
        this.timerQuestionBarNode.style.right = `${100 - timer.toPercentage() * 100}%`;
      });
      quiz.timerQuestion.start(q.getTimer()); // @NOTE: if no valid duration, this just does nothing
    }
  }

  /*
        MISC HELPERS
    */
  savePermanentMessage(msg: string) {
    this.permanentMessage = msg;
  }
  getUINode() {
    return this.nodesUI.container;
  }

  isPlaying(node: HTMLVideoElement | HTMLAudioElement) {
    return (
      node.currentTime > 0 && !node.paused && !node.ended && node.readyState > 2
    );
  }

  getFirstMediaNode() {
    return this.mediaNodes.find(
      (x) => x instanceof HTMLVideoElement || x instanceof HTMLAudioElement,
    ) as HTMLVideoElement | HTMLAudioElement;
  }

  // @NOTE: plays/pauses the first playable element it finds, not all/any
  toggleMedia() {
    const firstMediaNode = this.getFirstMediaNode();
    if (!firstMediaNode) {
      return;
    }

    if (this.isPlaying(firstMediaNode)) {
      firstMediaNode.pause();
      return;
    }

    firstMediaNode.play();
  }

  makeMediaFullscreen() {
    const firstMediaNode = this.getFirstMediaNode();
    if (!firstMediaNode) {
      return;
    }

    if (firstMediaNode instanceof HTMLImageElement) {
      createFullscreenOverlay(firstMediaNode);
      return;
    }

    firstMediaNode.requestFullscreen();
  }

  revealNextHint() {
    const hintNodes = Array.from(
      this.nodeScreenContainer.getElementsByClassName("question-hint"),
    ) as HTMLElement[];
    let firstUnrevealed = -1;
    for (let i = 0; i < hintNodes.length; i++) {
      if (hintNodes[i].dataset.revealed == "true") {
        continue;
      }
      firstUnrevealed = i;
      break;
    }

    if (firstUnrevealed <= -1) {
      return;
    }

    const targetNode = hintNodes[firstUnrevealed];
    targetNode.style.display = "block";
    targetNode.dataset.revealed = "true";

    const allRevealed = firstUnrevealed + 1 >= hintNodes.length;
    if (allRevealed) {
      const hintButton = this.nodeScreenContainer.getElementsByClassName(
        "question-hint-button",
      )[0] as HTMLButtonElement;
      hintButton.style.display = "none";
    }
  }

  changeFontSize(change: number) {
    const fontSizeReadFromDocument = readFontSizeFromDocument();
    const curSize = this.fontSize ?? fontSizeReadFromDocument;
    let curIndex = FONT_SIZES.indexOf(curSize);
    if (curIndex < 0) {
      curIndex = FONT_SIZES.indexOf(FONT_SIZE_DEFAULT);
    }

    const newIndex = clamp(curIndex + change, 0, FONT_SIZES.length - 1);
    const newFontSize = FONT_SIZES[newIndex];

    this.fontSize = newFontSize;
    document.body.style.setProperty("--font-size", `${newFontSize}px`);
  }
}
