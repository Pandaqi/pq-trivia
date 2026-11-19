/**
 * Mount a live room. The host needs a loaded quiz; the player needs a name.
 *
 * The same room code, the same components, one bundle.
 */

import { h, render, type JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { Quiz } from "../../core/session/quiz";
import { codeFromUrl, isRoomCode, joinUrl, normalizeRoomCode } from "../code";
import { createHost, type HostRoom } from "../host";
import { createPlayer, type PlayerRoom } from "../player";
import { createBroadcastTransport } from "../transport/broadcast";
import type { RoomTransport } from "../transport/types";
import { LiveRole } from "../types";
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
}

export interface MountedLive {
  host: HostRoom | null;
  player: PlayerRoom | null;
  destroy(): void;
}

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

function describe(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

function safeBroadcast(): RoomTransport | null {
  try {
    return createBroadcastTransport();
  } catch {
    return null;
  }
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
  const code = currentCode(options);
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
      setError("Load a quiz before going live.");
      return;
    }
    if (!isRoomCode(code)) {
      setError("A room code is four letters or digits. No O, 0, I or 1.");
      return;
    }
    const transport = options.transport ?? safeBroadcast();
    if (transport === null) {
      setError("This browser has no BroadcastChannel. Pass a transport.");
      return;
    }
    let cancelled = false;
    createHost({
      quiz: options.quiz,
      transport,
      code,
      ...(options.allowChanges === true ? { allowChanges: true } : {}),
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
          setError(describe(reason));
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
      setError("A room code is four letters or digits. No O, 0, I or 1.");
      return;
    }
    const transport = options.transport ?? safeBroadcast();
    if (transport === null) {
      setError("This browser has no BroadcastChannel. Pass a transport.");
      return;
    }
    let cancelled = false;
    setError(null);
    createPlayer({
      transport,
      code,
      name: name.trim(),
      token: readToken(code),
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
          setError(describe(reason));
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
        <HostView host={host} joinLink={options.joinLink ?? joinUrl(code)} />
      );
    }
    return (
      <main class="pq-screen pq-live-screen">
        <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
          Opening the room
        </h1>
        {error === null ? (
          <p class="pq-body">Warming up the lobby…</p>
        ) : (
          <p class="pq-issue" role="alert">
            {error}
          </p>
        )}
      </main>
    );
  }

  if (player !== null) {
    return <PlayerView player={player} />;
  }

  if (name.trim().length === 0) {
    return (
      <NameForm
        code={code.length === 0 ? "????" : code}
        error={error}
        onJoin={(value) => {
          setName(value);
          setAttempt((current) => current + 1);
        }}
      />
    );
  }

  return (
    <main class="pq-screen pq-live-screen">
      <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
        Joining {code}
      </h1>
      {error === null ? (
        <p class="pq-body">Knocking on the door…</p>
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
            Try again
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
  render(h(LiveShell, { options, handle }), options.target);
  return handle;
}
