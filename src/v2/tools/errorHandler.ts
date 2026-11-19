import type { QuizParams } from "./params";

export enum ErrorType {
  FAIL = "fail",
  WARNING = "warning",
  FEEDBACK = "feedback",
  SUCCESS = "success",
}

export const showMessage = (...contents) => {
  if (contents.length <= 0) {
    return;
  }

  let type = ErrorType.FAIL;
  if (Object.values(ErrorType).includes(contents[0])) {
    type = contents.shift();
  }

  const ev = new CustomEvent("error-message", {
    detail: { text: contents, type: type },
  });
  document.body.dispatchEvent(ev);
};

export class ErrorHandler {
  node: HTMLElement;

  constructor(params: QuizParams = {}) {
    this.listenForSignals();
    if (params.hideErrors) {
      return;
    }
    this.createContainer();
  }

  listenForSignals() {
    document.body.addEventListener("error-message", (ev: CustomEvent) => {
      this.show(ev.detail.text, ev.detail.type);
    });
  }

  createContainer() {
    const cont = document.createElement("div");
    cont.classList.add("error-handler");
    this.node = cont;
    document.body.appendChild(cont);
  }

  show(val: any, type = ErrorType.FAIL) {
    console.error(...val);

    if (!this.node) {
      return;
    }

    const div = document.createElement("div");
    div.classList.add("error-message", "error-type-" + type);

    let str = "<p>" + val.toString() + "</p>";
    if (Array.isArray(val)) {
      str = "";
      for (const elem of val) {
        str += `<p>${elem.toString()}</p>`;
      }
    }

    let prefix = `<strong>Error: </strong>`;

    div.innerHTML = prefix + str;
    this.node.appendChild(div);

    div.addEventListener("click", (ev) => {
      div.remove();
      ev.stopPropagation();
      ev.preventDefault();
      return false;
    });
  }
}
