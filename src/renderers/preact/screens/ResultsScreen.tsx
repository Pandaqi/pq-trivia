/**
 * Results. The honest page: what you got, what it should have been, and a way
 * back into the questions you missed.
 */

import type { JSX } from "preact";
import { useMemo, useState } from "preact/hooks";
import {
  filterQuestions,
  formatDuration,
  GradeBand,
  ReportFilter,
  type QuestionReport,
} from "../../../core/grading/report";
import type { Quiz } from "../../../core/session/quiz";
import type { ResultsViewModel } from "../../../core/session/viewModel";
import { useT } from "../i18n";

const BAND_KEYS: Readonly<Record<string, string>> = {
  [GradeBand.Excellent]: "bandExcellent",
  [GradeBand.Good]: "bandGood",
  [GradeBand.Fair]: "bandFair",
  [GradeBand.Practice]: "bandPractice",
  [GradeBand.Empty]: "bandEmpty",
};

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
  const t = useT();
  const status = question.correct
    ? t("correct")
    : question.answered
      ? t("wrong")
      : t("skipped");
  return (
    <li
      class="pq-review-card"
      data-pq-correct={String(question.correct)}
      data-pq-answered={String(question.answered)}
    >
      <div class="pq-review-head">
        <p class="pq-review-number">
          {t("question_one")} {question.index + 1}
        </p>
        <p class="pq-review-points">
          {question.points} / {question.maxPoints}
        </p>
        <p class="pq-review-status">
          <span aria-hidden="true">{statusMark(question)}</span> {status}
        </p>
      </div>
      <p class="pq-review-title">{question.title}</p>

      {question.parts.length === 0 ? null : (
        <table class="pq-review-parts">
          <thead>
            <tr>
              <th scope="col">{t("part")}</th>
              <th scope="col">{t("yourAnswer")}</th>
              <th scope="col">{t("correctAnswer")}</th>
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
          quiz.goTo(question.planIndex);
        }}
      >
        {t("openQuestion")}
      </button>
    </li>
  );
}

const FILTERS: readonly ReportFilter[] = [
  ReportFilter.All,
  ReportFilter.Wrong,
  ReportFilter.Unanswered,
];

export function ResultsScreen({
  quiz,
  screen,
}: {
  readonly quiz: Quiz;
  readonly screen: ResultsViewModel;
}): JSX.Element {
  const t = useT();
  const report = screen.report;
  const [filter, setFilter] = useState<ReportFilter>(ReportFilter.All);
  const entries = useMemo(
    () => filterQuestions(report, filter),
    [report, filter],
  );
  const labels: Readonly<Record<string, string>> = {
    [ReportFilter.All]: t("filterAll"),
    [ReportFilter.Wrong]: t("filterWrong"),
    [ReportFilter.Unanswered]: t("filterSkipped"),
  };

  return (
    <main class="pq-screen pq-screen-results" data-pq-band={report.band}>
      <header class="pq-header">
        <p class="pq-kicker">{t("results")}</p>
        <h1 class="pq-title" data-pq-heading tabIndex={-1}>
          {screen.title || t("untitled")}
        </h1>
        {quiz.config.hideScore === true ? null : (
          <p class="pq-score">
            <strong class="pq-score-points">{report.points}</strong>
            <span class="pq-score-max"> / {report.maxPoints}</span>
            <span class="pq-score-percent">{report.percent}%</span>
          </p>
        )}
        <p class="pq-band">{t(BAND_KEYS[report.band] ?? "bandEmpty")}</p>
        <dl class="pq-stats">
          <div>
            <dt>{t("correct")}</dt>
            <dd>{report.correct}</dd>
          </div>
          <div>
            <dt>{t("wrong")}</dt>
            <dd>{report.wrong}</dd>
          </div>
          <div>
            <dt>{t("skipped")}</dt>
            <dd>{report.unanswered}</dd>
          </div>
          <div>
            <dt>{t("time")}</dt>
            <dd>{formatDuration(report.durationMs) || "—"}</dd>
          </div>
        </dl>
      </header>

      {report.rounds.length === 0 ? null : (
        <table class="pq-table pq-round-table">
          <caption>{t("perRound")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("roundWord")}</th>
              <th scope="col">{t("correct")}</th>
              <th scope="col">{t("points")}</th>
              <th scope="col">%</th>
            </tr>
          </thead>
          <tbody>
            {report.rounds.map((round) => (
              <tr key={round.id}>
                <th scope="row">{round.name || t("unnamedRound")}</th>
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
        <ul class="pq-chip-list" aria-label={t("perCategory")}>
          {report.categories.map((category) => (
            <li key={category.name} class="pq-chip">
              {category.name} {category.percent}%
            </li>
          ))}
        </ul>
      )}

      <div class="pq-filters" role="group" aria-label={t("filterQuestions")}>
        {FILTERS.map((value) => {
          const count = filterQuestions(report, value).length;
          return (
            <button
              key={value}
              type="button"
              class="pq-filter"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {labels[value] ?? value}{" "}
              <span class="pq-filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      {entries.length === 0 ? (
        <p class="pq-empty">{t("nothingHere")}</p>
      ) : (
        <ol class="pq-review">
          {entries.map((entry) => (
            <ReviewCard key={entry.id} quiz={quiz} question={entry} />
          ))}
        </ol>
      )}

      {quiz.config.disableUI === true ? null : (
        <footer class="pq-toolbar">
          <button type="button" onClick={() => window.print()}>
            {t("print")}
          </button>
          <button type="button" onClick={() => quiz.retryWrong()}>
            {t("retryWrong")}
          </button>
          <button type="button" onClick={() => quiz.restart()}>
            {t("playAgain")}
          </button>
          <button
            type="button"
            class="pq-primary"
            onClick={() => quiz.hideResults()}
          >
            {t("back")}
          </button>
        </footer>
      )}
    </main>
  );
}
