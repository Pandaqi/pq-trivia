import { createMediaNode } from "../nodes/createMediaNode";
import type { Quiz } from "../quiz";
import { refreshTheme } from "../theme/quizTheme";
import { isValidMediaType } from "../tools/parser";
import { translate } from "../translator/translator";
import type { GradeResults } from "./grade";

const getNodeForAnswer = (answer: string, quiz: Quiz, isCorrect = true) => {
  let node: HTMLElement;
  if (isValidMediaType(answer, quiz.params)) {
    node = createMediaNode({ value: answer }, quiz);
  } else {
    node = document.createElement("span");
    if (isCorrect) {
      node.innerHTML = `<b>${answer}</b>`;
    } else {
      node.innerHTML = `<small>${answer}</small>`;
    }
  }
  return node;
};

export const displayGrade = (res: GradeResults, quiz: Quiz) => {
  let totalPointsScored = 0;
  res.forEach((x) => (totalPointsScored += x.score ?? 0));
  const totalPointsPossible = quiz.translator.db.getStatistics().numPoints;
  const scoreAsPercentage = Math.round(
    (totalPointsScored / (totalPointsPossible + 0.01)) * 100,
  );

  const container = document.createElement("div");

  const header = document.createElement("h1");
  container.appendChild(header);
  header.innerHTML = translate(`[export-grade-heading]`, quiz);

  const summary = document.createElement("div");
  container.appendChild(summary);
  summary.style.textAlign = "center";
  summary.innerHTML = translate(`[export-grade-message]`, quiz, {
    totalPointsScored,
    totalPointsPossible,
    scoreAsPercentage,
  });

  const table = document.createElement("table");
  container.appendChild(table);
  const thead = document.createElement("thead");
  table.appendChild(thead);
  thead.innerHTML = translate(
    `<td class="table-question-number">#</td><td>[export-grade-question-column]</td><td>[export-grade-correct-column]</td><td>[export-grade-answer-column]</td><td>⭐</td>`,
    quiz,
  );

  for (const [question, data] of res.entries()) {
    const tr = document.createElement("tr");
    table.appendChild(tr);

    const correctSymbol = data.isCorrect ? "✔" : "❌"; // "✅" : "❎";
    const qNumber = document.createElement("td");
    tr.appendChild(qNumber);
    qNumber.classList.add("table-question-number");
    qNumber.innerHTML = `${correctSymbol} ${question.getIndexReadable()}.`;

    const qQuestion = document.createElement("td");
    tr.appendChild(qQuestion);
    qQuestion.innerHTML = question.getQuestion();

    const qCorrect = document.createElement("td");
    tr.appendChild(qCorrect);
    const qCorrectSub = document.createElement("div");
    qCorrect.appendChild(qCorrectSub);
    qCorrectSub.classList.add("grade-multiple-option-list");
    for (const answerCorrect of question.getCorrect()) {
      qCorrectSub.appendChild(getNodeForAnswer(answerCorrect, quiz));
    }

    const qAnswers = document.createElement("td");
    tr.appendChild(qAnswers);
    const qAnswersSub = document.createElement("div");
    qAnswers.appendChild(qAnswersSub);
    qAnswersSub.classList.add("grade-multiple-option-list");

    // @TODO: Maybe highlight correct answers immediately in the "correct answers" column, and use "your answers" merely for "your WRONG answers"?
    const answerNodes = [];
    const answersCorrect = data.answersCorrect ?? [];
    const answersGivenClean = (data.answersGiven ?? []).filter(
      (x) => x != undefined,
    );
    for (const answer of answersGivenClean) {
      const wasCorrect = answersCorrect.includes(answer);
      qAnswersSub.appendChild(getNodeForAnswer(answer, quiz, wasCorrect));
    }

    const qScore = document.createElement("td");
    tr.appendChild(qScore);
    qScore.innerHTML = (data.score ?? 0).toString();
  }

  refreshTheme(quiz, null, container);

  return container;
};
