/**
 * The print sheet: cover, round pages, question pages, flash cards, or a form.
 *
 * Layout follows the old exports: a coloured bar per round, question left,
 * media or answers right, tinted option blocks with letters. Every page has a
 * fixed A4 box; fit.ts shrinks what is too tall and reports what it cannot.
 */

import type { JSX } from "preact";
import type { ComponentChildren } from "preact";
import type { Quiz } from "../../../core/session/quiz";
import { PlayMode } from "../../../core/session/session";
import type { QuestionModel } from "../../../core/model/question";
import { roundAccent } from "../components/roundAccent";
import { PrintForm, type FormRound } from "./PrintForm";
import { PrintGrade } from "./PrintGrade";
import { PrintQuestion } from "./PrintQuestion";
import type { PrintOptions } from "./printTypes";

export type { PrintOptions, PrintProblem, PrintVariant } from "./printTypes";

function label(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function pointsOf(questions: readonly QuestionModel[]): number {
  return questions.reduce((total, question) => total + question.score, 0);
}

function Page({
  className = "",
  accent,
  questionId,
  children,
}: {
  readonly className?: string;
  readonly accent?: string;
  readonly questionId?: string;
  readonly children: ComponentChildren;
}): JSX.Element {
  return (
    <section
      class={`pq-print-page ${className}`.trim()}
      data-pq-question={questionId}
      style={accent === undefined ? undefined : `--pq-round-accent:${accent}`}
    >
      <div class="pq-print-page-inner">{children}</div>
    </section>
  );
}

function Cover({
  quiz,
  questions,
  rounds,
}: {
  readonly quiz: Quiz;
  readonly questions: readonly QuestionModel[];
  readonly rounds: number;
}): JSX.Element {
  const meta = quiz.meta;
  const title = meta !== null && meta.title.length > 0 ? meta.title : "Quiz";
  const authors = meta?.authors ?? [];
  const seed = quiz.config.seed ?? "";
  return (
    <Page className="pq-print-cover">
      <p class="pq-cover-kicker">PQ-Trivia</p>
      <h1 class="pq-cover-title">{title}</h1>
      {meta?.description === null || meta?.description === undefined ? null : (
        <p class="pq-cover-description">{meta.description}</p>
      )}
      {authors.length === 0 ? null : (
        <p class="pq-cover-byline">by {authors.join(", ")}</p>
      )}
      <p class="pq-cover-banner">
        {label(questions.length, "question")} ·{" "}
        {label(pointsOf(questions), "point")} · {label(rounds, "round")}
      </p>
      {seed.length === 0 ? null : <p class="pq-cover-seed">Seed: {seed}</p>}
    </Page>
  );
}

export function PrintSheet({
  quiz,
  options = {},
}: {
  readonly quiz: Quiz;
  readonly options?: PrintOptions;
}): JSX.Element {
  const state = quiz.state;
  const plan = state.plan;
  const variant = options.variant ?? "auto";
  const perPage = options.perPage ?? 1;
  const flash = options.flashCards === true;

  if (plan === null) {
    return <div class="pq-print-sheet" />;
  }

  const accentFor = (roundId: string | null): string => {
    const index = plan.rounds.findIndex((round) => round.id === roundId);
    return roundAccent(index < 0 ? null : index + 1);
  };
  const roundName = (roundId: string | null): string | null =>
    plan.rounds.find((round) => round.id === roundId)?.name ?? null;
  const rounds: readonly FormRound[] = plan.rounds;
  const showAnswers =
    variant === "answers" ||
    (variant === "auto" && state.mode === PlayMode.Answers);
  const indexOf = (question: QuestionModel): number =>
    plan.questions.indexOf(question);

  const question = (
    item: QuestionModel,
    face: "front" | "back" | null,
  ): JSX.Element => (
    <PrintQuestion
      question={item}
      index={indexOf(item)}
      total={plan.questions.length}
      state={state}
      roundName={roundName(item.round)}
      showAnswers={showAnswers || state.revealed.includes(item.id)}
      face={face}
    />
  );

  const page = (item: QuestionModel): JSX.Element => (
    <Page
      className="pq-print-question"
      key={item.id}
      questionId={item.id}
      accent={accentFor(item.round)}
    >
      {question(item, null)}
    </Page>
  );

  const chunks: QuestionModel[][] = [];
  for (let index = 0; index < plan.questions.length; index += perPage) {
    chunks.push(plan.questions.slice(index, index + perPage));
  }

  return (
    <div
      class="pq-print-sheet"
      data-pq-variant={variant}
      data-pq-per-page={String(perPage)}
      data-pq-flash={flash ? "true" : "false"}
    >
      {flash ? (
        plan.questions.flatMap((item) => [
          <Page
            className="pq-print-card"
            key={`${item.id}-front`}
            questionId={item.id}
            accent={accentFor(item.round)}
          >
            <p class="pq-card-label">Question</p>
            {question(item, "front")}
          </Page>,
          <Page
            className="pq-print-card"
            key={`${item.id}-back`}
            questionId={item.id}
            accent={accentFor(item.round)}
          >
            <p class="pq-card-label">Answer</p>
            {question(item, "back")}
          </Page>,
        ])
      ) : variant === "form" || variant === "grade" ? (
        <>
          <Cover
            quiz={quiz}
            questions={plan.questions}
            rounds={plan.rounds.length}
          />
          {variant === "form" ? (
            <PrintForm
              questions={plan.questions}
              rounds={rounds}
              compact={options.formStyle === "compact"}
              roundPageBreak={options.roundPageBreak === true}
            />
          ) : (
            <PrintGrade
              questions={plan.questions}
              rounds={rounds}
              compact={options.formStyle === "compact"}
              roundPageBreak={options.roundPageBreak === true}
            />
          )}
        </>
      ) : (
        <>
          <Cover
            quiz={quiz}
            questions={plan.questions}
            rounds={plan.rounds.length}
          />
          {perPage > 1
            ? chunks.map((items, chunkIndex) => (
                <Page className="pq-print-group" key={chunkIndex}>
                  <div class="pq-print-grid" data-pq-per-page={String(perPage)}>
                    {items.map((item) => (
                      <div class="pq-print-tile" key={item.id}>
                        <div
                          style={`--pq-round-accent:${accentFor(item.round)}`}
                        >
                          {question(item, null)}
                        </div>
                      </div>
                    ))}
                  </div>
                </Page>
              ))
            : plan.rounds.map((round) => {
                const items = plan.questions.filter(
                  (item) => item.round === round.id,
                );
                if (items.length === 0) {
                  return null;
                }
                return (
                  <div key={round.id}>
                    <Page
                      className="pq-print-round"
                      accent={accentFor(round.id)}
                      questionId={round.id}
                    >
                      <p class="pq-round-number">Round</p>
                      <h2 class="pq-round-name">{round.name}</h2>
                      <p class="pq-round-stats">
                        {label(items.length, "question")} ·{" "}
                        {label(pointsOf(items), "point")}
                      </p>
                      {round.secret === null ? null : (
                        <p class="pq-round-secret">Theme: {round.secret}</p>
                      )}
                    </Page>
                    {items.map(page)}
                  </div>
                );
              })}
        </>
      )}
    </div>
  );
}
