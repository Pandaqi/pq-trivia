/**
 * Mount a live room. The host needs a loaded quiz; the player needs a name.
 *
 * The same room code, the same components, one bundle.
 */

import { h, render, type JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { resolveLanguage, translator } from "../../i18n/dictionary";
import { LIVE_LOCALES } from "../../i18n/liveLocales";
import { UiContext, useT } from "../../renderers/preact/i18n";
import type { Translate } from "../../i18n/types";
import type { Quiz } from "../../core/session/quiz";
import { codeFromUrl, isRoomCode, joinUrl, normalizeRoomCode } from "../code";
import { createHost, type HostRoom } from "../host";
import { createPlayer, type PlayerRoom } from "../player";
import { createBroadcastTransport } from "../transport/broadcast";
import type { RoomTransport } from "../transport/types";
import { LiveRole, type RevealMode } from "../types";
import { HostView } from "./HostView";
import { NameForm } from "./parts";
import { PlayerView } from "./PlayerView";

export interface MountLiveOptions {
  readonly target: Element;
  readonly role: LiveRole;
  /** Defaults to `?pq-live=CODE` in the URL. */
  readonly code?: string;
  readonly quiz?: Quiz;
  readonly name?: string;
  readonly transport?: RoomTransport;
  readonly joinLink?: string;
  readonly allowChanges?: boolean;
  /** One reveal per question, per round, at the end, or a second pass. */
  readonly revealMode?: RevealMode;
  /** Watch only: the questions, no answer form. `?watch=1` does the same. */
  readonly watching?: boolean;
  /** The group this phone answers for. `?team=Red` does the same. */
  readonly team?: string;
  /** Interface language. Defaults to the page, then the browser. */
  readonly language?: string;
  /** Winner confetti on the room's screens. On unless turned off. */
  readonly celebration?: boolean;
}

export interface MountedLive {
  host: HostRoom | null;
  player: PlayerRoom | null;
  destroy(): void;
}

const LIVE_KEYS: ReadonlySet<string> = new Set(
  Object.values(LIVE_LOCALES).flatMap((table) => Object.keys(table)),
);

const TOKEN_PREFIX = "pq-live-token:";

function readToken(code: string): string | null {
  try {
    return sessionStorage.getItem(TOKEN_PREFIX + code);
  } catch {
    return null;
  }
}

function writeToken(code: string, token: string | null): void {
  try {
    if (token === null) {
      sessionStorage.removeItem(TOKEN_PREFIX + code);
      return;
    }
    sessionStorage.setItem(TOKEN_PREFIX + code, token);
  } catch {
    // No storage. Reconnect still works in this tab, just not across a refresh.
  }
}

const LIVE_ERROR_KEYS: Readonly<Record<string, string>> = {
  "Load a quiz before opening a room.": "liveLoadFirst",
  "No host answered. Check the code.": "liveNoHost",
  liveNoHost: "liveNoHost",
};

/** Known failures get interface copy. The rest stays a diagnostic. */
function describe(reason: unknown, t: Translate): string {
  const message = reason instanceof Error ? reason.message : String(reason);
  const key = LIVE_ERROR_KEYS[message];
  if (key !== undefined) {
    return t(key);
  }
  console.warn("Live room failed:", message);
  return t("liveConnectionFailed");
}

function safeBroadcast(): RoomTransport | null {
  try {
    return createBroadcastTransport();
  } catch {
    return null;
  }
}

/** One phone per group, so the whole group reads the same badge. */
function teamFromUrl(): string | null {
  if (typeof location === "undefined") {
    return null;
  }
  const value = new URLSearchParams(location.search).get("team")?.trim() ?? "";
  return value.length === 0 ? null : value.slice(0, 24);
}

/** A second screen in the room. It shows, it does not answer. */
function watchingFromUrl(): boolean {
  if (typeof location === "undefined") {
    return false;
  }
  const value = new URLSearchParams(location.search).get("watch");
  return value === "1" || value === "true";
}

function currentCode(options: MountLiveOptions): string {
  if (options.code !== undefined) {
    return normalizeRoomCode(options.code);
  }
  if (typeof location === "undefined") {
    return "";
  }
  return codeFromUrl(location.search) ?? "";
}

function LiveShell({
  options,
  handle,
}: {
  readonly options: MountLiveOptions;
  readonly handle: MountedLive;
}): JSX.Element {
  const t = useT();
  const code = currentCode(options);
  const watching = options.watching === true || watchingFromUrl();
  const team = options.team ?? teamFromUrl();
  const celebration =
    options.celebration ?? options.quiz?.config.celebration !== false;
  const [host, setHost] = useState<HostRoom | null>(null);
  const [player, setPlayer] = useState<PlayerRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(options.name ?? "");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (options.role !== LiveRole.Host) {
      return;
    }
    if (options.quiz === undefined) {
      setError(t("liveLoadFirst"));
      return;
    }
    if (!isRoomCode(code)) {
      setError(t("liveRoomCodeRule"));
      return;
    }
    const transport = options.transport ?? safeBroadcast();
    if (transport === null) {
      setError(t("liveNoBroadcast"));
      return;
    }
    let cancelled = false;
    createHost({
      quiz: options.quiz,
      transport,
      code,
      ...(options.allowChanges === true ? { allowChanges: true } : {}),
      ...(options.revealMode === undefined
        ? {}
        : { reveal: options.revealMode }),
    })
      .then((room) => {
        if (cancelled) {
          room.leave();
          return;
        }
        handle.host = room;
        setHost(room);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(describe(reason, t));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (options.role !== LiveRole.Player) {
      return;
    }
    if (name.trim().length === 0) {
      return;
    }
    if (!isRoomCode(code)) {
      setError(t("liveRoomCodeRule"));
      return;
    }
    const transport = options.transport ?? safeBroadcast();
    if (transport === null) {
      setError(t("liveNoBroadcast"));
      return;
    }
    let cancelled = false;
    setError(null);
    createPlayer({
      transport,
      code,
      name: name.trim(),
      token: readToken(code),
      watching,
      ...(team === null ? {} : { team }),
    })
      .then(async (room) => {
        await room.join();
        if (cancelled) {
          room.leave();
          return;
        }
        handle.player = room;
        setPlayer(room);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(describe(reason, t));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, name]);

  useEffect(() => {
    if (player === null) {
      return;
    }
    const save = (): void => writeToken(code, player.token);
    save();
    return player.subscribe(save);
  }, [player, code]);

  if (options.role === LiveRole.Host) {
    if (host !== null) {
      return (
        <HostView
          host={host}
          joinLink={options.joinLink ?? joinUrl(code)}
          celebration={celebration}
        />
      );
    }
    return (
      <main class="pq-screen pq-live-screen">
        <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
          {t("liveOpening")}
        </h1>
        {error === null ? (
          <p class="pq-body">{t("liveWarming")}</p>
        ) : (
          <p class="pq-issue" role="alert">
            {error}
          </p>
        )}
      </main>
    );
  }

  if (player !== null) {
    return <PlayerView player={player} celebration={celebration} />;
  }

  // The join form comes before the player has a screen, so it borrows one.
  // Without it the fields sat against the glass, with no padding at all.
  if (name.trim().length === 0) {
    return (
      <main class="pq-screen pq-live-screen">
        <NameForm
          code={code.length === 0 ? "????" : code}
          error={error}
          onJoin={(value) => {
            setName(value);
            setAttempt((current) => current + 1);
          }}
        />
      </main>
    );
  }

  return (
    <main class="pq-screen pq-live-screen">
      <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
        {t("liveJoining", { code })}
      </h1>
      {error === null ? (
        <p class="pq-body">{t("liveKnocking")}</p>
      ) : (
        <>
          <p class="pq-issue" role="alert">
            {error}
          </p>
          <button
            type="button"
            class="pq-primary"
            onClick={() => setAttempt((current) => current + 1)}
          >
            {t("tryAgain")}
          </button>
        </>
      )}
    </main>
  );
}

export function mountLive(options: MountLiveOptions): MountedLive {
  const handle: MountedLive = {
    host: null,
    player: null,
    destroy() {
      render(null, options.target);
      handle.host?.leave();
      handle.player?.leave();
    },
  };
  const language = resolveLanguage(
    options.language ?? options.quiz?.config.language,
  );
  const liveT = translator(language, LIVE_LOCALES);
  const quizT = options.quiz?.t;
  // Live copy comes from the live table; everything else keeps the quiz's own
  // language and host overrides.
  const t: Translate = (key, params) =>
    quizT === undefined || LIVE_KEYS.has(key)
      ? liveT(key, params)
      : quizT(key, params);
  render(
    h(UiContext.Provider, { value: t }, h(LiveShell, { options, handle })),
    options.target,
  );
  return handle;
}
