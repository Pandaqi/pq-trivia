/** Start screen: the slide you put up while people settle in. */

import type { JSX } from "preact";
import type { Quiz } from "../../../core/session/quiz";
import type { StartViewModel } from "../../../core/session/viewModel";
import { Actions } from "../components/Actions";
import { Problems } from "../components/Problems";
import { SettingsPanel } from "./SettingsPanel";

export function StartScreen({
  quiz,
  screen,
}: {
  readonly quiz: Quiz;
  readonly screen: StartViewModel;
}): JSX.Element {
  return (
    <main class="pq-screen pq-screen-start">
      <header class="pq-header">
        <p class="pq-kicker">PQ-Trivia</p>
        <h1 class="pq-title" data-pq-heading tabIndex={-1}>
          {screen.title}
        </h1>
        {screen.description === null ? null : (
          <p class="pq-description">{screen.description}</p>
        )}
        {screen.author.length === 0 ? null : (
          <p class="pq-byline">by {screen.author}</p>
        )}
      </header>

      <dl class="pq-stats">
        <div>
          <dt>Questions</dt>
          <dd>{screen.questionCount}</dd>
        </div>
        <div>
          <dt>Rounds</dt>
          <dd>{screen.roundCount}</dd>
        </div>
        <div>
          <dt>Seed</dt>
          <dd>{screen.seed.length === 0 ? "none" : screen.seed}</dd>
        </div>
      </dl>

      <Problems diagnostics={quiz.diagnostics()} />

      <SettingsPanel quiz={quiz} seed={screen.seed} />

      <p class="pq-keys">
        Keys: <kbd>→</kbd> next, <kbd>←</kbd> back, <kbd>r</kbd> reveal,{" "}
        <kbd>h</kbd> hint.
      </p>

      <footer class="pq-toolbar">
        <Actions quiz={quiz} />
        <button type="button" class="pq-primary" onClick={() => quiz.next()}>
          Start
        </button>
      </footer>
    </main>
  );
}
