/** The phone. One question, big buttons, then the truth. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { Response } from "../../core/session/responses";
import type { PlayerRoom } from "../player";
import { RoomPhase, type LiveQuestion, type RevealPayload } from "../types";
import { Leaderboard } from "./parts";
import { PlayerAnswer } from "./PlayerAnswer";

function usePlayer(player: PlayerRoom): number {
  const [version, setVersion] = useState(0);
  useEffect(
    () => player.subscribe(() => setVersion((value) => value + 1)),
    [player],
  );
  return version;
}

function QuestionBody({
  question,
}: {
  readonly question: LiveQuestion;
}): JSX.Element {
  return (
    <section class="pq-live-question">
      <p class="pq-live-meta">
        Question {question.index + 1} of {question.total}
        {question.roundName === null ? "" : ` · ${question.roundName}`}
        {` · ${question.points} ${question.points === 1 ? "point" : "points"}`}
      </p>
      <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
        {question.title}
      </h1>
      {question.body.map((line, index) => (
        <p key={index} class="pq-body">
          {line}
        </p>
      ))}
      {question.media.map((item) => (
        <figure key={item.path} class="pq-media">
          <img src={item.path} alt={item.alt ?? ""} loading="lazy" />
        </figure>
      ))}
    </section>
  );
}

function Reveal({
  reveal,
  selfId,
}: {
  readonly reveal: RevealPayload;
  readonly selfId: string | null;
}): JSX.Element {
  const mine = selfId === null ? undefined : reveal.results[selfId];
  return (
    <section class="pq-live-reveal" aria-label="Answer">
      <p class="pq-live-kicker">The answer</p>
      <p class="pq-live-answer">{reveal.correct.join(" / ")}</p>
      {reveal.explanation === null ? null : (
        <p class="pq-explanation">{reveal.explanation}</p>
      )}
      {mine === undefined ? (
        <p class="pq-live-hint">You did not answer this one.</p>
      ) : (
        <p class="pq-live-result" data-pq-correct={String(mine.correct)}>
          <span aria-hidden="true">{mine.correct ? "✓" : "✗"}</span>{" "}
          {mine.late ? "Late. No points." : `${mine.points} points`}
          {mine.given.length === 0 ? "" : ` · you said: ${mine.given}`}
        </p>
      )}
      <Leaderboard rows={reveal.leaderboard} selfId={selfId} />
    </section>
  );
}

export function PlayerView({
  player,
}: {
  readonly player: PlayerRoom;
}): JSX.Element {
  usePlayer(player);
  const state = player.state();
  const question = state.question;
  const reveal = state.reveal;

  const submit = (response: Response): void => player.submit(response);

  if (!state.joined) {
    return (
      <main class="pq-screen pq-live-screen">
        <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
          Room {state.code}
        </h1>
        <p class="pq-body">{state.error ?? "Connecting to the host…"}</p>
      </main>
    );
  }

  if (state.phase === RoomPhase.Ended) {
    return (
      <main class="pq-screen pq-live-screen">
        <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
          That is the quiz
        </h1>
        <Leaderboard rows={state.leaderboard} selfId={state.id} />
      </main>
    );
  }

  if (question === null) {
    return (
      <main class="pq-screen pq-live-screen">
        <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
          You are in
        </h1>
        <p class="pq-body">Waiting for the host to show a question.</p>
        <p class="pq-live-meta">Room {state.code}</p>
      </main>
    );
  }

  return (
    <main class="pq-screen pq-live-screen">
      <p class="pq-live-kicker">Room {state.code}</p>
      <QuestionBody question={question} />

      {reveal === null ? (
        <>
          <PlayerAnswer
            question={question}
            disabled={state.submitted || state.closed}
            onSubmit={submit}
          />
          {state.submitted ? (
            <p class="pq-live-hint" role="status">
              Sent. Wait for the reveal.
            </p>
          ) : null}
          {state.closed && !state.submitted ? (
            <p class="pq-live-hint" role="status">
              Answers are closed.
            </p>
          ) : null}
        </>
      ) : (
        <Reveal reveal={reveal} selfId={state.id} />
      )}
    </main>
  );
}
