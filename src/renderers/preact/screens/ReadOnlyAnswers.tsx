/**
 * Read-only answers.
 *
 * Two jobs, one file:
 * - answer mode, where the correct ones are marked;
 * - question mode without input, where the options are visible but the answer
 *   is not. Sort and match get their own shape, because their authored order
 *   (or their pairs) is the answer.
 */

import type { JSX } from "preact";
import { derivedRng, shuffleAway } from "../../../core/plan/shuffle";
import { parseInline } from "../../../core/format/inline";
import { QuestionType } from "../../../core/model/question";
import type { Quiz } from "../../../core/session/quiz";
import type { QuestionViewModel } from "../../../core/session/viewModel";
import { Inline } from "../components/Inline";
import { Media } from "../components/Media";
import { answerLabel } from "../components/answerLabels";
import { Feedback } from "../../forms/fields";
import { useT } from "../i18n";
import { markKey, markOf } from "../../../core/values/marks";

export function ReadOnlyAnswers({
  quiz,
  screen,
}: {
  readonly quiz: Quiz;
  readonly screen: QuestionViewModel;
}): JSX.Element {
  const t = useT();
  // An open question has one expected answer, not options. "A" in front of it
  // is the shape of a multiple-choice list with the choices missing.
  const labelled = screen.type !== QuestionType.Open;
  return (
    <ol class="pq-answers pq-answers-readonly" data-pq-type={screen.type}>
      {screen.answers.map((answer, index) => (
        <li
          key={answer.id}
          class="pq-answer pq-answer-static"
          data-pq-correct={
            answer.correct === null ? undefined : String(answer.correct)
          }
        >
          {!labelled ||
          answerLabel(index, quiz.config.answerLabels) === "" ? null : (
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
            <Feedback answer={answer} />
          </span>
          {answer.points === null ? null : (
            <span class="pq-answer-score">+{answer.points}</span>
          )}
          {answer.correct === null ? null : (
            <span class="pq-mark" aria-hidden="true">
              {markOf(answer.correct)}
            </span>
          )}
          {answer.correct === null ? null : (
            <span class="pq-visually-hidden">{t(markKey(answer.correct))}</span>
          )}
        </li>
      ))}
    </ol>
  );
}

function splitPair(text: string): readonly [string, string] {
  const index = text.indexOf("~");
  if (index < 0) {
    return [text.trim(), ""];
  }
  return [text.slice(0, index).trim(), text.slice(index + 1).trim()];
}

/** Sort: the items in their starting order, no ranks, no correct order. */
function SortOptions({
  screen,
}: {
  readonly screen: QuestionViewModel;
}): JSX.Element {
  const order = shuffleAway(
    screen.answers.map((answer) => answer.id),
    derivedRng(screen.id, "sort-start"),
  );
  const byId = new Map(screen.answers.map((answer) => [answer.id, answer]));
  return (
    <ol class="pq-answers-plain pq-options">
      {order.map((id) => (
        <li key={id}>
          <Inline nodes={byId.get(id)?.nodes ?? []} />
        </li>
      ))}
    </ol>
  );
}

/** Match: both columns, right side shuffled, nothing connected. */
function MatchOptions({
  screen,
}: {
  readonly screen: QuestionViewModel;
}): JSX.Element {
  const t = useT();
  const pairs = screen.answers.map((answer) => splitPair(answer.text));
  const rights = shuffleAway(
    pairs.map((pair) => pair[1]),
    derivedRng(screen.id, "match-right"),
  );
  return (
    <div class="pq-match pq-match-static">
      <ul class="pq-match-column" aria-label={t("left")}>
        {pairs.map((pair) => (
          <li key={pair[0]} class="pq-match-static-item">
            <Inline nodes={parseInline(pair[0]).nodes} />
          </li>
        ))}
      </ul>
      <ul class="pq-match-column" aria-label={t("right")}>
        {rights.map((right) => (
          <li key={right} class="pq-match-static-item">
            <Inline nodes={parseInline(right).nodes} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The options only. No marks, no correct answer, nothing to press. */
export function QuestionOptions({
  quiz,
  screen,
}: {
  readonly quiz: Quiz;
  readonly screen: QuestionViewModel;
}): JSX.Element | null {
  if (screen.type === QuestionType.Sort) {
    return <SortOptions screen={screen} />;
  }
  if (screen.type === QuestionType.Match) {
    return <MatchOptions screen={screen} />;
  }
  if (screen.type !== QuestionType.Choice) {
    return null;
  }
  return (
    <ol class="pq-answers pq-answers-readonly pq-options">
      {screen.answers.map((answer, index) => (
        <li key={answer.id} class="pq-answer pq-answer-static">
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
        </li>
      ))}
    </ol>
  );
}
