/** One media item. Lazy, no autoplay with sound, honest fallback. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { fetchText } from "../../../platform/browser/fetchText";
import { MediaKind } from "../../../core/values/media";
import type { MediaViewModel } from "../../../core/session/viewModel";
import { useT, type Translate } from "../i18n";

function Missing({
  path,
  onRetry,
}: {
  readonly path: string;
  readonly onRetry: () => void;
}): JSX.Element {
  const t = useT();
  return (
    <figure class="pq-media pq-media-missing" role="status">
      <p class="pq-media-missing-text">{t("mediaMissing", { path })}</p>
      <p class="pq-media-missing-hint">{t("mediaHint")}</p>
      <button type="button" class="pq-link" onClick={onRetry}>
        {t("tryAgain")}
      </button>
    </figure>
  );
}

function Credit({
  text,
}: {
  readonly text: string | null;
}): JSX.Element | null {
  return text === null ? null : (
    <figcaption class="pq-media-credit">{text}</figcaption>
  );
}

/**
 * Plain text under the player. Fetched when someone opens it, never before.
 * A transcript is the cheap version of captions, and better than nothing.
 */
/** One paragraph: the failure, the wait, or the words. Never two at once. */
function transcriptText(
  failed: boolean,
  text: string | null,
  t: Translate,
): JSX.Element {
  if (failed) {
    return <p class="pq-transcript-text">{t("transcriptMissing")}</p>;
  }
  if (text === null) {
    return <p class="pq-transcript-text">{t("loading")}</p>;
  }
  return <p class="pq-transcript-text">{text}</p>;
}

function Transcript({ path }: { readonly path: string }): JSX.Element {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || text !== null || failed) {
      return;
    }
    let cancelled = false;
    void fetchText(path)
      .then((value) => {
        if (!cancelled) {
          setText(value.trim());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, path, text, failed]);

  return (
    <details
      class="pq-transcript"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>{t("transcript")}</summary>
      {transcriptText(failed, text, t)}
    </details>
  );
}

export function Media({
  item,
  autoplay = false,
  asIframe = false,
  animate,
  onEnded,
  onPlay,
}: {
  readonly item: MediaViewModel;
  readonly autoplay?: boolean;
  readonly asIframe?: boolean;
  /** `data-pq-transition` on the figure. Used by staged reveals. */
  readonly animate?: string | undefined;
  /** A finished clip can be the signal for the next step. */
  readonly onEnded?: (() => void) | undefined;
  /** Counted in the attempt, so a `PlayLimit` is honest. */
  readonly onPlay?: (() => void) | undefined;
}): JSX.Element {
  // A new attempt remounts the tag, which is the only way to make the browser
  // ask for the file again.
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [plays, setPlays] = useState(0);
  const t = useT();
  const used = Math.max(item.plays, plays);
  const limitReached = item.playLimit !== null && used >= item.playLimit;

  const countPlay = (): void => {
    if (limitReached) {
      return;
    }
    setPlays(used + 1);
    onPlay?.();
  };

  const retry = (): void => {
    setFailed(false);
    setAttempt((value) => value + 1);
  };

  if (failed) {
    return <Missing path={item.path} onRetry={retry} />;
  }

  if (item.kind === MediaKind.Image) {
    return (
      <figure class="pq-media" data-pq-transition={animate}>
        <img
          key={attempt}
          src={item.path}
          srcset={item.srcset ?? undefined}
          alt={item.alt ?? ""}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
        <Credit text={item.credit} />
      </figure>
    );
  }

  if (limitReached) {
    return (
      <figure class="pq-media pq-media-limited" role="status">
        <p class="pq-media-limit">
          {t("playLimitReached", { limit: item.playLimit ?? 0 })}
        </p>
        <Credit text={item.credit} />
      </figure>
    );
  }

  if (item.kind === MediaKind.Audio) {
    return (
      <figure class="pq-media" data-pq-transition={animate}>
        <audio
          key={attempt}
          src={item.path}
          controls
          autoplay={autoplay}
          preload="metadata"
          onEnded={onEnded}
          onPlay={countPlay}
          onError={() => setFailed(true)}
        >
          {item.captions === null ? null : (
            <track kind="captions" src={item.captions} default />
          )}
        </audio>
        <Credit text={item.credit} />
        {item.transcript === null ? null : (
          <Transcript path={item.transcript} />
        )}
      </figure>
    );
  }

  if (item.kind === MediaKind.Video) {
    return (
      <figure class="pq-media" data-pq-transition={animate}>
        <video
          key={attempt}
          src={item.path}
          poster={item.poster ?? undefined}
          controls
          autoplay={autoplay}
          playsinline
          preload="metadata"
          onEnded={onEnded}
          onPlay={countPlay}
          onError={() => setFailed(true)}
        >
          {item.captions === null ? null : (
            <track kind="captions" src={item.captions} default />
          )}
        </video>
        <Credit text={item.credit} />
        {item.transcript === null ? null : (
          <Transcript path={item.transcript} />
        )}
      </figure>
    );
  }

  if (asIframe) {
    return (
      <figure class="pq-media pq-media-embed" data-pq-transition={animate}>
        <iframe
          src={item.path}
          title={item.alt ?? item.path}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
        <Credit text={item.credit} />
      </figure>
    );
  }

  return (
    <a
      class="pq-media pq-media-link"
      href={item.path}
      rel="noopener noreferrer"
    >
      {item.path}
    </a>
  );
}
