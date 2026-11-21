/** Shared pieces: the room code, the roster, the leaderboard. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { pluralKey } from "../../core/values/marks";
import { useT } from "../../renderers/preact/i18n";
import {
  assignTeamColours,
  colourFor,
  teamStyle,
  type TeamColour,
} from "../../shared/teamColours";
import { ranksOf, winnersOf } from "../board";
import type {
  LeaderRow,
  LivePlayer,
  PlayerResult,
  RevealItem,
  RevealPayload,
} from "../types";

type QrMatrix = readonly (readonly boolean[])[];
type QrModule = { readonly encode: QrEncoder };
type QrEncoder = (
  text: string,
  options: { readonly ecc: "M"; readonly border: number },
) => { readonly data: QrMatrix };

/** The one-file bundle's own URL, while it is still the script being run. */
const SCRIPT_URL =
  typeof document === "undefined"
    ? ""
    : ((document.currentScript as HTMLScriptElement | null)?.src ?? "");

let encoderScript: Promise<QrModule> | null = null;

/** `pq-qr.min.js` beside the one-file bundle. The ES modules use their chunk. */
function encoderFromScript(): Promise<QrModule> {
  if (typeof document === "undefined" || SCRIPT_URL === "") {
    return Promise.reject(new Error("No QR script."));
  }
  encoderScript ??= new Promise<QrModule>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL("pq-qr.min.js", SCRIPT_URL).href;
    script.async = true;
    script.onload = () => {
      const api = (globalThis as { PQTriviaQR?: QrModule }).PQTriviaQR;
      if (api === undefined) {
        reject(new Error("No QR encoder."));
      } else {
        resolve(api);
      }
    };
    script.onerror = () => reject(new Error("No QR script."));
    document.head.append(script);
  });
  return encoderScript;
}

/** The chunk in the ES modules, the sibling script in the one-file bundle. */
function loadEncoder(): Promise<QrModule> {
  const ready = (globalThis as { PQTriviaQR?: QrModule }).PQTriviaQR;
  if (ready !== undefined) {
    return Promise.resolve(ready);
  }
  return import("./qr").catch(encoderFromScript);
}

/**
 * The join link as a QR code: one path, drawn from the module matrix.
 * Generated locally, no network, no image, nothing to load.
 */
