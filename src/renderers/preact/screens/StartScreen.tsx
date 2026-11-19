/** Start screen: the slide you put up while people settle in. */

import type { JSX } from "preact";
import type { Quiz } from "../../../core/session/quiz";
import type { StartViewModel } from "../../../core/session/viewModel";
import { Actions } from "../components/Actions";
import { Inline } from "../components/Inline";
import { Media } from "../components/Media";
import { Problems } from "../components/Problems";
import { SettingsPanel } from "./SettingsPanel";

function allowed(buttons: readonly string[], id: string): boolean {
  return buttons.length === 0 || buttons.includes(id);
}

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

      {screen.resume === null ? null : (
        <section class="pq-resume" aria-label="Unfinished attempt">
          <h2 class="pq-resume-title">You have an unfinished attempt</h2>
          <p class="pq-resume-note">
            {screen.resume.answered} of {screen.resume.total} answered. Your
            answers are still here.
          </p>
          <div class="pq-resume-actions">
            <button
              type="button"
              class="pq-primary"
              onClick={() => quiz.resume()}
            >
              Resume
            </button>
            <button type="button" onClick={() => void quiz.clearAttempt()}>
              Start over
            </button>
          </div>
        </section>
      )}

      <Problems diagnostics={quiz.diagnostics()} />

      {allowed(screen.buttons, "settings") ? (
        <SettingsPanel quiz={quiz} seed={screen.seed} />
      ) : null}

      <p class="pq-keys">
        Keys: <kbd>→</kbd> next, <kbd>←</kbd> back, <kbd>r</kbd> reveal,{" "}
        <kbd>h</kbd> hint.
      </p>

      <footer class="pq-toolbar">
        <Actions quiz={quiz} />
        {allowed(screen.buttons, "play") ? (
          <button type="button" class="pq-primary" onClick={() => quiz.next()}>
            Start
          </button>
        ) : null}
      </footer>
    </main>
  );
}
