/**
 * Model checks. Cheap, pure, and pointed at the author's line numbers.
 */

import { countBlanks, parseInline } from "../format/inline";
import {
  DiagnosticCodes,
  syntaxError,
  syntaxWarning,
  type Diagnostic,
} from "../syntax/diagnostics";
import { QuestionType, type QuestionModel } from "./question";
import type { QuizModel } from "./quiz";

const PAIR_SYMBOL = "~";

function answerTexts(question: QuestionModel): string[] {
  return question.answers
    .map((value) => value.text.trim())
    .filter((text) => text.length > 0);
}

export function validateQuestion(question: QuestionModel): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const location = question.location;

  if (question.text.every((value) => value.text.trim().length === 0)) {
    diagnostics.push(
      syntaxError(
        DiagnosticCodes.MissingQuestion,
        `Question "${question.id}" has no text.`,
        {
          location,
          suggestion: "Add a Question line.",
        },
      ),
    );
  }

  const answers = answerTexts(question);

  switch (question.type) {
    case QuestionType.Choice:
    case QuestionType.Sort: {
      if (answers.length < 2) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.MissingAnswers,
            `A ${question.type} question needs at least two answers.`,
            {
              location,
            },
          ),
        );
      }
      for (const correct of question.correct) {
        if (!answers.includes(correct.text.trim())) {
          diagnostics.push(
            syntaxError(
              DiagnosticCodes.CorrectNotInAnswers,
              `Correct answer "${correct.text}" is not one of the answers.`,
              {
                location,
                suggestion: "Fix the spelling, or add it to Answers.",
              },
            ),
          );
        }
      }
      break;
    }
    case QuestionType.Match: {
      if (answers.length < 2) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.MissingAnswers,
            "A match question needs at least two pairs.",
            { location },
          ),
        );
      }
      if (answers.length > 12) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.MissingAnswers,
            "A match question with more than 12 pairs is hard to play.",
            {
              location,
            },
          ),
        );
      }
      for (const pair of answers) {
        if (!pair.includes(PAIR_SYMBOL)) {
          diagnostics.push(
            syntaxWarning(
              DiagnosticCodes.InvalidValue,
              `Match pair "${pair}" has no ~ separator.`,
              {
                location,
                suggestion: "Write `Left ~ Right`.",
              },
            ),
          );
        }
      }
      break;
    }
    case QuestionType.Cloze: {
      const blanks = question.text.reduce(
        (total, value) => total + countBlanks(parseInline(value.text).nodes),
        0,
      );
      if (blanks === 0) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.MissingAnswers,
            "A cloze question has no [blank] markers.",
            { location },
          ),
        );
      }
      if (blanks > 0 && answers.length < blanks) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.MissingAnswers,
            `Cloze has ${blanks} blanks but only ${answers.length} answers.`,
            {
              location,
              suggestion:
                "Add answers, or use || to give each blank its own list.",
            },
          ),
        );
      }
      break;
    }
    case QuestionType.Range: {
      if (question.range === null) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.InvalidNumber,
            "A range question has no Range margin.",
            {
              location,
              suggestion: "Add `Range => 0.5`.",
            },
          ),
        );
      }
      break;
    }
    case QuestionType.List:
    case QuestionType.Open: {
      if (answers.length === 0 && question.correct.length === 0) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.MissingAnswers,
            "This question has no accepted answers, so nothing can be graded.",
            {
              location,
            },
          ),
        );
      }
      break;
    }
    default:
      break;
  }

  return diagnostics;
}

export function validateQuiz(quiz: QuizModel): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const seen = new Set<string>();

  // One message, whatever made it empty: a blank file, a filter, a mistake.
  if (quiz.questions.length === 0) {
    diagnostics.push(
      syntaxWarning(DiagnosticCodes.MissingQuestion, "Quiz is empty.", {
        suggestion:
          "Add a Question block, or check that settings do not hide every round.",
      }),
    );
    return diagnostics;
  }

  for (const question of quiz.questions) {
    if (seen.has(question.id)) {
      diagnostics.push(
        syntaxError(
          DiagnosticCodes.DuplicateId,
          `Two questions share the ID "${question.id}".`,
          {
            location: question.location,
            suggestion: "Give one of them its own ID.",
          },
        ),
      );
    }
    seen.add(question.id);
    diagnostics.push(...validateQuestion(question));
  }

  for (const round of quiz.rounds) {
    if (round.questions.length === 0) {
      diagnostics.push(
        syntaxWarning(
          DiagnosticCodes.UnknownRound,
          `Round "${round.name}" has no questions.`,
          {
            suggestion: "Add questions under it, or remove the header.",
          },
        ),
      );
    }
  }

  return diagnostics;
}
