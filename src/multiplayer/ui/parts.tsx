/** Shared pieces: the room code, the roster, the leaderboard. */

import type { JSX } from "preact";
import { useState } from "preact/hooks";
import type { LeaderRow, LivePlayer } from "../types";

export function CodeCard({
  code,
  link,
}: {
  readonly code: string;
  readonly link: string;
}): JSX.Element {
  return (
    <section class="pq-live-code" aria-label="Join this room">
      <p class="pq-live-kicker">Room code</p>
      <p class="pq-live-code-value">{code}</p>
      <p class="pq-live-link">
        <a href={link}>{link}</a>
      </p>
      <p class="pq-live-hint">
        Type the code at the same page, or open the link on a phone.
      </p>
    </section>
  );
}

export function Roster({
  players,
}: {
  readonly players: readonly LivePlayer[];
}): JSX.Element {
  return (
    <section class="pq-live-roster" aria-label="Players">
      <h2 class="pq-live-title">
        Players <span class="pq-live-count">{players.length}</span>
      </h2>
      {players.length === 0 ? (
        <p class="pq-live-hint">Nobody yet. Put the code on the big screen.</p>
      ) : (
        <ul class="pq-live-players">
          {players.map((player) => (
            <li key={player.id} data-pq-ready={player.ready ? "true" : "false"}>
              <span>{player.name}</span>
              <span class="pq-live-score">{player.score}</span>
              {player.connected ? null : (
                <span class="pq-live-offline">offline</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Leaderboard({
  rows,
  selfId,
}: {
  readonly rows: readonly LeaderRow[];
  readonly selfId?: string | null | undefined;
}): JSX.Element | null {
  if (rows.length === 0) {
    return null;
  }
  return (
    <section class="pq-live-board" aria-label="Leaderboard">
      <h2 class="pq-live-title">Leaderboard</h2>
      <ol>
        {rows.map((row, index) => (
          <li
            key={row.id}
            data-pq-self={row.id === selfId ? "true" : undefined}
          >
            <span class="pq-live-rank">{index + 1}</span>
            <span class="pq-live-name">{row.name}</span>
            <span class="pq-live-score">{row.score}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function NameForm({
  code,
  error,
  onJoin,
}: {
  readonly code: string;
  readonly error: string | null;
  readonly onJoin: (name: string) => void;
}): JSX.Element {
  const [name, setName] = useState("");
  return (
    <section class="pq-live-join" aria-label="Join the room">
      <p class="pq-live-kicker">Room {code}</p>
      <h1 class="pq-live-heading" tabIndex={-1}>
        Pick a name
      </h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim().length > 0) {
            onJoin(name.trim());
          }
        }}
      >
        <label class="pq-field">
          <span class="pq-field-label">Your name</span>
          <input
            class="pq-input"
            type="text"
            maxLength={24}
            autocomplete="nickname"
            value={name}
            onInput={(event) => setName(event.currentTarget.value)}
          />
        </label>
        {error === null ? null : (
          <p class="pq-issue" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          class="pq-primary"
          disabled={name.trim().length === 0}
        >
          Join
        </button>
      </form>
    </section>
  );
}
