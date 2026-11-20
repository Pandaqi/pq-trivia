/** Shared pieces: the room code, the roster, the leaderboard. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import {
  assignTeamColours,
  colourFor,
  teamStyle,
  type TeamColour,
} from "../../shared/teamColours";
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

/**
 * Live, and the room code next to it.
 *
 * A late joiner reads the code off the nearest phone, not off the screen in the
 * corner. One line, no card, nothing to press.
 */
export function LiveBadge({
  code,
  team,
  colours,
}: {
  readonly code: string;
  readonly team?: string | null | undefined;
  /** Every team in the room, so this phone matches the big screen. */
  readonly colours?: ReadonlyMap<string, TeamColour> | undefined;
}): JSX.Element {
  const name = team ?? null;
  return (
    <p class="pq-badge-row" role="status">
      <span class="pq-badge pq-badge-live">Live · {code}</span>
      {name === null ? null : (
        <span
          class="pq-badge pq-badge-group"
          style={teamStyle(colourFor(colours ?? new Map(), name))}
        >
          {name}
        </span>
      )}
    </p>
  );
}

export interface PlayerGroup {
  /** Null is the phones that came alone. */
  readonly name: string | null;
  readonly colour: TeamColour;
  readonly rows: readonly LivePlayer[];
}

const NO_COLOUR: TeamColour = { base: "transparent", ink: "inherit" };

/**
 * The room, by team. A group of five has one phone and one name, so the host
 * sees who is in before anybody answers a question.
 */
export function playerGroups(
  players: readonly LivePlayer[],
): readonly PlayerGroup[] {
  const colours = assignTeamColours(players.map((player) => player.team ?? ""));
  const names = [
    ...new Set(
      players
        .map((player) => player.team)
        .filter(
          (team): team is string => typeof team === "string" && team.length > 0,
        ),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const groups: PlayerGroup[] = names.map((name) => ({
    name,
    colour: colourFor(colours, name),
    rows: players.filter((player) => player.team === name),
  }));
  const alone = players.filter(
    (player) => player.team === undefined || player.team.length === 0,
  );
  if (alone.length > 0) {
    groups.push({ name: null, colour: NO_COLOUR, rows: alone });
  }
  return groups;
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
        <div class="pq-live-groups">
          {playerGroups(players).map((group) => (
            <div class="pq-live-group" key={group.name ?? "solo"}>
              {group.name === null ? null : (
                <p class="pq-live-team-head" style={teamStyle(group.colour)}>
                  {group.name}
                </p>
              )}
              <ul class="pq-live-players">
                {group.rows.map((player) => (
                  <li
                    key={player.id}
                    data-pq-ready={player.ready ? "true" : "false"}
                  >
                    <span>{player.name}</span>
                    <span class="pq-live-score">{player.score}</span>
                    {player.connected ? null : (
                      <span class="pq-live-offline">offline</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
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

/** `+2`, `-2`, `0`. A lost stake has to look lost. */
function signed(points: number): string {
  return points > 0 ? `+${points}` : String(points);
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
                        {result === undefined ? "" : signed(result.points)}
                        {result?.stake == null
                          ? ""
                          : ` · staked ${result.stake}`}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : mine === undefined ? null : (
              <p class="pq-live-result" data-pq-correct={String(mine.correct)}>
                <span aria-hidden="true">{mine.correct ? "✓" : "✗"}</span>{" "}
                {mine.late ? "Late. " : ""}
                {`${signed(mine.points)} points`}
                {mine.stake === null ? "" : ` · staked ${mine.stake}`}
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
