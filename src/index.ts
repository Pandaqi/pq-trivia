import { Quiz } from "./quiz";
export { Quiz } from "./quiz";

export { Loader } from "./loader/loader";
export { Nodes } from "./nodes/nodes";
export { DOM } from "./interactive/dom";

export { ErrorHandler } from "./tools/errorHandler";

import { TimerStrategy } from "./tools/timer";
export { Timer, TimerStrategy } from "./tools/timer";

export { Question } from "./questions/question";
export { QVal } from "./questions/questionValue";

import { QuizTheme } from "./theme/quizTheme";
export { QuizTheme } from "./theme/quizTheme";

import { QuizAction } from "./interactive/dom";
export { QuizAction } from "./interactive/dom";

import { QuizSetting } from "./tools/quizSetting";
export { QuizSetting } from "./tools/quizSetting";

// @ts-ignore
window.Quiz = Quiz;
// @ts-ignore
window.QuizTheme = QuizTheme;
// @ts-ignore
window.QuizSetting = QuizSetting;
// @ts-ignore
window.TimerStrategy = TimerStrategy;
// @ts-ignore
window.QuizAction = QuizAction;
