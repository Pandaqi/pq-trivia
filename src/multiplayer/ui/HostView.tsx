/** The host screen. Code, roster, one question, then whatever the mode says. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { QuestionType } from "../../core/model/question";
import type { HostRoom } from "../host";
import { RevealMode, RoomPhase } from "../types";
import { CodeCard, Leaderboard, RevealPanel, Roster } from "./parts";

function useHost(host: HostRoom): number {
  const [version, setVersion] = useState(0);
  useEffect(
    () => host.subscribe(() => setVersion((value) => value + 1)),
    [host],
  );
  return version;
}

/** The one loud button says what the next click will do, in every mode. */
function nextLabel(
  mode: RevealMode,
  inAnswers: boolean,
  last: boolean,
): string {
  if (inAnswers) {
    return last ? "Finish" : "Next answer";
  }
  if (last) {
    return mode === RevealMode.Pass ? "Answer pass" : "Finish";
  }
  return "Next question";
}

function revealLabel(mode: RevealMode, inAnswers: boolean): string {
  if (inAnswers) {
    return "Show answers";
  }
  return mode === RevealMode.Round ? "Reveal round" : "Reveal";
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
  const reveal = host.lastReveal();
  const phase = state.phase;
  const mode = state.revealMode;
  const lobby = phase === RoomPhase.Lobby;
  const inAnswers = phase === RoomPhase.Answers;
  const answered = state.players.filter((player) => player.answered).length;
  const last = state.index + 1 >= state.total;
  const section = question?.type === QuestionType.Section;
  const canReveal =
    !section &&
    mode !== RevealMode.End &&
    ((phase === RoomPhase.Question && mode !== RevealMode.Pass) ||
      (inAnswers && mode === RevealMode.Pass));

  return (
    <main class="pq-screen pq-live-screen">
      <header class="pq-live-head">
        <p class="pq-live-kicker">
          {lobby ? "Live quiz" : inAnswers ? "The answers" : "Live question"}
        </p>
        <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
          {lobby ? "Waiting for players" : (question?.title ?? "Live quiz")}
        </h1>
        {lobby ? <CodeCard code={state.code} link={joinLink} /> : null}
        <p class="pq-live-meta">
          {section
            ? (question?.roundName ?? "Round")
            : state.index >= 0
              ? `${inAnswers ? "Answers" : "Question"} ${state.index + 1} of ${
                  state.total
                }`
              : `${state.total} ${
                  state.total === 1 ? "question" : "questions"
                }`}
          {section ||
          question?.roundName === null ||
          question?.roundName === undefined
            ? ""
            : ` · ${question.roundName}`}
        </p>
      </header>

      {lobby ? (
        <>
          <Roster players={state.players} />
          <section class="pq-live-settings" aria-label="Live settings">
            <label class="pq-field">
              <span class="pq-field-label">Reveal</span>
              <select
                class="pq-input"
                value={mode}
                onChange={(event) =>
                  host.setRevealMode(event.currentTarget.value as RevealMode)
                }
              >
                <option value={RevealMode.Question}>
                  After every question
                </option>
                <option value={RevealMode.Round}>After every round</option>
                <option value={RevealMode.End}>At the end</option>
                <option value={RevealMode.Pass}>
                  Second pass, with answers
                </option>
              </select>
            </label>
            <label class="pq-check">
              <input
                type="checkbox"
                checked={state.sections}
                onChange={(event) =>
                  host.setSections(event.currentTarget.checked)
                }
              />
              Round cards on the phones
            </label>
          </section>
        </>
      ) : section ? (
        <p class="pq-live-hint" role="status">
          A round screen. The phones show the same card.
        </p>
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

      {reveal === null ? null : (
        <RevealPanel
          reveal={reveal}
          players={state.players}
          showEveryone={mode === RevealMode.Pass}
        />
      )}

      {phase === RoomPhase.Ended ? (
        <Leaderboard
          rows={[...state.players]
            .sort((a, b) => b.score - a.score)
            .map((player) => ({
              id: player.id,
              name: player.name,
              score: player.score,
            }))}
        />
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
        {lobby || phase === RoomPhase.Ended ? null : (
          <>
            {phase === RoomPhase.Question && !section ? (
              <button type="button" onClick={() => host.close()}>
                Close answers
              </button>
            ) : null}
            {canReveal ? (
              <button
                type="button"
                class="pq-primary"
                onClick={() => host.reveal()}
              >
                {revealLabel(mode, inAnswers)}
              </button>
            ) : null}
            <button
              type="button"
              class={canReveal ? "" : "pq-primary"}
              onClick={() => host.next()}
            >
              {nextLabel(mode, inAnswers, last)}
            </button>
            <button type="button" onClick={() => host.end()}>
              End quiz
            </button>
          </>
        )}
      </footer>
    </main>
  );
}
