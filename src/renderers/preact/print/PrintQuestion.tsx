/**
 * One question, as body content. The page wrapper is decided by the sheet, so
 * this works on its own page, in a 2×2 grid, or on a flash-card face.
 */

import type { JSX } from "preact";
import { parseInline } from "../../../core/format/inline";
import { numberPrefix } from "../../../core/format/numbering";
import { answerRefs } from "../../../core/model/answers";
import {
  isOpenType,
  QuestionType,
  type QuestionModel,
} from "../../../core/model/question";
import type { SessionState } from "../../../core/session/session";
import type { MediaOptions } from "../../../core/values/media";
import { toMediaViewModel, typeHintOf } from "../../../core/session/viewModel";
import { Inline } from "../components/Inline";
import { Media } from "../components/Media";
import { useT } from "../i18n";
import { typeHintText } from "../typeHint";
import { pluralKey } from "../../../core/values/marks";
import { PrintOptions } from "./PrintOptions";

export function PrintQuestion({
  question,
  index,
  total,
  state,
  roundName,
  showAnswers,
  face = null,
  answerLines = false,
  typeHints = false,
  media = {},
  numbers = true,
}: {
  readonly question: QuestionModel;
  readonly index: number;
  readonly total: number;
  readonly state: SessionState;
  readonly roundName: string | null;
  readonly showAnswers: boolean;
  readonly face?: "front" | "back" | null;
  /** Ruled space to write on. Off unless the host asks for it. */
  readonly answerLines?: boolean;
  /** `PrintTypeHints => false` leaves the paper with the question only. */
  readonly typeHints?: boolean;
  readonly media?: MediaOptions;
  /** `QuestionNumbers => false` leaves the title bare. */
  readonly numbers?: boolean;
}): JSX.Element {
  const t = useT();
  const [title = "", ...body] = question.text.map((value) => value.text);
  const refs = answerRefs(question);
  const hints = question.hints.slice(0, state.hints[question.id] ?? 0);
  const isDiagram = question.type === QuestionType.Diagram;
  const isMatch = question.type === QuestionType.Match;
  const hasOptions =
    question.type === QuestionType.Choice ||
    question.type === QuestionType.OddOneOut ||
    question.type === QuestionType.Sort ||
    question.type === QuestionType.Rank ||
    question.type === QuestionType.Matrix ||
    question.type === QuestionType.Classification ||
    question.type === QuestionType.Parts;
  const typed = isOpenType(question.type);
  const hasMedia = question.media.length > 0;
  const split = hasMedia || hasOptions;
  const front = face === "front";
  const back = face === "back";
  const reveal = back || (face === null && showAnswers);
  const hint = typeHintOf(question);
  // The answer side and an answers-only sheet do not need the rule again.
  const hintText =
    typeHints && !reveal && hint !== null ? typeHintText(t, hint) : null;

  const options = <PrintOptions question={question} reveal={reveal} />;
  // A diagram needs its lettered targets on the map, or the labels cannot be
  // placed on paper. Every other media list stays a plain figure.
  const mediaList = hasMedia ? (
    <div class={isDiagram ? "pq-print-map" : "pq-media-list"}>
      {question.media.map((item) => {
        const view = toMediaViewModel(item, question.alt, media);
        return isDiagram ? (
          <div key={item.path} class="pq-print-map-image">
            <Media item={view} />
            {question.targets.map((target) => (
              <span
                key={target.label}
                class="pq-print-target"
                style={`left:${target.x}%;top:${target.y}%`}
              >
                {target.label}
              </span>
            ))}
          </div>
        ) : (
          <Media key={item.path} item={view} />
        );
      })}
    </div>
  ) : null;
  const splitRight =
    split && !front ? (
      <div class="pq-split-right">
        {mediaList}
        {!hasMedia && hasOptions ? options : null}
        {isDiagram && hasMedia ? options : null}
      </div>
    ) : null;

  return (
    <div class="pq-print-question-body">
      <p class="pq-meta-strip">
        <span class="pq-meta-round">{roundName ?? t("quizWord")}</span>
        <span class="pq-count">
          {t("printQuestion")} {index + 1} / {total}
        </span>
        {question.categories.map((category) => (
          <span class="pq-meta-category">{category}</span>
        ))}
        <span class="pq-points">
          {question.score} {t(pluralKey(question.score, "point"))}
        </span>
      </p>

      <div class={split && !front ? "pq-split" : "pq-split pq-split-single"}>
        <div class="pq-split-left">
          <h2 class="pq-title">
            {numberPrefix(index + 1, numbers)}
            <Inline nodes={parseInline(title).nodes} />
          </h2>
          {hintText === null ? null : <p class="pq-type-hint">{hintText}</p>}
          {body.length === 0 ? null : (
            <p class="pq-body">
              <Inline nodes={parseInline(body.join("\n")).nodes} />
            </p>
          )}
          {hasMedia && hasOptions && !isDiagram && !front ? options : null}
          {front && hasOptions ? options : null}
          {typed && !reveal && answerLines ? (
            <div class="pq-field">
              <span class="pq-field-label">{t("printAnswer")}</span>
              <span class="pq-print-line" />
            </div>
          ) : null}
          {typed && reveal && question.correct.length > 0 ? (
            <p class="pq-answer-key">
              <span>
                <strong>{t("printAnswerColon")}</strong>{" "}
                {question.correct.map((value) => value.text).join(", ")}
              </span>
              <span class="pq-answer-score" aria-hidden="true">
                +{question.score}
              </span>
            </p>
          ) : null}
          {isMatch && !front ? (
            <ol class="pq-answers-plain">
              {refs.map((ref) => (
                <li key={ref.id}>{ref.value.text}</li>
              ))}
            </ol>
          ) : null}
          {question.script !== null &&
          question.printFallback !== null &&
          !front ? (
            <p class="pq-body">{question.printFallback}</p>
          ) : null}
          {hints.length === 0 || front ? null : (
            <div class="pq-hints">
              <ul>
                {hints.map((hint, hintIndex) => (
                  <li key={hintIndex}>
                    <Inline nodes={parseInline(hint.text).nodes} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {splitRight}
      </div>

      {reveal && question.explanation !== null ? (
        <p class="pq-explanation">{question.explanation}</p>
      ) : null}
    </div>
  );
}
