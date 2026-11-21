/**
 * The print sheet: cover, round pages, question pages, flash cards, or a form.
 *
 * Layout follows the old exports: a coloured bar per round, question left,
 * media or answers right, tinted option blocks with letters. Every page fills
 * the printable area, whatever size that is; fit.ts shrinks what is too tall
 * and reports what it cannot.
 */

import { Fragment, type JSX } from "preact";
import type { ComponentChildren } from "preact";
import type { Quiz } from "../../../core/session/quiz";
import { PlayMode } from "../../../core/session/session";
import type { QuestionModel } from "../../../core/model/question";
import { numberPrefix } from "../../../core/format/numbering";
import { roundAccent, roundAccentInk } from "../components/roundAccent";
import { PrintForm, type FormRound } from "./PrintForm";
import { PrintGrade } from "./PrintGrade";
import { PrintMedia } from "./PrintMedia";
import { PrintQuestion } from "./PrintQuestion";
import type { PrintOptions } from "./printTypes";
import { useT } from "../i18n";
import { pluralKey } from "../../../core/values/marks";

export type { PrintOptions, PrintProblem, PrintVariant } from "./printTypes";

function pointsOf(questions: readonly QuestionModel[]): number {
  return questions.reduce((total, question) => total + question.score, 0);
}

