/**
 * Question screen and section screen distinct. A section is its own page at
 * the start of a round, the way V2 did it. A question is the slide after it.
 */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { QuestionType } from "../../../core/model/question";
import type { ResponseIssue } from "../../../core/session/policies";
import type { Quiz } from "../../../core/session/quiz";
import { PlayMode, type SessionState } from "../../../core/session/session";
import type { TimerSound } from "../../../core/session/timers";
import type { QuestionViewModel } from "../../../core/session/viewModel";
import { Actions } from "../components/Actions";
import { Answers } from "../components/Answers";
import { ReadOnlyAnswers } from "./ReadOnlyAnswers";
import { Inline } from "../components/Inline";
import { Media } from "../components/Media";
import { ScriptWidget } from "../components/ScriptWidget";
import { Timer } from "../components/Timer";
import { Toolbar } from "../components/Toolbar";
import { backgroundStyle } from "../components/background";
import { roundColour, type RoundColour } from "../components/roundAccent";
import { useT, type Translate } from "../i18n";

function accentStyle(colour: RoundColour): string {
  return [
    `--pq-accent:${colour.shade}`,
    `--pq-accent-ink:${colour.ink}`,
    `--pq-round-accent:${colour.base}`,
    `--pq-round-shade:${colour.shade}`,
  ].join(";");
}

function roundSizeLabel(
  t: Translate,
  questions: number,
  points: number,
): string {
  const questionWord = t(questions === 1 ? "question_one" : "question_other");
  const pointWord = t(points === 1 ? "point_one" : "point_other");
  return `${questions} ${questionWord} · ${points} ${pointWord}`;
}

function SectionScreen({
  quiz,
  screen,
  timerSound,
}: {
  readonly quiz: Quiz;
  readonly screen: QuestionViewModel;
  readonly timerSound?: TimerSound | undefined;
}): JSX.Element {
  const t = useT();
  const colour = roundColour(
    screen.seed,
    screen.round,
    0,
    Math.max(screen.roundQuestionCount, 1),
  );
  const body =
    screen.body.length === 0 ? null : (
      <div class="pq-body">
        <Inline nodes={screen.body} />
      </div>
    );
  return (
    <main
      class="pq-screen pq-screen-section"
      style={`${accentStyle(colour)};${backgroundStyle(screen.background) ?? ""}`}
    >
      <Timer quiz={quiz} sound={timerSound} />
      <div class="pq-section-body">
        <p class="pq-kicker">
          {screen.roundNumber === null
            ? t("roundWord")
            : t("roundNumber", { number: screen.roundNumber })}
        </p>
        <h1 class="pq-title pq-section-title" data-pq-heading tabIndex={-1}>
          {screen.title.length === 0 ? (
            (screen.roundName ?? t("roundWord"))
          ) : (
            <Inline nodes={screen.title} />
          )}
        </h1>
        <p class="pq-section-stats">
          {roundSizeLabel(t, screen.roundQuestionCount, screen.roundPoints)}
        </p>
        {screen.roundSecret === null ||
        quiz.config.hideSecretThemeMessage === true ? null : (
          <p class="pq-section-secret">
            {t("theme", { theme: screen.roundSecret })}
          </p>
        )}
        {body}
        {screen.comments.length === 0 ? null : (
          <div class="pq-comments">
            <Inline nodes={screen.comments} />
          </div>
        )}
        {screen.media.length === 0 ? null : (
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
        )}
      </div>
      {quiz.config.disableUI === true ? null : (
        <footer class="pq-toolbar">
          <Toolbar quiz={quiz} screen={screen} />
          <Actions quiz={quiz} />
        </footer>
      )}
    </main>
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

  if (screen.type === QuestionType.Section) {
    return (
      <SectionScreen quiz={quiz} screen={screen} timerSound={timerSound} />
    );
  }

  const hintCount = screen.hints.revealed.length;
  const colour = roundColour(
    screen.seed,
    screen.round,
    screen.roundPosition,
    Math.max(screen.roundQuestionCount, 1),
  );
  const icons = quiz.config.metadataIcons !== false;
  const showInputs =
    screen.interactive && state.mode === PlayMode.Questions && !screen.revealed;
  const showAnswers =
    screen.answers.length > 0 &&
    (state.mode === PlayMode.Answers || screen.revealed);
  const answers =
    showInputs && response !== undefined ? (
      <Answers
        quiz={quiz}
        screen={screen}
        response={response}
        issues={issues}
      />
    ) : showAnswers ? (
      <ReadOnlyAnswers quiz={quiz} screen={screen} />
    ) : null;

  const className = [
    "pq-screen",
    "pq-screen-question",
    ...screen.classes.map((name) =>
      name.startsWith("pq-") ? name : `pq-${name}`,
    ),
  ].join(" ");
  const transition = screen.transition ?? "fade";

  const hasMedia = screen.media.length > 0;
  const manyAnswers = screen.answers.length > 1;
  // V2's rule: media goes on the right, answers follow the media, and a single
  // short line stays in the middle of one column.
  const split = hasMedia || (manyAnswers && answers !== null);
  const answersLeft = hasMedia && answers !== null;
  const answersRight = !hasMedia && manyAnswers && answers !== null;

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
      style={`${backgroundStyle(screen.background) ?? ""};${accentStyle(colour)}`}
    >
      <Timer quiz={quiz} sound={timerSound} />

      <p class="pq-meta-strip">
        <span class="pq-meta-round">
          {icons ? (
            <span class="pq-meta-icon" aria-hidden="true">
              📌{" "}
            </span>
          ) : null}
          {screen.roundName ?? t("quizWord")}
        </span>
        <span class="pq-count">
          {icons ? (
            <span class="pq-meta-icon" aria-hidden="true">
              ❔{" "}
            </span>
          ) : null}
          {t("questionOf", { index: screen.number, total: screen.total })}
        </span>
        {quiz.config.hideAuthor === true ||
        (!quiz.config.showPropertiesWithoutDiversity && !screen.authorsDiverse)
          ? null
          : screen.authors.map((author) => (
              <span class="pq-meta-author">
                {icons ? (
                  <span class="pq-meta-icon" aria-hidden="true">
                    🧑{" "}
                  </span>
                ) : null}
                {author}
              </span>
            ))}
        {quiz.config.hideCategory === true ||
        (!quiz.config.showPropertiesWithoutDiversity &&
          !screen.categoriesDiverse)
          ? null
          : screen.categories.map((category) => (
              <span class="pq-meta-category">
                {icons ? (
                  <span class="pq-meta-icon" aria-hidden="true">
                    🏷️{" "}
                  </span>
                ) : null}
                {category}
              </span>
            ))}
        {quiz.config.hideScore === true ||
        (quiz.config.hideScoreOnAnswers === true && screen.revealed) ? null : (
          <span class="pq-points">
            {icons ? (
              <span class="pq-meta-icon" aria-hidden="true">
                ⭐{" "}
              </span>
            ) : null}
            {t("pointsLabel", {
              points: screen.points,
              unit: t(screen.points === 1 ? "point_one" : "point_other"),
            })}
          </span>
        )}
      </p>

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

          {screen.comments.length === 0 ? null : (
            <div class="pq-comments">
              <Inline nodes={screen.comments} />
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
        <p class="pq-explanation">
          <Inline nodes={screen.explanation} />
        </p>
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
          <Toolbar quiz={quiz} screen={screen} onNext={next} />
          <Actions quiz={quiz} />
          {screen.expired ? (
            <p class="pq-timer-note" role="status">
              {t("timeUp")}
            </p>
          ) : null}
        </footer>
      )}
    </main>
  );
}
