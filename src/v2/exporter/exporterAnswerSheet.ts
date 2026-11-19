import type { Question } from "../questions/question";
import type { Quiz } from "../quiz";
import { markdownify } from "../tools/markdownify";
import { markdownifyNode } from "../tools/markdownifyNode";
import { translate } from "../translator/translator";

export interface ExportAnswersParams {
  showSections?: boolean;
  showQuestion?: boolean;
  simpleMultipleChoice?: boolean;

  heading?: string;
  displayAnswers?: boolean;
  seed?: string;
}

export const convertQuestionToHTML = (
  q: Question,
  quiz: Quiz,
  params: ExportAnswersParams,
) => {
  const tr = document.createElement("tr");

  // show question number
  const qNumber = document.createElement("td");
  tr.appendChild(qNumber);
  qNumber.classList.add("table-question-number");
  qNumber.innerHTML = q.getIndexReadable() + ".";

  // show question itself
  if (params.showQuestion) {
    const qTitle = document.createElement("td");
    tr.appendChild(qTitle);
    qTitle.innerHTML = q.getQuestionFormatted();
  }

  tr.appendChild(
    markdownifyNode(q.typer.toAnswerSheet(params, quiz), q.formatText),
  );

  return tr;
};

export const convertQuizToTable = (quiz: Quiz, params: ExportAnswersParams) => {
  const container = document.createElement("div");
  container.classList.add("printable-table");

  const heading = document.createElement("h1");
  container.appendChild(heading);
  heading.innerHTML = `${params.heading ?? "Quiz Sheet"}<br><small><small>(${quiz.params.title})</small></small>`;

  // make sure it follows our styling
  for (const theme of quiz.themes) {
    theme.applyTo([container], quiz);
  }

  const db = quiz.getCurrentDatabase();
  for (const section of db.getSections()) {
    // sections just create a big heading, then add a new table below
    const node = section.start.typer.toAnswerSheet(params, quiz);
    if (!node) {
      continue;
    }

    container.appendChild(node);
    const currentTable = document.createElement("table");
    container.appendChild(currentTable);

    for (const q of section.getQuestions()) {
      currentTable.appendChild(convertQuestionToHTML(q, quiz, params));
    }
  }

  return container;
};

export const exporterAnswerSheet = (params: ExportAnswersParams) => {
  return (q: Quiz) => {
    params.heading = translate(`[export-answer-sheet-heading]`, q);
    params.displayAnswers = true;
    params.seed = q.params.seed;
    return convertQuizToTable(q, params);
  };
};
