/**
 * Play policies. How much the player may skip, and when answers may be shown.
 *
 * `permissive` warns once. `required` needs something in the field. `strict`
 * needs a complete, valid response before moving on.
 */

import { gradeQuestion } from "../grading/grading";
import { answerRefs } from "../model/answers";
import {
  ContinueMode,
  QuestionType,
  type QuestionModel,
} from "../model/question";
import {
  defaultResponse,
  isEmptyResponse,
  ResponseKind,
  type Response,
} from "./responses";
import { currentQuestion, PlayMode, type SessionState } from "./session";

export enum InteractivePolicy {
  Permissive = "permissive",
  Required = "required",
  Strict = "strict",
}

export enum RevealMode {
  Never = "never",
  AfterAnswer = "afterAnswer",
  Always = "always",
}

export interface ResponseIssue {
  readonly questionId: string;
  readonly field: string;
  /** English fallback for hosts that do not translate. */
  readonly message: string;
  /** UI dictionary key. The player prefers this. */
  readonly key: string;
}

function issue(
  question: QuestionModel,
  field: string,
  message: string,
  key = "needAnswer",
): ResponseIssue {
  return { questionId: question.id, field, message, key };
}

function isComplete(question: QuestionModel, response: Response): boolean {
  switch (question.type) {
    case QuestionType.Choice:
    case QuestionType.Match:
    case QuestionType.Open:
    case QuestionType.Range:
    case QuestionType.Estimate:
    case QuestionType.Custom:
    case QuestionType.List:
    case QuestionType.Hotspot:
    case QuestionType.OddOneOut:
    case QuestionType.Parts:
      return !isEmptyResponse(response);
    case QuestionType.Matrix:
      return (
        response.kind === ResponseKind.Matrix &&
        response.rows.length === question.rows.length &&
        response.rows.every((row) => row.length > 0)
      );
    case QuestionType.Classification: {
      const placements =
        response.kind === ResponseKind.Buckets ? response.placements : [];
      return placements.length === question.answers.length;
    }
    case QuestionType.Diagram: {
      const pairs = response.kind === ResponseKind.Match ? response.pairs : [];
      return pairs.length === question.answers.length;
    }
    case QuestionType.Cloze: {
      const blanks =
        response.kind === ResponseKind.Cloze ? response.blanks : [];
      return (
        blanks.length > 0 && blanks.every((blank) => blank.trim().length > 0)
      );
    }
    case QuestionType.Sort:
    case QuestionType.Rank: {
      const order = response.kind === ResponseKind.Sort ? response.order : [];
      return order.length === answerRefs(question).length;
    }
    default:
      return true;
  }
}

/** One message per problem, pointed at the field that needs attention. */
export function responseIssues(
  question: QuestionModel,
  response: Response,
  policy: InteractivePolicy,
  blanked = false,
): ResponseIssue[] {
  // A deliberate blank is a complete answer to "do you know this?".
  if (policy === InteractivePolicy.Permissive || blanked) {
    return [];
  }
  const issues: ResponseIssue[] = [];
  const empty = isEmptyResponse(response);

  if (empty) {
    issues.push(
      issue(
        question,
        "answer",
        messageFor(question)[0],
        messageFor(question)[1],
      ),
    );
    if (policy === InteractivePolicy.Strict) {
      issues.push(...completenessIssues(question, response));
    }
    return dedupe(issues);
  }

  if (policy === InteractivePolicy.Strict && !isComplete(question, response)) {
    issues.push(...completenessIssues(question, response));
  }
  return dedupe(issues);
}

function messageFor(question: QuestionModel): readonly [string, string] {
  switch (question.type) {
    case QuestionType.Choice:
      return ["Choose at least one answer.", "needChoice"];
    case QuestionType.Range:
    case QuestionType.Estimate:
      return ["Enter a number.", "needNumber"];
    case QuestionType.Hotspot:
      return ["Click the image.", "needSpot"];
    case QuestionType.OddOneOut:
      return ["Pick the odd one out and say why.", "needReason"];
    case QuestionType.Matrix:
      return ["Answer every row.", "needRows"];
    case QuestionType.Parts:
      return ["Fill in every part.", "needParts"];
    case QuestionType.Classification:
      return ["Put every item in a bucket.", "needBuckets"];
    case QuestionType.Diagram:
      return ["Place every label.", "needLabels"];
    case QuestionType.List:
      return ["Give at least one answer.", "needList"];
    case QuestionType.Sort:
      return ["Put the answers in order.", "needSort"];
    case QuestionType.Match:
      return ["Connect the pairs.", "needMatch"];
    case QuestionType.Cloze:
      return ["Fill in the blanks.", "needCloze"];
    case QuestionType.Custom:
      return ["Complete the widget.", "needWidget"];
    default:
      return ["Type an answer.", "needText"];
  }
}

