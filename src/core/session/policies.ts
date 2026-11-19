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
  readonly message: string;
}

function issue(
  question: QuestionModel,
  field: string,
  message: string,
): ResponseIssue {
  return { questionId: question.id, field, message };
}

function isComplete(question: QuestionModel, response: Response): boolean {
  switch (question.type) {
    case QuestionType.Choice:
    case QuestionType.Match:
    case QuestionType.Open:
    case QuestionType.Range:
    case QuestionType.Custom:
    case QuestionType.List:
      return !isEmptyResponse(response);
    case QuestionType.Cloze: {
      const blanks =
        response.kind === ResponseKind.Cloze ? response.blanks : [];
      return (
        blanks.length > 0 && blanks.every((blank) => blank.trim().length > 0)
      );
    }
    case QuestionType.Sort: {
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
): ResponseIssue[] {
  if (policy === InteractivePolicy.Permissive) {
    return [];
  }
  const issues: ResponseIssue[] = [];
  const empty = isEmptyResponse(response);

  if (empty) {
    issues.push(issue(question, "answer", messageFor(question)));
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

function messageFor(question: QuestionModel): string {
  switch (question.type) {
    case QuestionType.Choice:
      return "Choose at least one answer.";
    case QuestionType.Range:
      return "Enter a number.";
    case QuestionType.List:
      return "Give at least one answer.";
    case QuestionType.Sort:
      return "Put the answers in order.";
    case QuestionType.Match:
      return "Connect the pairs.";
    case QuestionType.Cloze:
      return "Fill in the blanks.";
    case QuestionType.Custom:
      return "Complete the widget.";
    default:
      return "Type an answer.";
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
            issue(question, `blank-${index}`, `Fill in blank ${index + 1}.`),
          );
        }
      });
      break;
    }
    case QuestionType.Sort: {
      const order = response.kind === ResponseKind.Sort ? response.order : [];
      if (order.length !== answerRefs(question).length) {
        issues.push(issue(question, "order", "Use every answer exactly once."));
      }
      break;
    }
    case QuestionType.Match: {
      const pairs = response.kind === ResponseKind.Match ? response.pairs : [];
      const expected = question.answers.length;
      if (pairs.length !== expected) {
        issues.push(issue(question, "pairs", `Connect all ${expected} pairs.`));
      }
      break;
    }
    case QuestionType.Range: {
      const value =
        response.kind === ResponseKind.Range ? response.value : null;
      if (value === null) {
        issues.push(issue(question, "number", "Enter a number."));
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
  if (question === null) {
    return { issues: [], blocked: false };
  }
  const response = state.responses[question.id] ?? defaultResponse(question);
  const issues =
    state.mode === PlayMode.Answers
      ? responseIssues(question, response, policy)
      : [];
  if (
    question.continueMode === ContinueMode.Always ||
    isEmptyResponse(response)
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
