/** Structured answers on paper: the same shapes as the screen, without input. */

import type { JSX } from "preact";
import { parseInline } from "../../../core/format/inline";
import { answerRefs, type AnswerRef } from "../../../core/model/answers";
import {
  expectedBuckets,
  expectedLabels,
} from "../../../core/grading/interfaces";
import { groupsForParts } from "../../../core/model/parts";
import { QuestionType, type QuestionModel } from "../../../core/model/question";
import { derivedRng, shuffleAway } from "../../../core/plan/shuffle";
import { markOf } from "../../../core/values/marks";
import { Inline } from "../components/Inline";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function valueNodes(text: string): JSX.Element {
  return <Inline nodes={parseInline(text).nodes} />;
}

function cardLabel(
  labels: "letters" | "numbers" | null,
  index: number,
): string | null {
  if (labels === "letters") {
    return LETTERS[index] ?? String(index + 1);
  }
  if (labels === "numbers") {
    return String(index + 1);
  }
  return null;
}

function Cards({
  refs,
  reveal,
  labels,
  correctTexts,
}: {
  readonly refs: readonly AnswerRef[];
  readonly reveal: boolean;
  readonly labels: "letters" | "numbers" | null;
  readonly correctTexts?: ReadonlySet<string>;
}): JSX.Element {
  return (
    <ul class="pq-answers">
      {refs.map((ref, index) => {
        const label = cardLabel(labels, index);
        const correct = correctTexts?.has(ref.value.text) === true;
        const marked = reveal && correctTexts !== undefined;
        return (
          <li key={ref.id}>
            <div
              class="pq-answer"
              data-pq-correct={marked ? String(correct) : undefined}
            >
              {label === null ? null : (
                <span class="pq-answer-number" aria-hidden="true">
                  {label}
                </span>
              )}
              <span class="pq-answer-text">{valueNodes(ref.value.text)}</span>
              {marked ? (
                <span class="pq-mark" aria-hidden="true">
                  {markOf(correct)}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function LabelList({
  texts,
  expected,
}: {
  readonly texts: readonly string[];
  readonly expected?: ReadonlyMap<string, string> | undefined;
}): JSX.Element {
  return (
    <ul class="pq-labels pq-labels-static">
      {texts.map((text, index) => {
        const target = expected?.get(text);
        return (
          <li key={`${index}-${text}`}>
            <span class="pq-label pq-label-static">
              {valueNodes(text)}
              {target === undefined ? null : (
                <span class="pq-label-target"> → {target}</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function MatrixOptions({
  question,
  reveal,
}: {
  readonly question: QuestionModel;
  readonly reveal: boolean;
}): JSX.Element {
  return (
    <table class="pq-matrix pq-matrix-static">
      <thead>
        <tr>
          <td />
          {question.answers.map((answer) => (
            <th key={answer.text} scope="col">
              {valueNodes(answer.text)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {question.rows.map((row, rowIndex) => {
          const correct = new Set(
            (question.correct[rowIndex]?.text ?? "")
              .split("+")
              .map((entry) => entry.trim())
              .filter(Boolean),
          );
          return (
            <tr key={`${rowIndex}-${row}`}>
              <th scope="row">{valueNodes(row)}</th>
              {question.answers.map((answer) => (
                <td key={answer.text}>
                  {reveal ? (
                    correct.has(answer.text) ? (
                      <span class="pq-print-mark" aria-hidden="true">
                        {markOf(true)}
                      </span>
                    ) : null
                  ) : (
                    <span class="pq-matrix-dot" aria-hidden="true" />
                  )}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ClassificationOptions({
  question,
  reveal,
}: {
  readonly question: QuestionModel;
  readonly reveal: boolean;
}): JSX.Element {
  const expected = reveal ? new Map(expectedBuckets(question)) : null;
  return (
    <div class="pq-classification pq-classification-static">
      {reveal ? null : (
        <LabelList texts={question.answers.map((answer) => answer.text)} />
      )}
      <div class="pq-buckets">
        {question.buckets.map((bucket) => (
          <section key={bucket} class="pq-bucket" aria-label={bucket}>
            <span class="pq-bucket-name pq-bucket-static">{bucket}</span>
            {reveal ? (
              <ul>
                {question.answers
                  .map((answer) => answer.text)
                  .filter((item) => expected?.get(item) === bucket)
                  .map((item) => (
                    <li key={item}>
                      <span class="pq-label pq-label-static">
                        {valueNodes(item)}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}

function PartsOptions({
  question,
  reveal,
}: {
  readonly question: QuestionModel;
  readonly reveal: boolean;
}): JSX.Element {
  const groups = groupsForParts(
    question.parts,
    question.answers.map((answer) => answer.text),
  );
  return (
    <div class="pq-parts pq-parts-static">
      {question.parts.map((part, index) => (
        <div key={`${index}-${part.label}`} class="pq-part-static">
          <span class="pq-field-label">{part.label}</span>
          {reveal ? (
            <span class="pq-answer-key">
              {groups[index]?.join(" / ") ?? ""}
            </span>
          ) : (
            <span class="pq-part-line" aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}

/** Question-side options, or the answer-side order and marks. */
export function PrintOptions({
  question,
  reveal,
}: {
  readonly question: QuestionModel;
  readonly reveal: boolean;
}): JSX.Element | null {
  const refs = answerRefs(question);
  switch (question.type) {
    case QuestionType.Choice:
    case QuestionType.OddOneOut:
      return (
        <Cards
          refs={refs}
          reveal={reveal}
          labels="letters"
          correctTexts={new Set(question.correct.map((value) => value.text))}
        />
      );
    case QuestionType.Sort:
    case QuestionType.Rank:
      return (
        <Cards
          refs={
            reveal
              ? refs
              : shuffleAway(refs, derivedRng(question.id, "print-sort"))
          }
          reveal={reveal}
          labels={reveal ? "numbers" : null}
        />
      );
    case QuestionType.Matrix:
      return <MatrixOptions question={question} reveal={reveal} />;
    case QuestionType.Diagram: {
      const expected = reveal ? new Map(expectedLabels(question)) : undefined;
      return (
        <LabelList
          texts={question.answers.map((answer) => answer.text)}
          expected={expected}
        />
      );
    }
    case QuestionType.Classification:
      return <ClassificationOptions question={question} reveal={reveal} />;
    case QuestionType.Parts:
      return <PartsOptions question={question} reveal={reveal} />;
    default:
      return null;
  }
}