function completenessIssues(
  question: QuestionModel,
  response: Response,
): ResponseIssue[] {
  const issues: ResponseIssue[] = [];
  switch (question.type) {
    case QuestionType.Cloze: {
      const blanks =
        response.kind === ResponseKind.Cloze ? response.blanks : [];
      blanks.forEach((blank, index) => {
        if (blank.trim().length === 0) {
          issues.push(
            issue(
              question,
              `blank-${index}`,
              `Fill in blank ${index + 1}.`,
              "needBlank",
            ),
          );
        }
      });
      break;
    }
    case QuestionType.Sort:
    case QuestionType.Rank: {
      const order = response.kind === ResponseKind.Sort ? response.order : [];
      if (order.length !== answerRefs(question).length) {
        issues.push(
          issue(
            question,
            "order",
            "Use every answer exactly once.",
            "needAllOnce",
          ),
        );
      }
      break;
    }
    case QuestionType.Match: {
      const pairs = response.kind === ResponseKind.Match ? response.pairs : [];
      const expected = question.answers.length;
      if (pairs.length !== expected) {
        issues.push(
          issue(
            question,
            "pairs",
            `Connect all ${expected} pairs.`,
            "needPairs",
          ),
        );
      }
      break;
    }
    case QuestionType.Range:
    case QuestionType.Estimate: {
      const value =
        response.kind === ResponseKind.Range ? response.value : null;
      if (value === null) {
        issues.push(issue(question, "number", "Enter a number.", "needNumber"));
      }
      break;
    }
    default:
      break;
  }
  return issues;
}

function dedupe(issues: readonly ResponseIssue[]): ResponseIssue[] {
  const seen = new Set<string>();
  return issues.filter((entry) => {
    if (seen.has(entry.field)) {
      return false;
    }
    seen.add(entry.field);
    return true;
  });
}

/** `afterAnswer` means the player may reveal once they have responded. */
export function canReveal(mode: RevealMode, answered: boolean): boolean {
  if (mode === RevealMode.Always) {
    return true;
  }
  if (mode === RevealMode.AfterAnswer) {
    return answered;
  }
  return false;
}

/** Restricted mode turns answers off, not just hides the button. */
export function answersAllowed(restricted: boolean): boolean {
  return !restricted;
}

export interface NextCheck {
  readonly issues: readonly ResponseIssue[];
  readonly blocked: boolean;
}

/**
 * Everything that can stop `next()`: an empty field in answers mode, or a
 * `Continue` rule that has not been satisfied yet.
 */
export function nextCheck(
  state: SessionState,
  policy: InteractivePolicy,
): NextCheck {
  const question = currentQuestion(state);
  // A section screen has no answer. It never blocks.
  if (question === null || question.type === QuestionType.Section) {
    return { issues: [], blocked: false };
  }
  const response = state.responses[question.id] ?? defaultResponse(question);
  // Only interactive play has fields to fill. A read-aloud quiz has nothing to
  // type in, so "you must answer first" would block the presenter forever.
  // Answer mode is presentation too: the answers are on screen already.
  const blanked = state.noIdea.includes(question.id);
  const issues =
    state.interactive && state.mode === PlayMode.Questions
      ? responseIssues(question, response, policy, blanked)
      : [];
  if (
    question.continueMode === ContinueMode.Always ||
    isEmptyResponse(response) ||
    blanked
  ) {
    return { issues, blocked: false };
  }
  const result = gradeQuestion(question, response);
  const blocked =
    question.continueMode === ContinueMode.OnCorrect
      ? !result.correct
      : result.correct;
  return { issues, blocked };
}
