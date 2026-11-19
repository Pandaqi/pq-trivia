/**
 * Results. The honest page: what you got, what it should have been, and a way
 * back into the questions you missed.
 */

import type { JSX } from "preact";
import { useMemo, useState } from "preact/hooks";
import {
  bandLabel,
  filterQuestions,
  formatDuration,
  ReportFilter,
  type QuestionReport,
} from "../../../core/grading/report";
import type { Quiz } from "../../../core/session/quiz";
import type { ResultsViewModel } from "../../../core/session/viewModel";

function statusOf(question: QuestionReport): string {
  if (question.correct) {
    return "Correct";
  }
  return question.answered ? "Wrong" : "Skipped";
}

function statusMark(question: QuestionReport): string {
  if (question.correct) {
    return "✓";
  }
  return question.answered ? "✗" : "–";
}

function ReviewCard({
  quiz,
  question,
}: {
  readonly quiz: Quiz;
  readonly question: QuestionReport;
}): JSX.Element {
  return (
    <li
      class="pq-review-card"
      data-pq-correct={String(question.correct)}
      data-pq-answered={String(question.answered)}
    >
      <div class="pq-review-head">
        <p class="pq-review-number">Question {question.index + 1}</p>
        <p class="pq-review-points">
          {question.points} / {question.maxPoints}
        </p>
        <p class="pq-review-status">
          <span aria-hidden="true">{statusMark(question)}</span>{" "}
          {statusOf(question)}
        </p>
      </div>
      <p class="pq-review-title">{question.title}</p>

      {question.parts.length === 0 ? null : (
        <table class="pq-review-parts">
          <thead>
            <tr>
              <th scope="col">Part</th>
              <th scope="col">Your answer</th>
              <th scope="col">Correct answer</th>
            </tr>
          </thead>
          <tbody>
            {question.parts.map((part, index) => (
              <tr key={index} data-pq-correct={String(part.correct)}>
                <th scope="row">{part.label}</th>
                <td>{part.given.length === 0 ? "—" : part.given}</td>
                <td>{part.expected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {question.explanation === null ? null : (
        <p class="pq-review-explanation">{question.explanation}</p>
      )}

      {question.sources.length === 0 ? null : (
        <p class="pq-review-sources">
          {question.sources.map((source) => (
            <span key={source}>{source}</span>
          ))}
        </p>
      )}

      <button
        type="button"
        class="pq-link"
        onClick={() => {
          quiz.hideResults();
          quiz.goTo(question.index);
        }}
      >
        Open question
      </button>
    </li>
  );
}

const FILTERS: ReadonlyArray<readonly [ReportFilter, string]> = [
  [ReportFilter.All, "All"],
  [ReportFilter.Wrong, "Wrong"],
  [ReportFilter.Unanswered, "Skipped"],
];

export function ResultsScreen({
  quiz,
  screen,
}: {
  readonly quiz: Quiz;
  readonly screen: ResultsViewModel;
}): JSX.Element {
  const report = screen.report;
  const [filter, setFilter] = useState<ReportFilter>(ReportFilter.All);
  const entries = useMemo(
    () => filterQuestions(report, filter),
    [report, filter],
  );

  return (
    <main class="pq-screen pq-screen-results" data-pq-band={report.band}>
      <header class="pq-header">
        <p class="pq-kicker">Results</p>
        <h1 class="pq-title" data-pq-heading tabIndex={-1}>
          {screen.title}
        </h1>
        <p class="pq-score">
          <strong class="pq-score-points">{report.points}</strong>
          <span class="pq-score-max"> / {report.maxPoints}</span>
          <span class="pq-score-percent">{report.percent}%</span>
        </p>
        <p class="pq-band">{bandLabel(report.band)}</p>
        <dl class="pq-stats">
          <div>
            <dt>Correct</dt>
            <dd>{report.correct}</dd>
          </div>
          <div>
            <dt>Wrong</dt>
            <dd>{report.wrong}</dd>
          </div>
          <div>
            <dt>Skipped</dt>
            <dd>{report.unanswered}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{formatDuration(report.durationMs) || "—"}</dd>
          </div>
        </dl>
      </header>

      {report.rounds.length === 0 ? null : (
        <table class="pq-table pq-round-table">
          <caption>Per round</caption>
          <thead>
            <tr>
              <th scope="col">Round</th>
              <th scope="col">Correct</th>
              <th scope="col">Points</th>
              <th scope="col">Percent</th>
            </tr>
          </thead>
          <tbody>
            {report.rounds.map((round) => (
              <tr key={round.id}>
                <th scope="row">{round.name || "Unnamed round"}</th>
                <td>
                  {round.correct} / {round.questions}
                </td>
                <td>
                  {round.points} / {round.maxPoints}
                </td>
                <td>{round.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {report.categories.length === 0 ? null : (
        <ul class="pq-chip-list" aria-label="Per category">
          {report.categories.map((category) => (
            <li key={category.name} class="pq-chip">
              {category.name} {category.percent}%
            </li>
          ))}
        </ul>
      )}

      <div class="pq-filters" role="group" aria-label="Filter questions">
        {FILTERS.map(([value, label]) => {
          const count = filterQuestions(report, value).length;
          return (
            <button
              key={value}
              type="button"
              class="pq-filter"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label} <span class="pq-filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      {entries.length === 0 ? (
        <p class="pq-empty">Nothing here. That is a good sign.</p>
      ) : (
        <ol class="pq-review">
          {entries.map((entry) => (
            <ReviewCard key={entry.id} quiz={quiz} question={entry} />
          ))}
        </ol>
      )}

      <footer class="pq-toolbar">
        <button type="button" onClick={() => window.print()}>
          Print
        </button>
        <button type="button" onClick={() => quiz.retryWrong()}>
          Retry wrong only
        </button>
        <button type="button" onClick={() => quiz.restart()}>
          Play again
        </button>
        <button
          type="button"
          class="pq-primary"
          onClick={() => quiz.hideResults()}
        >
          Back
        </button>
      </footer>
    </main>
  );
}
