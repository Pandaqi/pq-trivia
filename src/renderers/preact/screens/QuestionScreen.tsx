/**
 * Question screen. V2's slide, with its two halves: question on the left,
 * media or answers on the right, balanced so a room can read both.
 */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { ResponseIssue } from "../../../core/session/policies";
import type { Quiz } from "../../../core/session/quiz";
import type { SessionState } from "../../../core/session/session";
import type { TimerSound } from "../../../core/session/timers";
import type { QuestionViewModel } from "../../../core/session/viewModel";
import { Actions } from "../components/Actions";
import { Answers } from "../components/Answers";
import { Inline } from "../components/Inline";
import { Media } from "../components/Media";
import { ScriptWidget } from "../components/ScriptWidget";
import { Timer } from "../components/Timer";
import { backgroundStyle } from "../components/background";
import { roundAccent } from "../components/roundAccent";
import { useT } from "../i18n";
import { showsAction } from "../toolbar";

function RoundBanner({
  screen,
  hideSecret,
}: {
  readonly screen: QuestionViewModel;
  readonly hideSecret: boolean;
}) {
  const t = useT();
  if (!screen.isRoundStart || screen.roundName === null) {
    return null;
  }
  return (
    <section class="pq-round-banner" aria-label={t("roundWord")}>
      {screen.roundNumber === null ? null : (
        <p class="pq-round-number">
          {t("roundNumber", { number: screen.roundNumber })}
        </p>
      )}
      <h2 class="pq-round-name">{screen.roundName}</h2>
      {hideSecret || screen.roundSecret === null ? null : (
        <p class="pq-round-secret">
          {t("theme", { theme: screen.roundSecret })}
        </p>
      )}
    </section>
  );
}