function JoinQr({ link }: { readonly link: string }): JSX.Element | null {
  const t = useT();
  const [matrix, setMatrix] = useState<QrMatrix | null>(null);

  // The encoder is the heaviest thing in this bundle and a lobby on a desk
  // screen is the only place that needs it, so it loads on its own.
  useEffect(() => {
    let live = true;
    void loadEncoder()
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
      aria-label={t("liveScanToJoin", { link })}
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
  const t = useT();
  return (
    <section class="pq-live-code" aria-label={t("liveRoomAria")}>
      <p class="pq-live-kicker">{t("liveRoomCode")}</p>
      <p class="pq-live-code-value">{code}</p>
      <p class="pq-live-link">
        <a href={link}>{link}</a>
      </p>
      <JoinQr link={link} />
      <p class="pq-live-hint">{t("liveScanHint")}</p>
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
  const t = useT();
  const name = team ?? null;
  return (
    <p class="pq-badge-row" role="status">
      <span class="pq-badge pq-badge-live">{t("liveBadge", { code })}</span>
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
  const t = useT();
  return (
    <section class="pq-live-roster" aria-label={t("livePlayersAria")}>
      <h2 class="pq-live-title">
        {t("livePlayers")} <span class="pq-live-count">{players.length}</span>
      </h2>
      {players.length === 0 ? (
        <p class="pq-live-hint">{t("liveNobody")}</p>
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
                      <span class="pq-live-offline">{t("liveOffline")}</span>
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
  const t = useT();
  if (rows.length === 0) {
    return null;
  }
  const winners = winnersOf(rows);
  const ranks = ranksOf(rows);
  return (
    <section class="pq-live-board" aria-label={t("liveLeaderboardAria")}>
      <h2 class="pq-live-title">{t("liveLeaderboard")}</h2>
      <ol>
        {rows.map((row, index) => {
          const won = winners.has(row.id);
          return (
            <li
              key={row.id}
              data-pq-self={row.id === selfId ? "true" : undefined}
              data-pq-winner={won ? "true" : undefined}
            >
              <span class="pq-live-rank">{ranks.get(row.id) ?? index + 1}</span>
              <span class="pq-live-name">
                {row.name}
                {won ? (
                  <span class="pq-live-winner">{t("liveWinner")}</span>
                ) : null}
              </span>
              <span class="pq-live-score">{row.score}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** `+2`, `-2`, `0`. A lost stake has to look lost. */
export function signed(points: number): string {
  return points > 0 ? `+${points}` : String(points);
}

/** What a player typed, or a dash when they typed nothing. */
function givenText(result: PlayerResult | undefined): string {
  if (result === undefined || result.given.length === 0) {
    return "—";
  }
  return result.given;
}

/** Every answer in the room, for the paper pass. */
function EveryoneRows({
  item,
  players,
  selfId,
}: {
  readonly item: RevealItem;
  readonly players: readonly LivePlayer[];
  readonly selfId: string | null;
}): JSX.Element {
  const t = useT();
  return (
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
            <span class="pq-live-given">{givenText(result)}</span>
            <span class="pq-live-score">
              {result === undefined ? "" : signed(result.points)}
              {result?.stake == null
                ? ""
                : ` · ${t("liveStaked", { points: result.stake })}`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** One player's verdict. Nothing to say when the host hid the result. */
function MyResult({
  mine,
}: {
  readonly mine: PlayerResult | undefined;
}): JSX.Element | null {
  const t = useT();
  if (mine === undefined) {
    return null;
  }
  const unit = t(pluralKey(Math.abs(mine.points), "point_one", "point_other"));
  return (
    <p class="pq-live-result" data-pq-correct={String(mine.correct)}>
      <span aria-hidden="true">{mine.correct ? "✓" : "✗"}</span>{" "}
      {mine.late ? `${t("liveLate")} ` : ""}
      {`${signed(mine.points)} ${unit}`}
      {mine.stake === null
        ? ""
        : ` · ${t("liveStaked", { points: mine.stake })}`}
      {mine.given.length === 0
        ? ""
        : ` · ${t("liveYouSaid", { text: mine.given })}`}
    </p>
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
  const t = useT();
  const mineOf = (item: RevealItem): PlayerResult | undefined =>
    selfId === null ? undefined : item.results[selfId];
  const single = reveal.items.length === 1;
  return (
    <section class="pq-live-reveal" aria-label={t("liveAnswersAria")}>
      {reveal.items.map((item) => {
        const mine = mineOf(item);
        return (
          <div class="pq-live-reveal-item" key={item.questionId}>
            {single ? null : (
              <p class="pq-live-kicker">
                {t("liveQuestionNumber", { number: item.index + 1 })}
              </p>
            )}
            <p class="pq-live-answer">{item.correct.join(" / ") || "—"}</p>
            {item.explanation === null ? null : (
              <p class="pq-explanation">{item.explanation}</p>
            )}
            {showEveryone ? (
              <EveryoneRows item={item} players={players} selfId={selfId} />
            ) : (
              <MyResult mine={mine} />
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
  const t = useT();
  const [name, setName] = useState("");
  return (
    <section class="pq-live-join" aria-label={t("liveJoinAria")}>
      <p class="pq-live-kicker">{t("liveRoom", { code })}</p>
      <h1 class="pq-live-heading" tabIndex={-1}>
        {t("livePickName")}
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
          <span class="pq-field-label">{t("liveYourName")}</span>
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
          {t("liveJoin")}
        </button>
      </form>
    </section>
  );
}
