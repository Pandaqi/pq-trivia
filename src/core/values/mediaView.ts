/**
 * Media as a renderer sees it. Paths resolved, options flattened, nothing that
 * needs a model or a DOM.
 */

import {
  mediaForConfig,
  type MediaDescriptor,
  type MediaKind,
  type MediaOptions,
} from "./media";

export interface MediaViewModel {
  readonly path: string;
  readonly kind: MediaKind;
  readonly alt: string | null;
  readonly credit: string | null;
  /** `name-640.jpg 640w, name-1280.jpg 1280w`, straight from the descriptor. */
  readonly srcset: string | null;
  readonly poster: string | null;
  /** A WebVTT file. Audio without captions excludes people. */
  readonly captions: string | null;
  /** `PlayLimit => 2`. Null means play it as often as you like. */
  readonly playLimit: number | null;
  /** Plays counted in this attempt. */
  readonly plays: number;
}

export function toMediaViewModel(
  descriptor: MediaDescriptor,
  fallbackAlt: string | null = null,
  media: MediaOptions = {},
  playLimit: number | null = null,
  plays = 0,
): MediaViewModel {
  const resolved = mediaForConfig(descriptor, media);
  const options = resolved.options;
  return {
    path: resolved.path,
    kind: resolved.kind,
    alt: options["alt"] ?? fallbackAlt,
    credit: options["credit"] ?? null,
    srcset: options["srcset"] ?? null,
    poster: options["poster"] ?? null,
    captions: options["captions"] ?? null,
    playLimit,
    plays,
  };
}
