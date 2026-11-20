/** The slide at the start of a round: its name, its size, the board so far. */

import type { JSX } from "preact";
import type { Quiz } from "../../../core/session/quiz";
import type { TimerSound } from "../../../core/session/timers";
import type { QuestionViewModel } from "../../../core/session/viewModel";
import { Actions } from "../components/Actions";
import { Inline } from "../components/Inline";
import { Media } from "../components/Media";
import { Scoreboard, TeamsBadge } from "../components/Teams";
import { Timer } from "../components/Timer";
import { Toolbar } from "../components/Toolbar";
import { backgroundStyle } from "../components/background";
import { roundColour, type RoundColour } from "../components/roundAccent";
import { useT, type Translate } from "../i18n";

/** The four variables every round-coloured page sets. */
export function accentStyle(colour: RoundColour): string {
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

export function SectionScreen({
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
          {screen.numberPrefix}
          {screen.title.length === 0 ? (
            (screen.roundName ?? t("roundWord"))
          ) : (
            <Inline nodes={screen.title} />
          )}
        </h1>
        <p class="pq-section-stats">
          {roundSizeLabel(t, screen.roundQuestionCount, screen.roundPoints)}
        </p>
        <TeamsBadge quiz={quiz} />
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
        <Scoreboard quiz={quiz} />
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
