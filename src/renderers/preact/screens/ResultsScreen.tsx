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
  WagerRisk,
  type QuestionReport,
} from "../../../core/grading/report";
import type { Quiz } from "../../../core/session/quiz";
import type { ResultsViewModel } from "../../../core/session/viewModel";
import { useT, type Translate } from "../i18n";
import { pluralKey } from "../../../core/values/marks";
import { Scoreboard } from "../components/Teams";
import { Celebration } from "../../../shared/celebration";

const BAND_KEYS: Readonly<Record<string, string>> = {
  [GradeBand.Excellent]: "bandExcellent",
  [GradeBand.Good]: "bandGood",
  [GradeBand.Fair]: "bandFair",
  [GradeBand.Practice]: "bandPractice",
  [GradeBand.Empty]: "bandEmpty",
};

const CONFIDENCE_KEYS: Readonly<Record<string, string>> = {
  low: "confidenceLow",
  medium: "confidenceMedium",
  high: "confidenceHigh",
};

const RISK_KEYS: Readonly<Record<string, string>> = {
  low: "riskLow",
  medium: "riskMedium",
  high: "riskHigh",
};

function statusMark(question: QuestionReport): string {
  if (question.correct) {
    return "✓";
  }
  return question.answered ? "✗" : "–";
}

/** One word for the outcome. The mark already says the rest. */
function statusLabel(t: Translate, question: QuestionReport): string {
  if (question.correct) {
    return t("correct");
  }
  if (question.answered) {
    return t("wrong");
  }
  return t("skipped");
}

/** A partial answer loses the stake too: only a full correct answer pays it. */
function wagerOutcome(question: QuestionReport): string {
  return question.answered && question.correct ? "wagerWon" : "wagerLost";
}

function hasFlags(question: QuestionReport): boolean {
  return (
    question.noIdea || question.confidence !== null || question.wager !== null
  );
}

/** The small print under a card: no idea, confidence, wager. */
function ReviewFlags({
  question,
}: {
  readonly question: QuestionReport;
}): JSX.Element {
  const t = useT();
  const confidence =
    question.confidence === null ? null : (
      <li class="pq-flag">
        {t("confidenceWord")}:{" "}
        {t(CONFIDENCE_KEYS[question.confidence] ?? question.confidence)}
      </li>
    );
  const wager =
    question.wager === null ? null : (
      <li class="pq-flag">
        {t("wagerResult", {
          wager: question.wager,
          risk: t(RISK_KEYS[question.wagerRisk ?? WagerRisk.Low] ?? "riskLow"),
          outcome: t(wagerOutcome(question)),
        })}
      </li>
    );
  return (
    <ul class="pq-review-flags">
      {question.noIdea ? (
        <li class="pq-flag pq-flag-noidea">{t("noIdea")}</li>
      ) : null}
      {confidence}
      {wager}
    </ul>
  );
}

function ReviewCard({
  quiz,
  question,
}: {
  readonly quiz: Quiz;
  readonly question: QuestionReport;
}): JSX.Element {
  const t = useT();
  const status = statusLabel(t, question);
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
          {question.points}
          {question.points > question.maxPoints
            ? null
            : ` / ${question.maxPoints}`}
          {question.multiplier > 1 ? (
            <span class="pq-review-multiplier">×{question.multiplier}</span>
          ) : null}
        </p>
        <p class="pq-review-status">
          <span aria-hidden="true">{statusMark(question)}</span> {status}
        </p>
      </div>
      {/* The question itself is the way back. A "question type" link was
          never the thing you wanted to click. */}
      <button
        type="button"
        class="pq-review-title pq-review-open"
        title={t("openQuestion")}
        onClick={() => {
          quiz.hideResults();
          quiz.goTo(question.planIndex);
        }}
      >
        {question.title}
      </button>

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

      {hasFlags(question) ? <ReviewFlags question={question} /> : null}

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
  let cheer: string | null = null;
  if (
    quiz.config.celebration !== false &&
    report.band === GradeBand.Excellent
  ) {
    cheer =
      report.percent >= 100 ? t("celebratePerfect") : t("celebrateExcellent");
  }

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
            {report.points > report.maxPoints ? (
              <span class="pq-score-max">
                {" "}
                {t(pluralKey(report.points, "point"))}
              </span>
            ) : (
              <span class="pq-score-max"> / {report.maxPoints}</span>
            )}
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
          {report.noIdea === 0 ? null : (
            <div>
              <dt>{t("noIdea")}</dt>
              <dd>{report.noIdea}</dd>
            </div>
          )}
          <div>
            <dt>{t("time")}</dt>
            <dd>{formatDuration(report.durationMs) || "—"}</dd>
          </div>
        </dl>
      </header>

      {cheer === null ? null : <Celebration message={cheer} />}

      <Scoreboard quiz={quiz} />

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
                  {round.points}
                  {round.points > round.maxPoints
                    ? null
                    : ` / ${round.maxPoints}`}
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
