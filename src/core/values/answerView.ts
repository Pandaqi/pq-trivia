/**
 * Answers as the renderer sees them.
 *
 * One place decides what an answer is called, whether it is media, whether it
 * is correct yet, and what its feedback says. The question screen and the
 * print sheet both read this shape.
 */

import { InlineKind, parseInline, type InlineNode } from "../format/inline";
import { answerRefs } from "../model/answers";
import {
  OrderMode,
  ScoringMethod,
  type QuestionModel,
} from "../model/question";
import { derivedRng, shuffleWith } from "../plan/shuffle";
import {
  mediaForConfig,
  MediaKind,
  parseMediaDescriptor,
  type MediaOptions,
} from "./media";
import { toMediaViewModel, type MediaViewModel } from "./mediaView";

export interface AnswerViewModel {
  readonly id: string;
  readonly text: string;
  /** The same inline tree the question uses. Links and emphasis work here too. */
  readonly nodes: readonly InlineNode[];
  /** Set when the answer is a media file, like V2 allowed. Otherwise null. */
  readonly media: MediaViewModel | null;
  /** Null in question mode. True or false once answers may be shown. */
  readonly correct: boolean | null;
  /** Points this answer earns, shown in a corner bubble. Null until revealed. */
  readonly points: number | null;
  /** `Feedback =>` for this option. Only after the reveal. */
  readonly feedback: readonly InlineNode[] | null;
}

/** `$` and `FormatText => false` both mean: show the characters, nothing else. */
export function inlineValue(
  value: { readonly text: string; readonly keepAsIs: boolean },
  formatText: boolean,
): readonly InlineNode[] {
  return formatText && !value.keepAsIs
    ? parseInline(value.text).nodes
    : [{ kind: InlineKind.Text, text: value.text }];
}

export function buildAnswers(
  question: QuestionModel,
  showAnswers: boolean,
  mediaOptions: MediaOptions,
  plays: number,
): AnswerViewModel[] {
  const correctTexts = new Set(question.correct.map((value) => value.text));
  const declared = answerRefs(question);
  const refs =
    question.answersOrder === OrderMode.Shuffle
      ? shuffleWith(declared, derivedRng(question.id, "answers"))
      : declared;
  const parts = Math.max(question.correct.length, 1);
  const pointsPerAnswer =
    question.scoring === ScoringMethod.Partial
      ? Math.round((question.score / parts) * 10) / 10
      : question.score;
  const isCorrect = (text: string): boolean =>
    question.negate ? !correctTexts.has(text) : correctTexts.has(text);

  return refs.map((ref) => {
    const correct = showAnswers ? isCorrect(ref.value.text) : null;
    const descriptor = parseMediaDescriptor(ref.value.text);
    const resolved = mediaForConfig(descriptor, mediaOptions);
    const isMedia = !ref.value.keepAsIs && resolved.kind !== MediaKind.File;
    const feedback = showAnswers ? question.feedback[ref.index] : undefined;
    return {
      id: ref.id,
      text: ref.value.text,
      nodes: inlineValue(ref.value, question.formatText),
      media: isMedia
        ? toMediaViewModel(
            descriptor,
            question.alt,
            mediaOptions,
            question.playLimit,
            plays,
          )
        : null,
      correct,
      points: correct === true ? pointsPerAnswer : null,
      feedback: feedback === undefined ? null : parseInline(feedback).nodes,
    };
  });
}
