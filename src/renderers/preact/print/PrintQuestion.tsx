/**
 * One question, as body content. The page wrapper is decided by the sheet, so
 * this works on its own page, in a 2×2 grid, or on a flash-card face.
 */

import type { JSX } from "preact";
import { parseInline } from "../../../core/format/inline";
import { answerRefs } from "../../../core/model/answers";
import {
  isOpenType,
  QuestionType,
  type QuestionModel,
} from "../../../core/model/question";
import type { SessionState } from "../../../core/session/session";
import { toMediaViewModel } from "../../../core/session/viewModel";
import { Inline } from "../components/Inline";
import { Media } from "../components/Media";
import { useT } from "../i18n";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function PrintQuestion({
  question,
  index,
  total,
  state,
  roundName,
  showAnswers,
  face = null,
}: {
  readonly question: QuestionModel;
  readonly index: number;
  readonly total: number;
  readonly state: SessionState;
  readonly roundName: string | null;
  readonly showAnswers: boolean;
  readonly face?: "front" | "back" | null;
}): JSX.Element {
  const t = useT();
  const [title = "", ...body] = question.text.map((value) => value.text);
  const correctTexts = new Set(question.correct.map((value) => value.text));
  const refs = answerRefs(question);
  const hints = question.hints.slice(0, state.hints[question.id] ?? 0);
  const isChoice = question.type === QuestionType.Choice;
  const isOrdered =
    question.type === QuestionType.Sort || question.type === QuestionType.Match;
  const typed = isOpenType(question.type);
  const hasMedia = question.media.length > 0;
  const split = hasMedia || isChoice || isOrdered;
  const front = face === "front";
  const back = face === "back";
  const reveal = back || (face === null && showAnswers);

  const answers = (
    <ul class="pq-answers">
      {refs.map((ref, answerIndex) => {
        const correct = correctTexts.has(ref.value.text);
        return (
          <li key={ref.id}>
            <div
              class="pq-answer"
              data-pq-correct={reveal ? String(correct) : undefined}
            >
              <span class="pq-answer-number" aria-hidden="true">
                {LETTERS[answerIndex] ?? answerIndex + 1}
              </span>
              <span class="pq-answer-text">{ref.value.text}</span>
              {reveal ? (
                <span class="pq-mark" aria-hidden="true">
                  {correct ? "✓" : "✗"}
                </span>
              ) : null}
              {reveal && correct ? (
                <span class="pq-answer-score" aria-hidden="true">
                  +{question.score}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );

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
          {question.score}{" "}
          {t(question.score === 1 ? "point_one" : "point_other")}
        </span>
      </p>

      <div class={split && !front ? "pq-split" : "pq-split pq-split-single"}>
        <div class="pq-split-left">
          <h2 class="pq-title">
            <Inline nodes={parseInline(title).nodes} />
          </h2>
          {body.length === 0 ? null : (
            <p class="pq-body">
              <Inline nodes={parseInline(body.join("\n")).nodes} />
            </p>
          )}
          {hasMedia && isChoice && !front ? answers : null}
          {isChoice && front ? answers : null}
          {typed && !reveal ? (
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
          {isOrdered && !front ? (
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

        {!split || front ? null : (
          <div class="pq-split-right">
            {hasMedia ? (
              <div class="pq-media-list">
                {question.media.map((item) => (
                  <Media
                    key={item.path}
                    item={toMediaViewModel(item, question.alt)}
                  />
                ))}
              </div>
            ) : null}
            {!hasMedia && isChoice ? answers : null}
          </div>
        )}
      </div>

      {reveal && question.explanation !== null ? (
        <p class="pq-explanation">{question.explanation}</p>
      ) : null}
    </div>
  );
}
