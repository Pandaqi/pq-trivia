/** Shared pieces: the room code, the roster, the leaderboard. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import type {
  LeaderRow,
  LivePlayer,
  PlayerResult,
  RevealItem,
  RevealPayload,
} from "../types";

type QrMatrix = readonly (readonly boolean[])[];

/**
 * The join link as a QR code: one path, drawn from the module matrix.
 * Generated locally, no network, no image, nothing to load.
 */
function JoinQr({ link }: { readonly link: string }): JSX.Element | null {
  const [matrix, setMatrix] = useState<QrMatrix | null>(null);

  // The encoder is the heaviest thing in this bundle and a lobby on a desk
  // screen is the only place that needs it, so it loads on its own.
  useEffect(() => {
    let live = true;
    void import("./qr")
      .then(({ encode }) => {
        if (live) {
          setMatrix(encode(link, { ecc: "M", border: 3 }).data);
        }
      })
      .catch(() => {
        // No encoder, no QR. The code and the link still do the job.
        if (live) {
          setMatrix(null);
        }
      });
    return () => {
      live = false;
    };
  }, [link]);

  if (matrix === null) {
    return null;
  }

  const size = matrix.length;
  let path = "";
  for (let y = 0; y < size; y += 1) {
    const row = matrix[y] ?? [];
    for (let x = 0; x < size; x += 1) {
      if (row[x] === true) {
        path += `M${x} ${y}h1v1h-1z`;
      }
    }
  }

  return (
    <svg
      class="pq-live-qr"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Scan to join: ${link}`}
      shape-rendering="crispEdges"
    >
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

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
      <JoinQr link={link} />
      <p class="pq-live-hint">
        Scan the code, or type it at the same page. Either way: a phone.
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

/**
 * What the reveal shows. One question or a whole round; a personal verdict or
 * everyone's answers, which is the point of the paper mode.
 */
export function RevealPanel({
  reveal,
  players,
  selfId = null,
  showEveryone = false,
}: {
  readonly reveal: RevealPayload;
  readonly players: readonly LivePlayer[];
  readonly selfId?: string | null | undefined;
  readonly showEveryone?: boolean;
}): JSX.Element {
  const mineOf = (item: RevealItem): PlayerResult | undefined =>
    selfId === null ? undefined : item.results[selfId];
  const single = reveal.items.length === 1;
  return (
    <section class="pq-live-reveal" aria-label="Answers">
      {reveal.items.map((item) => {
        const mine = mineOf(item);
        return (
          <div class="pq-live-reveal-item" key={item.questionId}>
            {single ? null : (
              <p class="pq-live-kicker">Question {item.index + 1}</p>
            )}
            <p class="pq-live-answer">{item.correct.join(" / ") || "—"}</p>
            {item.explanation === null ? null : (
              <p class="pq-explanation">{item.explanation}</p>
            )}
            {showEveryone ? (
              <ol class="pq-live-rows">
                {players.map((player) => {
                  const result = item.results[player.id];
                  return (
                    <li
                      key={player.id}
                      data-pq-self={player.id === selfId ? "true" : undefined}
                      data-pq-correct={String(result?.correct === true)}
                    >
                      <span class="pq-live-name">{player.name}</span>
                      <span class="pq-live-given">
                        {result === undefined || result.given.length === 0
                          ? "—"
                          : result.given}
                      </span>
                      <span class="pq-live-score">
                        {result === undefined
                          ? ""
                          : result.correct
                            ? `+${result.points}`
                            : "0"}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : mine === undefined ? null : (
              <p class="pq-live-result" data-pq-correct={String(mine.correct)}>
                <span aria-hidden="true">{mine.correct ? "✓" : "✗"}</span>{" "}
                {mine.late ? "Late. No points." : `${mine.points} points`}
                {mine.given.length === 0 ? "" : ` · you said: ${mine.given}`}
              </p>
            )}
          </div>
        );
      })}
      <Leaderboard rows={reveal.leaderboard} selfId={selfId} />
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
