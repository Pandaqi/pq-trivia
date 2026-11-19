/** Answer mode: the same cards, no input. Physical play reads these out. */

import type { JSX } from "preact";
import type { Quiz } from "../../../core/session/quiz";
import type { QuestionViewModel } from "../../../core/session/viewModel";
import { Inline } from "../components/Inline";
import { Media } from "../components/Media";
import { answerLabel } from "../components/answerLabels";
import { useT } from "../i18n";

export function ReadOnlyAnswers({
  quiz,
  screen,
}: {
  readonly quiz: Quiz;
  readonly screen: QuestionViewModel;
}): JSX.Element {
  const t = useT();
  return (
    <ol class="pq-answers pq-answers-readonly">
      {screen.answers.map((answer, index) => (
        <li
          key={answer.id}
          class="pq-answer pq-answer-static"
          data-pq-correct={
            answer.correct === null ? undefined : String(answer.correct)
          }
        >
          {answerLabel(index, quiz.config.answerLabels) === "" ? null : (
            <span class="pq-answer-number" aria-hidden="true">
              {answerLabel(index, quiz.config.answerLabels)}
            </span>
          )}
          <span class="pq-answer-text">
            {answer.media === null ? (
              <Inline nodes={answer.nodes} />
            ) : (
              <Media item={answer.media} />
            )}
          </span>
          {answer.points === null ? null : (
            <span class="pq-answer-score">+{answer.points}</span>
          )}
          {answer.correct === null ? null : (
            <span class="pq-mark" aria-hidden="true">
              {answer.correct ? "✓" : "✗"}
            </span>
          )}
          {answer.correct === null ? null : (
            <span class="pq-visually-hidden">
              {answer.correct ? t("correct") : t("notCorrect")}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
