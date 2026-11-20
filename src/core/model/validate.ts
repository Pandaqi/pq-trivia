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
import { MediaKind } from "../values/media";
import { insidePercent, parsePoint } from "../values/point";
import { QuestionType, type QuestionModel } from "./question";
import type { QuizModel } from "./quiz";

const PAIR_SYMBOL = "~";

/** Numbers the way people write them, or NaN. Estimate only needs this much. */
function numberOf(text: string): number {
  return Number(text.replaceAll(" ", "").replace(",", "."));
}

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
    case QuestionType.Rank: {
      if (answers.length < 2) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.MissingAnswers,
            "A rank question needs at least two answers.",
            { location },
          ),
        );
      }
      break;
    }
    case QuestionType.Estimate: {
      const expected = answers[0];
      if (expected === undefined || !Number.isFinite(numberOf(expected))) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.InvalidNumber,
            "An estimate question needs one number as its answer.",
            { location, suggestion: "Add `Answer => 42`." },
          ),
        );
      }
      if (question.tolerance === null) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.InvalidNumber,
            "An estimate question has no Tolerance, so only the exact number counts.",
            { location, suggestion: "Add `Tolerance => 2`." },
          ),
        );
      }
      break;
    }
    case QuestionType.OddOneOut: {
      if (answers.length < 2) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.MissingAnswers,
            "An odd-one-out question needs at least two answers.",
            { location },
          ),
        );
      }
      if (question.alsoAccept.length === 0) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.MissingAnswers,
            "No reasons are accepted, so any reason earns the second half.",
            { location, suggestion: "Add `AlsoAccept => because ...`." },
          ),
        );
      }
      break;
    }
    case QuestionType.Hotspot: {
      if (!question.media.some((item) => item.kind === MediaKind.Image)) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.InvalidValue,
            "A hotspot question needs an image to click on.",
            { location, suggestion: "Add `Media => map.png`." },
          ),
        );
      }
      if (!answers.some((text) => parsePoint(text) !== null)) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.MissingAnswers,
            "A hotspot question needs at least one point, like `Answer => 40,60`.",
            { location },
          ),
        );
      }
      for (const text of answers) {
        const point = parsePoint(text);
        if (
          point !== null &&
          (!insidePercent(point.x) || !insidePercent(point.y))
        ) {
          diagnostics.push(
            syntaxWarning(
              DiagnosticCodes.InvalidNumber,
              `Hotspot point "${text}" sits outside 0 to 100 percent.`,
              { location },
            ),
          );
        }
      }
      break;
    }
    case QuestionType.Matrix: {
      if (question.rows.length === 0) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.MissingQuestion,
            "A matrix question needs at least one row.",
            {
              location,
              suggestion: "Add `Rows => Statement one | Statement two`.",
            },
          ),
        );
      }
      if (question.scale.length < 2) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.MissingAnswers,
            "A matrix question needs a scale with at least two options.",
            { location },
          ),
        );
      }
      if (
        question.correct.length > 0 &&
        question.correct.length !== question.rows.length
      ) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.MissingAnswers,
            "`Correct` should have one line per row, in the same order.",
            { location },
          ),
        );
      }
      break;
    }
    case QuestionType.Parts: {
      if (question.parts.length === 0) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.MissingQuestion,
            "A parts question needs at least one part.",
            { location, suggestion: "Add `Parts => open: Name`." },
          ),
        );
      }
      if (answers.length < question.parts.length) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.MissingAnswers,
            `There are ${question.parts.length} parts but only ${answers.length} answers.`,
            {
              location,
              suggestion: "Use || to give each part its own answers.",
            },
          ),
        );
      }
      break;
    }
    case QuestionType.Classification: {
      if (question.buckets.length < 2) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.MissingAnswers,
            "A classification question needs at least two buckets.",
            { location, suggestion: "Add `Buckets => 1960s | 1990s`." },
          ),
        );
      }
      // Items are plain in `Answers`; `Correct => Item @ Bucket` says where
      // each one goes. Without it there is nothing to grade.
      const mapped =
        question.correct.length > 0
          ? question.correct.map((value) => value.text)
          : answers;
      if (question.correct.length === 0) {
        diagnostics.push(
          syntaxWarning(
            DiagnosticCodes.MissingAnswers,
            "A classification question has no place for its items.",
            { location, suggestion: "Add `Correct => Item @ Bucket`." },
          ),
        );
      }
      for (const text of mapped) {
        const bucket = text.split("@")[1]?.trim();
        if (bucket === undefined || !question.buckets.includes(bucket)) {
          diagnostics.push(
            syntaxWarning(
              DiagnosticCodes.InvalidValue,
              `"${text}" is not placed in a known bucket.`,
              { location, suggestion: "Write `Item @ Bucket` in Correct." },
            ),
          );
        }
      }
      break;
    }
    case QuestionType.Diagram: {
      if (answers.length === 0) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.MissingAnswers,
            "A diagram question needs labels to place.",
            { location },
          ),
        );
      }
      if (question.targets.length === 0) {
        diagnostics.push(
          syntaxError(
            DiagnosticCodes.MissingQuestion,
            "A diagram question needs targets on its image.",
            { location, suggestion: "Add `Targets => Door @ 20,40`." },
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
