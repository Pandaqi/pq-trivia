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
import { isMappingType, QuestionType } from "../../../core/model/question";
import type { GradePart } from "../../../core/grading/types";
import type { Quiz } from "../../../core/session/quiz";
import type { QuestionViewModel } from "../../../core/session/viewModel";
import { Inline } from "../components/Inline";
import { Media } from "../components/Media";
import { answerLabel } from "../components/answerLabels";
import { Feedback } from "../../forms/fields";
import { useT } from "../i18n";
import { markKey, markOf } from "../../../core/values/marks";

/** Types where the scored parts are not the answer list. */
const PART_REVEAL = new Set<QuestionType>([
  QuestionType.Matrix,
  QuestionType.OddOneOut,
  QuestionType.Parts,
  QuestionType.Rank,
  QuestionType.Sort,
]);

export function ReadOnlyAnswers({
  quiz,
  screen,
}: {
  readonly quiz: Quiz;
  readonly screen: QuestionViewModel;
}): JSX.Element {
  const t = useT();
  if (
    screen.type === QuestionType.Hotspot &&
    screen.map !== null &&
    screen.gradeParts !== null
  ) {
    return <HotspotReveal screen={screen} />;
  }
  // Pairs, placements and rows are judged as parts. The answer list alone
  // would mark every row wrong, or show the scale instead of the row answers.
  if (
    screen.gradeParts !== null &&
    screen.gradeParts.length > 0 &&
    (isMappingType(screen.type) || PART_REVEAL.has(screen.type))
  ) {
    return <PartsReveal parts={screen.gradeParts} />;
  }
  // An open question has one expected answer, not options. "A" in front of it
  // is the shape of a multiple-choice list with the choices missing.
  const labelled = screen.type !== QuestionType.Open;
  return (
    <ol class="pq-answers pq-answers-readonly" data-pq-type={screen.type}>
      {screen.answers.map((answer, index) => {
        const label = labelled
          ? answerLabel(index, quiz.config.answerLabels)
          : "";
        return (
          <li
            key={answer.id}
            class="pq-answer pq-answer-static"
            data-pq-correct={
              answer.correct === null ? undefined : String(answer.correct)
            }
          >
            {label === "" ? null : (
              <span class="pq-answer-number" aria-hidden="true">
                {label}
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
              <span class="pq-visually-hidden">
                {t(markKey(answer.correct))}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** A hotspot is a place on the picture, so show the place, not two numbers. */
function spotOf(value: string): { x: number; y: number } | null {
  const match = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(
    value.trim(),
  );
  if (match === null) {
    return null;
  }
  return { x: Number(match[1]), y: Number(match[2]) };
}

function HotspotReveal({
  screen,
}: {
  readonly screen: QuestionViewModel;
}): JSX.Element | null {
  const t = useT();
  if (screen.map === null) {
    return null;
  }
  const part = screen.gradeParts?.[0];
  const given = part === undefined ? null : spotOf(part.given);
  const expectedText =
    part?.expected ??
    screen.answers.find((answer) => answer.correct)?.text ??
    "";
  const expected = spotOf(expectedText);
  if (expected === null) {
    return null;
  }
  const same = part?.correct === true;
  return (
    <figure class="pq-hotspot-reveal">
      <div class="pq-hotspot-reveal-map">
        <img
          src={screen.map.path}
          alt={screen.map.alt ?? ""}
          loading="lazy"
          decoding="async"
        />
        <span
          class="pq-map-marker pq-map-marker-right"
          style={`left:${expected.x}%;top:${expected.y}%`}
          aria-hidden="true"
        />
        {given === null || same ? null : (
          <span
            class="pq-map-marker pq-map-marker-given"
            style={`left:${given.x}%;top:${given.y}%`}
            aria-hidden="true"
          />
        )}
      </div>
      <figcaption class="pq-hotspot-legend">
        {given === null || same ? null : (
          <span>
            <span
              class="pq-hotspot-dot pq-hotspot-dot-given"
              aria-hidden="true"
            />{" "}
            {t("yourAnswer")}
          </span>
        )}
        <span>
          <span
            class="pq-hotspot-dot pq-hotspot-dot-right"
            aria-hidden="true"
          />{" "}
          {t("correctAnswer")}
        </span>
      </figcaption>
    </figure>
  );
}

/** Match pairs read better with an arrow than the syntax's tilde. */
function pairText(value: string): string {
  return value.split(" ~ ").join(" → ");
}

/** One row per graded part: what was put where, and what was wanted. */
function PartsReveal({
  parts,
}: {
  readonly parts: readonly GradePart[];
}): JSX.Element {
  const t = useT();
  return (
    <table class="pq-review-parts pq-mapping-reveal">
      <thead>
        <tr>
          <th scope="col">{t("part")}</th>
          <th scope="col">{t("yourAnswer")}</th>
          <th scope="col">{t("correctAnswer")}</th>
        </tr>
      </thead>
      <tbody>
        {parts.map((part, index) => (
          <tr key={index} data-pq-correct={String(part.correct)}>
            <th scope="row">
              {part.label}
              <span class="pq-visually-hidden">
                {" — "}
                {t(part.given.length === 0 ? "skipped" : markKey(part.correct))}
              </span>
            </th>
            <td>{part.given.length === 0 ? "—" : pairText(part.given)}</td>
            <td>{pairText(part.expected)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function splitPair(text: string): readonly [string, string] {
  const index = text.indexOf("~");
  if (index < 0) {
    return [text.trim(), ""];
  }
  return [text.slice(0, index).trim(), text.slice(index + 1).trim()];
}

/** The option cards for choice, odd-one-out, rank and sort. */
function OptionCards({
  quiz,
  screen,
  labels = true,
  shuffle = false,
}: {
  readonly quiz: Quiz;
  readonly screen: QuestionViewModel;
  readonly labels?: boolean;
  readonly shuffle?: boolean;
}): JSX.Element {
  const answers = shuffle
    ? shuffleAway(screen.answers, derivedRng(screen.id, "sort-start"))
    : screen.answers;
  return (
    <ol class="pq-answers pq-answers-readonly pq-options">
      {answers.map((answer, index) => {
        const label = labels
          ? answerLabel(index, quiz.config.answerLabels)
          : "";
        return (
          <li key={answer.id} class="pq-answer pq-answer-static">
            {label === "" ? null : (
              <span class="pq-answer-number" aria-hidden="true">
                {label}
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
        );
      })}
    </ol>
  );
}

/** Matrix: the statements and the shared scale, with nothing to press. */
function MatrixOptions({
  screen,
}: {
  readonly screen: QuestionViewModel;
}): JSX.Element {
  return (
    <table class="pq-matrix pq-matrix-static">
      <thead>
        <tr>
          <td />
          {screen.answers.map((answer) => (
            <th key={answer.id} scope="col">
              <Inline nodes={answer.nodes} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {screen.rows.map((row, index) => (
          <tr key={`${index}-${row}`}>
            <th scope="row">
              <Inline nodes={parseInline(row).nodes} />
            </th>
            {screen.answers.map((answer) => (
              <td key={answer.id}>
                <span class="pq-matrix-dot" aria-hidden="true" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Diagram and classification item chips. */
function LabelChips({
  answers,
  listClass,
  label,
}: {
  readonly answers: QuestionViewModel["answers"];
  readonly listClass: string;
  readonly label: string;
}): JSX.Element {
  return (
    <ul class={listClass} aria-label={label}>
      {answers.map((answer) => (
        <li key={answer.id}>
          <span class="pq-label pq-label-static">
            <Inline nodes={answer.nodes} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Diagram: the labels that have to go somewhere on the picture. */
function DiagramOptions({
  screen,
}: {
  readonly screen: QuestionViewModel;
}): JSX.Element {
  const t = useT();
  return (
    <LabelChips
      answers={screen.answers}
      listClass="pq-labels pq-labels-static"
      label={t("labelList")}
    />
  );
}

/** Classification: the items and the buckets, with no drop zones. */
function ClassificationOptions({
  screen,
}: {
  readonly screen: QuestionViewModel;
}): JSX.Element {
  const t = useT();
  return (
    <div class="pq-classification pq-classification-static">
      <LabelChips
        answers={screen.answers}
        listClass="pq-items"
        label={t("itemList")}
      />
      <div class="pq-buckets">
        {screen.buckets.map((bucket) => (
          <section key={bucket} class="pq-bucket" aria-label={bucket}>
            <span class="pq-bucket-name pq-bucket-static">{bucket}</span>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Parts: the labels a player has to fill in. */
function PartsOptions({
  screen,
}: {
  readonly screen: QuestionViewModel;
}): JSX.Element {
  return (
    <div class="pq-parts pq-parts-static">
      {screen.parts.map((part, index) => (
        <div key={`${index}-${part.label}`} class="pq-part-static">
          <span class="pq-field-label">{part.label}</span>
          <span class="pq-part-line" aria-hidden="true" />
        </div>
      ))}
    </div>
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
  switch (screen.type) {
    case QuestionType.Sort:
    case QuestionType.Rank:
      return <OptionCards quiz={quiz} screen={screen} labels={false} shuffle />;
    case QuestionType.Match:
      return <MatchOptions screen={screen} />;
    case QuestionType.Matrix:
      return <MatrixOptions screen={screen} />;
    case QuestionType.Diagram:
      return <DiagramOptions screen={screen} />;
    case QuestionType.Classification:
      return <ClassificationOptions screen={screen} />;
    case QuestionType.Parts:
      return <PartsOptions screen={screen} />;
    case QuestionType.Choice:
    case QuestionType.OddOneOut:
      return <OptionCards quiz={quiz} screen={screen} />;
    default:
      return null;
  }
}
