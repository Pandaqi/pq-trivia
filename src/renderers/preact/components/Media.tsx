/** One media item. Lazy, no autoplay with sound, honest fallback. */

import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { MediaKind } from "../../../core/values/media";
import type { MediaViewModel } from "../../../core/session/viewModel";
import { useT } from "../i18n";

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

export function Media({
  item,
  autoplay = false,
  asIframe = false,
  animate,
  onEnded,
}: {
  readonly item: MediaViewModel;
  readonly autoplay?: boolean;
  readonly asIframe?: boolean;
  /** `data-pq-transition` on the figure. Used by staged reveals. */
  readonly animate?: string | undefined;
  /** A finished clip can be the signal for the next step. */
  readonly onEnded?: (() => void) | undefined;
}): JSX.Element {
  // A new attempt remounts the tag, which is the only way to make the browser
  // ask for the file again.
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

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
          onError={() => setFailed(true)}
        >
          {item.captions === null ? null : (
            <track kind="captions" src={item.captions} default />
          )}
        </audio>
        <Credit text={item.credit} />
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
          onError={() => setFailed(true)}
        >
          {item.captions === null ? null : (
            <track kind="captions" src={item.captions} default />
          )}
        </video>
        <Credit text={item.credit} />
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
