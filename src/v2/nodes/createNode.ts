import { QuizAction, signal } from "../interactive/dom";
import type { Quiz } from "../quiz";
import { translate } from "../translator/translator";

export interface CreateNodeParams {
  quiz?: Quiz;
  tag?: string;
  value?: string;
  parent?: HTMLElement;
  class?: string | string[];
  style?: Record<string, string>;
  title?: string;
  type?: string;
  click?: (ev) => void;
  attributes?: Record<string, any>;
  action?: QuizAction;
}

export const createNode = (params: CreateNodeParams) => {
  const elem = document.createElement(params.tag ?? "div");
  if (params.parent) {
    params.parent.appendChild(elem);
  }

  let value = params.value ?? "";
  if (params.quiz) {
    value = translate(value, params.quiz);
  }
  elem.innerHTML = value;

  let title = params.title ?? "";
  if (params.quiz) {
    title = translate(title, params.quiz);
  }
  elem.title = title;

  if (params.type && "type" in elem) {
    elem.type = params.type;
  }
  if (params.click) {
    elem.addEventListener("click", params.click);
  }

  if (params.action) {
    elem.addEventListener("click", (ev) => signal(params.action));
  }

  const attr = params.attributes ?? {};
  for (const [key, data] of Object.entries(attr)) {
    elem.setAttribute(key, data.toString());
  }

  let classes = params.class ?? [];
  if (!Array.isArray(classes)) {
    classes = [classes];
  }
  elem.classList.add(...classes);

  const style = params.style ?? {};
  for (const [key, value] of Object.entries(style)) {
    elem.style[key] = value;
  }

  return elem;
};