function Page({
  className = "",
  accent,
  accentInk,
  questionId,
  children,
}: {
  readonly className?: string;
  readonly accent?: string;
  /** Text colour measured against `accent`, so a pale round stays readable. */
  readonly accentInk?: string;
  readonly questionId?: string;
  readonly children: ComponentChildren;
}): JSX.Element {
  return (
    <section
      class={`pq-print-page ${className}`.trim()}
      data-pq-question={questionId}
      style={
        accent === undefined
          ? undefined
          : `--pq-round-accent:${accent};--pq-accent-ink:${accentInk ?? "#fffdf7"}`
      }
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
  const t = useT();
  const meta = quiz.meta;
  const title =
    meta !== null && meta.title.length > 0 ? meta.title : t("quizWord");
  const authors = meta?.authors ?? [];
  const seed = quiz.config.seed ?? "";
  return (
    <Page className="pq-print-cover">
      <p class="pq-cover-kicker">{t("startKicker")}</p>
      <h1 class="pq-cover-title">{title}</h1>
      {meta?.description === null || meta?.description === undefined ? null : (
        <p class="pq-cover-description">{meta.description}</p>
      )}
      {authors.length === 0 ? null : (
        <p class="pq-cover-byline">{t("by", { author: authors.join(", ") })}</p>
      )}
      <p class="pq-cover-banner">
        {t("printStats", {
          questions: `${questions.length} ${t(
            pluralKey(questions.length, "question"),
          )}`,
          points: `${pointsOf(questions)} ${t(
            pluralKey(pointsOf(questions), "point"),
          )}`,
          rounds: `${rounds} ${t(pluralKey(rounds, "round"))}`,
        })}
      </p>
      {seed.length === 0 ? null : (
        <p class="pq-cover-seed">{t("printSeed", { seed })}</p>
      )}
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
  const t = useT();
  const variant = options.variant ?? "auto";
  const perPage = options.perPage ?? 1;
  const flash = options.flashCards === true;

  if (plan === null) {
    return <div class="pq-print-sheet" />;
  }

  const colourFor = (
    roundId: string | null,
  ): { accent: string; ink: string } => {
    const index = plan.rounds.findIndex((round) => round.id === roundId);
    const number = index < 0 ? null : index + 1;
    return {
      accent: roundAccent(number, plan.seed),
      ink: roundAccentInk(number, plan.seed),
    };
  };
  const roundName = (roundId: string | null): string | null =>
    plan.rounds.find((round) => round.id === roundId)?.name ?? null;
  // `HiddenAtExport` means the paper stays clean too. Section screens are in.
  const questions = plan.questions.filter((item) => !item.hiddenAtExport);
  const rounds: readonly FormRound[] = plan.rounds;
  const showAnswers =
    variant === "answers" ||
    (variant === "auto" && state.mode === PlayMode.Answers);
  const indexOf = (question: QuestionModel): number =>
    questions.indexOf(question);
  const numbers = quiz.config.questionNumbers !== false;

  const question = (
    item: QuestionModel,
    face: "front" | "back" | null,
  ): JSX.Element => (
    <PrintQuestion
      question={item}
      index={indexOf(item)}
      total={questions.length}
      state={state}
      roundName={roundName(item.round)}
      showAnswers={showAnswers || state.revealed.includes(item.id)}
      face={face}
      answerLines={quiz.config.printAnswerLines === true}
      typeHints={
        quiz.config.questionTypeHints !== false &&
        quiz.config.printTypeHints !== false
      }
      media={quiz.config}
      numbers={numbers}
    />
  );

  const page = (item: QuestionModel): JSX.Element => (
    <Page
      className="pq-print-question"
      key={item.id}
      questionId={item.id}
      accent={colourFor(item.round).accent}
      accentInk={colourFor(item.round).ink}
    >
      {question(item, null)}
    </Page>
  );

  const chunks: QuestionModel[][] = [];
  for (let index = 0; index < questions.length; index += perPage) {
    chunks.push(questions.slice(index, index + perPage));
  }

  const frame = (body: JSX.Element): JSX.Element => (
    <div
      class="pq-print-sheet"
      data-pq-variant={variant}
      data-pq-per-page={String(perPage)}
      data-pq-flash={flash ? "true" : "false"}
    >
      {body}
    </div>
  );

  if (variant === "media") {
    return frame(
      <>
        <Cover quiz={quiz} questions={questions} rounds={plan.rounds.length} />
        <PrintMedia
          questions={questions}
          roundName={roundName}
          media={quiz.config}
        />
      </>,
    );
  }

  if (flash) {
    return frame(
      <>
        {questions.flatMap((item) => [
          <Page
            className="pq-print-card"
            key={`${item.id}-front`}
            questionId={item.id}
            accent={colourFor(item.round).accent}
            accentInk={colourFor(item.round).ink}
          >
            <p class="pq-card-label">{t("printQuestion")}</p>
            {question(item, "front")}
          </Page>,
          <Page
            className="pq-print-card"
            key={`${item.id}-back`}
            questionId={item.id}
            accent={colourFor(item.round).accent}
            accentInk={colourFor(item.round).ink}
          >
            <p class="pq-card-label">{t("printAnswer")}</p>
            {question(item, "back")}
          </Page>,
        ])}
      </>,
    );
  }

  if (variant === "form" || variant === "grade") {
    const paper =
      variant === "form" ? (
        <PrintForm
          questions={questions}
          rounds={rounds}
          compact={options.formStyle === "compact"}
          roundPageBreak={options.roundPageBreak === true}
          numbers={numbers}
        />
      ) : (
        <PrintGrade
          questions={questions}
          rounds={rounds}
          compact={options.formStyle === "compact"}
          roundPageBreak={options.roundPageBreak === true}
          numbers={numbers}
        />
      );
    return frame(
      <>
        <Cover quiz={quiz} questions={questions} rounds={plan.rounds.length} />
        {paper}
      </>,
    );
  }

  return frame(
    <>
      <Cover quiz={quiz} questions={questions} rounds={plan.rounds.length} />
      {perPage > 1
        ? chunks.map((items, chunkIndex) => (
            <Page className="pq-print-group" key={chunkIndex}>
              <div class="pq-print-grid" data-pq-per-page={String(perPage)}>
                {items.map((item) => (
                  <div class="pq-print-tile" key={item.id}>
                    <div
                      style={`--pq-round-accent:${
                        colourFor(item.round).accent
                      };--pq-accent-ink:${colourFor(item.round).ink}`}
                    >
                      {question(item, null)}
                    </div>
                  </div>
                ))}
              </div>
            </Page>
          ))
        : plan.rounds.map((round, roundIndex) => {
            const items = questions.filter((item) => item.round === round.id);
            if (items.length === 0) {
              return null;
            }
            const secretNote =
              round.secret === null ? null : (
                <p class="pq-round-secret">
                  {t("theme", { theme: round.secret })}
                </p>
              );
            const points = pointsOf(items);
            return (
              <Fragment key={round.id}>
                <Page
                  className="pq-print-round"
                  accent={colourFor(round.id).accent}
                  accentInk={colourFor(round.id).ink}
                  questionId={round.id}
                >
                  <p class="pq-round-number">{t("printRound")}</p>
                  <h2 class="pq-round-name">
                    {numberPrefix(roundIndex + 1, numbers)}
                    {round.name}
                  </h2>
                  <p class="pq-round-stats">
                    {t("printStats", {
                      questions: `${items.length} ${t(
                        pluralKey(items.length, "question"),
                      )}`,
                      points: `${points} ${t(pluralKey(points, "point"))}`,
                      rounds: "",
                    })}
                  </p>
                  {secretNote}
                </Page>
                {items.map(page)}
              </Fragment>
            );
          })}
    </>,
  );
}
