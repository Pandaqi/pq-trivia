/**
 * Media descriptors.
 *
 * Old form: `Media => crowd.jpg`.
 * New form: `Media => crowd.jpg { alt="A packed hall", credit="Jane Doe" }`.
 */

export enum MediaKind {
  Image = "image",
  Audio = "audio",
  Video = "video",
  Link = "link",
  File = "file",
}

const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "svg",
  "avif",
  "tiff",
  "bmp",
  "jxl",
]);
const AUDIO_EXTENSIONS: ReadonlySet<string> = new Set([
  "mp3",
  "ogg",
  "wav",
  "m4a",
  "aac",
  "flac",
  "opus",
]);
const VIDEO_EXTENSIONS: ReadonlySet<string> = new Set([
  "mp4",
  "webm",
  "mov",
  "avi",
  "mkv",
]);

export interface MediaDescriptor {
  readonly path: string;
  readonly kind: MediaKind;
  readonly options: Readonly<Record<string, string>>;
}

export function mediaExtension(path: string): string {
  const clean = path.split(/[?#]/)[0] ?? "";
  const dot = clean.lastIndexOf(".");
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : "";
}

export function detectMediaKind(path: string): MediaKind {
  const extension = mediaExtension(path);
  if (IMAGE_EXTENSIONS.has(extension)) {
    return MediaKind.Image;
  }
  if (AUDIO_EXTENSIONS.has(extension)) {
    return MediaKind.Audio;
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return MediaKind.Video;
  }
  if (/^https?:\/\//i.test(path)) {
    return MediaKind.Link;
  }
  return MediaKind.File;
}

export function isMediaPath(path: string): boolean {
  return detectMediaKind(path) !== MediaKind.File;
}

function splitOptions(body: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote = "";
  for (let index = 0; index < body.length; index += 1) {
    const char = body.charAt(index);
    if (quote.length > 0) {
      if (char === "\\" && index + 1 < body.length) {
        current += char + body.charAt(index + 1);
        index += 1;
        continue;
      }
      current += char;
      if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ",") {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

function unquote(value: string): string {
  const trimmed = value.trim();
  const first = trimmed.charAt(0);
  if (
    (first === '"' || first === "'") &&
    trimmed.endsWith(first) &&
    trimmed.length >= 2
  ) {
    const body = trimmed.slice(1, -1);
    return body.replaceAll(`\\${first}`, first).replaceAll("\\\\", "\\");
  }
  return trimmed;
}

/**
 * What an answer points at, for comparison. A media answer is its file, not
 * the alt text beside it, so `Correct => map.png` matches a longer descriptor.
 */
export function answerKeyOf(text: string): string {
  return parseMediaDescriptor(text).path.trim();
}

/** `crowd.jpg { alt="A hall", fit=cover, loop }` */
export function parseMediaDescriptor(raw: string): MediaDescriptor {
  let text = raw.trim();
  let options: Record<string, string> = {};

  const closing = text.endsWith("}") ? text.lastIndexOf("{") : -1;
  if (closing > 0) {
    const body = text.slice(closing + 1, -1);
    text = text.slice(0, closing).trim();
    options = {};
    for (const part of splitOptions(body)) {
      const equals = part.indexOf("=");
      if (equals < 0) {
        options[part.toLowerCase()] = "true";
        continue;
      }
      const key = part.slice(0, equals).trim().toLowerCase();
      const value = unquote(part.slice(equals + 1));
      if (key.length > 0) {
        options[key] = value;
      }
    }
  }

  return { path: text, kind: detectMediaKind(text), options };
}

export interface MediaOptions {
  /** V2's `url`: the root every relative media path starts from. */
  readonly url?: string;
  /** V2's `subFolderMedia`, for example `media/`. */
  readonly subFolderMedia?: string;
  /** Paths that already point somewhere. V2's `linkPrefixes`. */
  readonly linkPrefixes?: readonly string[];
  /** Extensions that count as media. V2's `mediaFormats`. */
  readonly mediaFormats?: readonly string[];
}

/**
 * The media bits of a config object, from a host or from a file header.
 * Extra keys are ignored, so `QuizConfig` and `meta.config` both fit.
 */
export function mediaOptionsFrom(
  source: Readonly<Record<string, unknown>>,
): MediaOptions {
  const text = (key: string): string | undefined => {
    const value = source[key];
    return typeof value === "string" && value.trim().length > 0
      ? value
      : undefined;
  };
  const list = (key: string): readonly string[] | undefined => {
    const value = source[key];
    if (!Array.isArray(value)) {
      return undefined;
    }
    const items = value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return items.length === 0 ? undefined : items;
  };
  const url = text("url");
  const subFolderMedia = text("subFolderMedia");
  const linkPrefixes = list("linkPrefixes");
  const mediaFormats = list("mediaFormats");
  return {
    ...(url === undefined ? {} : { url }),
    ...(subFolderMedia === undefined ? {} : { subFolderMedia }),
    ...(linkPrefixes === undefined ? {} : { linkPrefixes }),
    ...(mediaFormats === undefined ? {} : { mediaFormats }),
  };
}

export const DEFAULT_LINK_PREFIXES = [
  "http://",
  "https://",
  "www.",
  ".com",
] as const;

export function isExternalPath(
  path: string,
  prefixes: readonly string[] = DEFAULT_LINK_PREFIXES,
): boolean {
  return prefixes.some((prefix) => path.includes(prefix));
}

/** Relative files live under `subFolderMedia`; links and absolute paths do not. */
export function resolveMediaPath(
  path: string,
  options: MediaOptions = {},
): string {
  const folder = options.subFolderMedia ?? "";
  if (folder.length === 0 || path.length === 0) {
    return path;
  }
  if (
    isExternalPath(path, options.linkPrefixes) ||
    /^(\/|\.{1,2}\/|[a-z][a-z0-9+.-]*:|#)/i.test(path)
  ) {
    return path;
  }
  return `${options.url ?? ""}${folder}${path}`;
}

function resolveSrcset(value: string, options: MediaOptions): string {
  return value
    .split(",")
    .map((entry) => {
      const [path = "", ...rest] = entry.trim().split(/\s+/);
      return [resolveMediaPath(path, options), ...rest].join(" ").trim();
    })
    .filter((entry) => entry.length > 0)
    .join(", ");
}

/** Applies `mediaFormats` and the media folder to one descriptor. */
export function mediaForConfig(
  descriptor: MediaDescriptor,
  options: MediaOptions = {},
): MediaDescriptor {
  const formats = options.mediaFormats?.map((entry) => entry.toLowerCase());
  const extension = mediaExtension(descriptor.path);
  const kind =
    formats !== undefined &&
    formats.length > 0 &&
    extension.length > 0 &&
    !formats.includes(extension) &&
    descriptor.kind !== MediaKind.Link
      ? MediaKind.File
      : descriptor.kind;
  const extra: Record<string, string> = {};
  const srcset = descriptor.options["srcset"];
  if (srcset !== undefined) {
    extra["srcset"] = resolveSrcset(srcset, options);
  }
  for (const key of ["poster", "captions", "transcript"]) {
    const value = descriptor.options[key];
    if (value !== undefined) {
      extra[key] = resolveMediaPath(value, options);
    }
  }
  return {
    path: resolveMediaPath(descriptor.path, options),
    kind,
    options: { ...descriptor.options, ...extra },
  };
}

export function formatMediaDescriptor(descriptor: MediaDescriptor): string {
  const entries = Object.entries(descriptor.options);
  if (entries.length === 0) {
    return descriptor.path;
  }
  const body = entries
    .map(([key, value]) =>
      value === "true" ? key : `${key}=${quoteOption(value)}`,
    )
    .join(", ");
  return `${descriptor.path} { ${body} }`;
}

function quoteOption(value: string): string {
  if (/^[\w.#%:/?&+-]+$/.test(value)) {
    return value;
  }
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
