/** End screen. Breathe, then decide. */

import type { JSX } from "preact";
import type { Quiz } from "../../../core/session/quiz";
import type { EndViewModel } from "../../../core/session/viewModel";
import { Actions } from "../components/Actions";

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
      </header>

      <div class="pq-progress" aria-hidden="true">
        <span style={`width: ${screen.progress.percent}%`} />
      </div>

      <footer class="pq-toolbar">
        <Actions quiz={quiz} />
        <button type="button" onClick={() => quiz.prev()}>
          Back to the last question
        </button>
        <button type="button" class="pq-primary" onClick={() => quiz.restart()}>
          Play again
        </button>
      </footer>
    </main>
  );
}
