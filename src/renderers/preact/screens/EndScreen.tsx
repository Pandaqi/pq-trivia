/** End screen. Breathe, then decide. */

import type { JSX } from "preact";
import type { Quiz } from "../../../core/session/quiz";
import { PlayMode } from "../../../core/session/session";
import type { EndViewModel } from "../../../core/session/viewModel";
import { Actions } from "../components/Actions";
import { Inline } from "../components/Inline";
import { Media } from "../components/Media";
import { useT } from "../i18n";

function allowed(buttons: readonly string[], id: string): boolean {
  return buttons.length === 0 || buttons.includes(id);
}

export function EndScreen({
  quiz,
  screen,
}: {
  readonly quiz: Quiz;
  readonly screen: EndViewModel;
}): JSX.Element {
  const t = useT();
  return (
    <main class="pq-screen pq-screen-end">
      <header class="pq-header">
        <p class="pq-kicker">{t("thatIsAll")}</p>
        <h1 class="pq-title" data-pq-heading tabIndex={-1}>
          {screen.title || t("untitled")}
        </h1>
        <p class="pq-description">
          {t("answeredOf", {
            answered: screen.answered,
            total: screen.questionCount,
          })}
        </p>
        {screen.comments.length === 0 ? null : (
          <div class="pq-intro">
            <Inline nodes={screen.comments} />
          </div>
        )}
      </header>

      {screen.media.length === 0 ? null : (
        <div class="pq-media-list">
          {screen.media.map((item) => (
            <Media key={item.path} item={item} />
          ))}
        </div>
      )}

      {screen.credits.length === 0 ? null : (
        <p class="pq-credits">{screen.credits.join(" · ")}</p>
      )}

      <div class="pq-progress" aria-hidden="true">
        <span style={`width: ${screen.progress.percent}%`} />
      </div>

      {quiz.config.disableUI === true ? null : (
        <footer class="pq-toolbar">
          <Actions quiz={quiz} />
          {allowed(screen.buttons, "start") ? (
            <button type="button" onClick={() => quiz.goToStart()}>
              {t("backToStart")}
            </button>
          ) : null}
          {allowed(screen.buttons, "answers") ? (
            <button
              type="button"
              class="pq-primary"
              onClick={() => {
                quiz.setMode(PlayMode.Answers);
                quiz.restart();
                quiz.next();
              }}
            >
              {t("throughAnswers")}
            </button>
          ) : null}
          {allowed(screen.buttons, "restart") ? (
            <button
              type="button"
              onClick={() => {
                quiz.restart();
                quiz.next();
              }}
            >
              {t("playAgain")}
            </button>
          ) : null}
          {allowed(screen.buttons, "grade") ? (
            <button type="button" onClick={() => quiz.showResults()}>
              {t("seeResults")}
            </button>
          ) : null}
        </footer>
      )}
    </main>
  );
}
