/** End screen. Breathe, then decide. */

import type { JSX } from "preact";
import type { Quiz } from "../../../core/session/quiz";
import type { EndViewModel } from "../../../core/session/viewModel";
import { Actions } from "../components/Actions";
import { Inline } from "../components/Inline";
import { Media } from "../components/Media";

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
  return (
    <main class="pq-screen pq-screen-end">
      <header class="pq-header">
        <p class="pq-kicker">That's all</p>
        <h1 class="pq-title" data-pq-heading tabIndex={-1}>
          {screen.title}
        </h1>
        <p class="pq-description">
          You answered {screen.answered} of {screen.questionCount} questions.
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

      <footer class="pq-toolbar">
        <Actions quiz={quiz} />
        <button type="button" onClick={() => quiz.prev()}>
          Back to the last question
        </button>
        {allowed(screen.buttons, "restart") ? (
          <button type="button" onClick={() => quiz.restart()}>
            Play again
          </button>
        ) : null}
        {allowed(screen.buttons, "grade") ? (
          <button
            type="button"
            class="pq-primary"
            onClick={() => quiz.showResults()}
          >
            See results
          </button>
        ) : null}
      </footer>
    </main>
  );
}