export function QuestionScreen({
  quiz,
  screen,
  state,
  timerSound,
}: {
  readonly quiz: Quiz;
  readonly screen: QuestionViewModel;
  readonly state: SessionState;
  readonly timerSound?: TimerSound | undefined;
}): JSX.Element {
  const t = useT();
  const response = state.responses[screen.id];
  const [issues, setIssues] = useState<readonly ResponseIssue[]>([]);

  // A new response, or a new question, clears the red border. Nobody wants to
  // be told off for a mistake they already fixed.
  useEffect(() => {
    setIssues([]);
  }, [response, screen.id]);

  const next = (): void => {
    const result = quiz.next();
    setIssues(result.ok || result.issues === undefined ? [] : result.issues);
  };

  const hintCount = screen.hints.revealed.length;
  const canHint = hintCount < screen.hints.total;
  const accent = roundAccent(screen.roundNumber);

  const className = [
    "pq-screen",
    "pq-screen-question",
    ...screen.classes.map((name) =>
      name.startsWith("pq-") ? name : `pq-${name}`,
    ),
  ].join(" ");
  const transition = screen.transition ?? "fade";

  const hasMedia = screen.media.length > 0;
  const hasAnswers = screen.answers.length > 0;
  const manyAnswers = screen.answers.length > 1;
  // V2's rule: media goes on the right, answers follow the media, and a single
  // short line stays in the middle of one column.
  const split = hasMedia || manyAnswers;
  const answersLeft = hasMedia && hasAnswers;
  const answersRight = !hasMedia && manyAnswers;

  const answers =
    response === undefined ? null : (
      <Answers
        quiz={quiz}
        screen={screen}
        response={response}
        issues={issues}
      />
    );

  return (
    <main
      class={className}
      data-pq-layout={screen.layout ?? "text-only"}
      data-pq-scheme={screen.colorScheme ?? undefined}
      data-pq-reveal={screen.reveal ?? undefined}
      data-pq-transition={transition === "none" ? undefined : transition}
      data-pq-answered={String(screen.answered)}
      data-pq-variant={screen.variant ?? undefined}
      data-pq-split={split ? "true" : "false"}
      style={`${backgroundStyle(screen.background) ?? ""};--pq-round-accent:${accent}`}
    >
      <Timer quiz={quiz} sound={timerSound} />

      <p class="pq-meta-strip">
        <span class="pq-meta-round">{screen.roundName ?? t("quizWord")}</span>
        <span class="pq-count">
          {t("questionOf", { index: screen.index + 1, total: screen.total })}
        </span>
        {quiz.config.hideAuthor === true ||
        (!quiz.config.showPropertiesWithoutDiversity &&
          !screen.authorsDiverse)
          ? null
          : screen.authors.map((author) => (
              <span class="pq-meta-author">{author}</span>
            ))}
        {quiz.config.hideCategory === true ||
        (!quiz.config.showPropertiesWithoutDiversity &&
          !screen.categoriesDiverse)
          ? null
          : screen.categories.map((category) => (
              <span class="pq-meta-category">{category}</span>
            ))}
        {quiz.config.hideScore === true ||
        (quiz.config.hideScoreOnAnswers === true && screen.revealed) ? null : (
          <span class="pq-points">
            {t("pointsLabel", {
              points: screen.points,
              unit: t(screen.points === 1 ? "point_one" : "point_other"),
            })}
          </span>
        )}
      </p>

      <RoundBanner
        screen={screen}
        hideSecret={quiz.config.hideSecretThemeMessage === true}
      />

      <div class={split ? "pq-split" : "pq-split pq-split-single"}>
        <div class="pq-split-left">
          <header class="pq-header">
            <h1 class="pq-title" data-pq-heading tabIndex={-1}>
              <Inline nodes={screen.title} />
            </h1>
          </header>

          {screen.body.length === 0 ? null : (
            <div class="pq-body">
              <Inline nodes={screen.body} />
            </div>
          )}

          <ScriptWidget
            quiz={quiz}
            screen={screen}
            allowed={quiz.config.allowScripts === true}
          />

          {answersLeft ? answers : null}

          {hintCount === 0 ? null : (
            <aside class="pq-hints" aria-label={t("hints")}>
              <ul>
                {screen.hints.revealed.map((hint, index) => (
                  <li key={index}>
                    <Inline nodes={hint.nodes} />
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>

        {!split ? null : (
          <div class="pq-split-right">
            {hasMedia ? (
              <div class="pq-media-list">
                {screen.media.map((item) => (
                  <Media
                    key={item.path}
                    item={item}
                    autoplay={quiz.config.mediaAutoPlay === true}
                    asIframe={quiz.config.loadExternalMediaAsIframe === true}
                  />
                ))}
              </div>
            ) : null}
            {answersRight ? answers : null}
          </div>
        )}
      </div>

      {screen.explanation === null ? null : (
        <p class="pq-explanation">{screen.explanation}</p>
      )}

      {screen.sources.length === 0 ? null : (
        <p class="pq-sources">
          {screen.sources.map((source, index) => (
            <span key={index}>{source}</span>
          ))}
        </p>
      )}

      {quiz.config.disableUI === true ? null : (
        <footer class="pq-toolbar">
          <Actions quiz={quiz} />
          {showsAction(quiz, "prev") ? (
            <button
              type="button"
              onClick={() => quiz.prev()}
              disabled={screen.index === 0}
            >
              {t("previous")}
            </button>
          ) : null}
          {canHint && showsAction(quiz, "hint") ? (
            <button type="button" onClick={() => quiz.revealHint()}>
              {t("hint")}
            </button>
          ) : null}
          {screen.revealable && showsAction(quiz, "reveal") ? (
            <button type="button" onClick={() => quiz.reveal()}>
              {t("showAnswer")}
            </button>
          ) : null}
          {screen.expired ? (
            <p class="pq-timer-note" role="status">
              {t("timeUp")}
            </p>
          ) : null}
          {showsAction(quiz, "next") ? (
            <button type="button" class="pq-primary" onClick={next}>
              {t("next")}
            </button>
          ) : null}
        </footer>
      )}
    </main>
  );
}
