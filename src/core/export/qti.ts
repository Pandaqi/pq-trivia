/**
 * QTI 2.1 export. The boring, compatible subset.
 *
 * Canvas and its friends import this. It does not try to be clever: choice,
 * text, numbers and a plain fallback for the rest.
 */

import { inlineToPlainText, parseInline } from "../format/inline";
import { QuestionType, type QuestionModel } from "../model/question";
import type { QuizMeta } from "../model/quiz";
import type { QuizPlan } from "../plan/plan";
import { answerKeyOf } from "../values/media";
import { visiblePlan } from "./visible";

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function plain(text: string): string {
  return inlineToPlainText(parseInline(text).nodes).trim();
}

function ident(prefix: string, index: number): string {
  return `${prefix}${String(index + 1).padStart(3, "0")}`;
}

function prompt(question: QuestionModel): string {
  return question.text.map((value) => plain(value.text)).join(" ");
}

function choiceItem(question: QuestionModel, index: number): string {
  const correct = new Set(
    question.correct.map((value) => answerKeyOf(value.text)),
  );
  const correctIds = question.answers
    .map((value, position) =>
      correct.has(answerKeyOf(value.text))
        ? `A${index + 1}_${position + 1}`
        : null,
    )
    .filter((id): id is string => id !== null);
  const maxChoices =
    question.type === QuestionType.Choice && question.correct.length > 1
      ? question.correct.length
      : 1;
  const options = question.answers
    .map((value, position) => {
      const id = `A${index + 1}_${position + 1}`;
      return `        <simpleChoice identifier="${id}">${escapeXml(plain(value.text))}</simpleChoice>`;
    })
    .join("\n");
  return `  <assessmentItem identifier="${ident("Q", index)}" title="Question ${index + 1}" adaptive="false" timeDependent="false">
    <responseDeclaration identifier="RESPONSE" cardinality="multiple" baseType="identifier">
      <correctResponse>
${correctIds.map((id) => `        <value>${id}</value>`).join("\n")}
      </correctResponse>
    </responseDeclaration>
    <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
      <defaultValue><value>0</value></defaultValue>
    </outcomeDeclaration>
    <itemBody>
      <p>${escapeXml(prompt(question))}</p>
      <choiceInteraction responseIdentifier="RESPONSE" shuffle="false" maxChoices="${maxChoices}">
${options}
      </choiceInteraction>
    </itemBody>
  </assessmentItem>`;
}

function textItem(question: QuestionModel, index: number): string {
  return `  <assessmentItem identifier="${ident("Q", index)}" title="Question ${index + 1}" adaptive="false" timeDependent="false">
    <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string">
      <correctResponse><value>${escapeXml(plain(question.correct[0]?.text ?? ""))}</value></correctResponse>
    </responseDeclaration>
    <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
      <defaultValue><value>0</value></defaultValue>
    </outcomeDeclaration>
    <itemBody>
      <p>${escapeXml(prompt(question))}</p>
      <extendedTextInteraction responseIdentifier="RESPONSE" expectedLength="40" />
    </itemBody>
  </assessmentItem>`;
}

function numericItem(question: QuestionModel, index: number): string {
  return `  <assessmentItem identifier="${ident("Q", index)}" title="Question ${index + 1}" adaptive="false" timeDependent="false">
    <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="float">
      <correctResponse><value>${escapeXml(plain(question.correct[0]?.text ?? ""))}</value></correctResponse>
    </responseDeclaration>
    <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
      <defaultValue><value>0</value></defaultValue>
    </outcomeDeclaration>
    <itemBody>
      <p>${escapeXml(prompt(question))}</p>
      <textEntryInteraction responseIdentifier="RESPONSE" expectedLength="12" />
    </itemBody>
  </assessmentItem>`;
}

export function toQti(plan: QuizPlan, meta: QuizMeta): string {
  plan = visiblePlan(plan);
  const items = plan.questions
    .map((question, index) => {
      if (
        question.type === QuestionType.Choice ||
        question.type === QuestionType.Sort
      ) {
        return choiceItem(question, index);
      }
      if (question.type === QuestionType.Range) {
        return numericItem(question, index);
      }
      return textItem(question, index);
    })
    .join("\n");
  const title = escapeXml(
    meta.title.length > 0 ? meta.title : "PQ-Trivia quiz",
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentTest xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1" identifier="pq-trivia" title="${title}">
  <testPart navigationMode="linear" submissionMode="individual">
    <assessmentSection identifier="section-1" title="${title}" visible="true">
${items}
    </assessmentSection>
  </testPart>
</assessmentTest>
`;
}
