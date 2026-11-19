/** The host screen. Code, roster, one question, one reveal. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { HostRoom } from "../host";
import { RoomPhase } from "../types";
import { CodeCard, Leaderboard, Roster } from "./parts";

function useHost(host: HostRoom): number {
  const [version, setVersion] = useState(0);
  useEffect(
    () => host.subscribe(() => setVersion((value) => value + 1)),
    [host],
  );
  return version;
}

export function HostView({
  host,
  joinLink,
}: {
  readonly host: HostRoom;
  readonly joinLink: string;
}): JSX.Element {
  useHost(host);
  const state = host.state();
  const question = host.question();
  const answered = state.players.filter((player) => player.answered).length;
  const nextIndex = state.index + 1;
  const hasNext = nextIndex < state.total;
  const lobby = state.phase === RoomPhase.Lobby;
  const reveal = state.phase === RoomPhase.Reveal;

  return (
    <main class="pq-screen pq-live-screen">
      <header class="pq-live-head">
        <p class="pq-live-kicker">Live quiz</p>
        <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
          {lobby ? "Waiting for players" : (question?.title ?? "Live quiz")}
        </h1>
        {lobby ? <CodeCard code={state.code} link={joinLink} /> : null}
        <p class="pq-live-meta">
          {state.index >= 0
            ? `Question ${state.index + 1} of ${state.total}`
            : `${state.total} questions`}
          {question?.roundName === null || question?.roundName === undefined
            ? ""
            : ` · ${question.roundName}`}
        </p>
      </header>

      {lobby ? (
        <Roster players={state.players} />
      ) : (
        <section class="pq-live-progress" aria-label="Answers in">
          <p class="pq-live-count">
            {answered} of {state.players.length} answered
          </p>
          <ul class="pq-live-players">
            {state.players.map((player) => (
              <li
                key={player.id}
                data-pq-ready={player.answered ? "true" : "false"}
              >
                <span>{player.name}</span>
                <span class="pq-live-score">
                  {player.answered ? "in" : "…"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {reveal ? (
        <section class="pq-live-reveal" aria-label="Answer">
          <p class="pq-live-kicker">Answer</p>
          <p class="pq-live-answer">
            {host.lastReveal()?.correct.join(" / ") ?? "—"}
          </p>
          <Leaderboard rows={host.lastReveal()?.leaderboard ?? []} />
        </section>
      ) : null}

      <footer class="pq-toolbar">
        {lobby ? (
          <button
            type="button"
            class="pq-primary"
            disabled={state.players.length === 0}
            onClick={() => host.start()}
          >
            Start the quiz
          </button>
        ) : null}
        {!lobby && !reveal ? (
          <>
            <button type="button" onClick={() => host.close()}>
              Close answers
            </button>
            <button
              type="button"
              class="pq-primary"
              onClick={() => host.reveal()}
            >
              Reveal
            </button>
          </>
        ) : null}
        {!lobby ? (
          <>
            <button
              type="button"
              class={reveal ? "pq-primary" : ""}
              onClick={() => {
                if (hasNext) {
                  host.show(nextIndex);
                } else {
                  host.end();
                }
              }}
            >
              {hasNext ? "Next question" : "Finish"}
            </button>
            <button type="button" onClick={() => host.end()}>
              End quiz
            </button>
          </>
        ) : null}
      </footer>
    </main>
  );
}
