/**
 * Question screen. V2's slide, with its two halves: question on the left,
 * media or answers on the right, balanced so a room can read both.
 */

import type { JSX } from "preact";
import { parseInline } from "../../../core/format/inline";
import type { Quiz } from "../../../core/session/quiz";
import type { SessionState } from "../../../core/session/session";
import type { QuestionViewModel } from "../../../core/session/viewModel";
import { Actions } from "../components/Actions";
import { Answers } from "../components/Answers";
import { Inline } from "../components/Inline";
import { Media } from "../components/Media";
import { backgroundStyle } from "../components/background";
import { roundAccent } from "../components/roundAccent";

function RoundBanner({ screen }: { readonly screen: QuestionViewModel }) {
  if (!screen.isRoundStart || screen.roundName === null) {
    return null;
  }
  return (
    <section class="pq-round-banner" aria-label="Round">
      {screen.roundNumber === null ? null : (
        <p class="pq-round-number">Round {screen.roundNumber}</p>
      )}
      <h2 class="pq-round-name">{screen.roundName}</h2>
      {screen.roundSecret === null ? null : (
        <p class="pq-round-secret">Theme: {screen.roundSecret}</p>
      )}
    </section>
  );
}

export function QuestionScreen({
  quiz,
  screen,
  state,
}: {
  readonly quiz: Quiz;
  readonly screen: QuestionViewModel;
  readonly state: SessionState;
}): JSX.Element {
  const response = state.responses[screen.id];
  const hintCount = screen.hints.revealed.length;
  const canHint = hintCount < screen.hints.total;
  const accent = roundAccent(screen.roundNumber);

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
      <Answers quiz={quiz} screen={screen} response={response} />
    );

  return (
    <main
      class="pq-screen pq-screen-question"
      data-pq-layout={screen.layout ?? "text-only"}
      data-pq-answered={String(screen.answered)}
      data-pq-split={split ? "true" : "false"}
      style={`${backgroundStyle(screen.background) ?? ""};--pq-round-accent:${accent}`}
    >
      <p class="pq-meta-strip">
        <span class="pq-meta-round">{screen.roundName ?? "Quiz"}</span>
        <span class="pq-count">{screen.heading}</span>
        {screen.authors.map((author) => (
          <span class="pq-meta-author">{author}</span>
        ))}
        {screen.categories.map((category) => (
          <span class="pq-meta-category">{category}</span>
        ))}
        <span class="pq-points">
          {screen.points} {screen.points === 1 ? "point" : "points"}
        </span>
      </p>

      <RoundBanner screen={screen} />

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

          {answersLeft ? answers : null}

          {hintCount === 0 ? null : (
            <aside class="pq-hints" aria-label="Hints">
              <ul>
                {screen.hints.revealed.map((hint, index) => (
                  <li key={index}>
                    <Inline nodes={parseInline(hint).nodes} />
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
                  <Media key={item.path} item={item} />
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

      <footer class="pq-toolbar">
        <Actions quiz={quiz} />
        <button
          type="button"
          onClick={() => quiz.prev()}
          disabled={screen.index === 0}
        >
          Previous
        </button>
        {canHint ? (
          <button type="button" onClick={() => quiz.revealHint()}>
            Hint
          </button>
        ) : null}
        {screen.revealable ? (
          <button type="button" onClick={() => quiz.reveal()}>
            Show answer
          </button>
        ) : null}
        <button type="button" class="pq-primary" onClick={() => quiz.next()}>
          Next
        </button>
      </footer>
    </main>
  );
}
