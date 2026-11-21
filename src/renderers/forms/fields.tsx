/** Shared bits for every input widget: props, field errors, answer text. */

import type { JSX } from "preact";
import type { Quiz } from "../../core/session/quiz";
import type { ResponseIssue } from "../../core/session/policies";
import type {
  AnswerViewModel,
  QuestionViewModel,
} from "../../core/session/viewModel";
import type { Response } from "../../core/session/responses";
import { useT } from "../preact/i18n";
import { Inline } from "../preact/components/Inline";
import { Media } from "../preact/components/Media";

export interface InputProps {
  readonly quiz: Quiz;
  readonly screen: QuestionViewModel;
  readonly response: Response;
  readonly issues: readonly ResponseIssue[];
}

/** The issue for one field, if this field has one. */
export function messageFor(
  issues: readonly ResponseIssue[],
  field: string,
): string | null {
  return issues.find((issue) => issue.field === field)?.message ?? null;
}

export function issueFor(
  issues: readonly ResponseIssue[],
  field: string,
): ResponseIssue | null {
  return issues.find((issue) => issue.field === field) ?? null;
}

export function FieldError({
  issues,
  field,
}: {
  readonly issues: readonly ResponseIssue[];
  readonly field: string;
}): JSX.Element | null {
  const t = useT();
  const found = issueFor(issues, field);
  if (found === null) {
    return null;
  }
  const params =
    found.key === "needBlank"
      ? { number: Number(field.replace("blank-", "")) + 1, ...found.params }
      : (found.params ?? {});
  return (
    <span class="pq-field-error" role="alert">
      {t(found.key, params)}
    </span>
  );
}

/** An answer as text, an image or a clip. One shape everywhere. */
export function AnswerText({
  answer,
}: {
  readonly answer: AnswerViewModel;
}): JSX.Element {
  return answer.media === null ? (
    <Inline nodes={answer.nodes} />
  ) : (
    <Media item={answer.media} />
  );
}

/** The quiet line under an answer, only after the reveal. */
export function Feedback({
  answer,
}: {
  readonly answer: AnswerViewModel;
}): JSX.Element | null {
  return answer.feedback === null ? null : (
    <span class="pq-answer-feedback">
      <Inline nodes={answer.feedback} />
    </span>
  );
}
