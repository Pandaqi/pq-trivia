/** One media item. Lazy, no autoplay with sound, honest fallback. */

import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { MediaKind } from "../../../core/values/media";
import type { MediaViewModel } from "../../../core/session/viewModel";

export function Media({
  item,
}: {
  readonly item: MediaViewModel;
}): JSX.Element {
  // A missing file must not print as a broken-image box or push a page over.
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span class="pq-media pq-media-missing" hidden />;
  }

  if (item.kind === MediaKind.Image) {
    return (
      <figure class="pq-media">
        <img
          src={item.path}
          alt={item.alt ?? ""}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </figure>
    );
  }

  if (item.kind === MediaKind.Audio) {
    return (
      <audio class="pq-media" src={item.path} controls preload="metadata" />
    );
  }

  if (item.kind === MediaKind.Video) {
    return (
      <video
        class="pq-media"
        src={item.path}
        controls
        playsinline
        preload="metadata"
        onError={() => setFailed(true)}
      />
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
