/**
 * The manifest. One small JSON file that says what the quiz is made of.
 *
 * With a manifest, loading never guesses file names and never probes with a
 * HEAD request. Without one, the old file-name convention still works.
 */

export interface ManifestFile {
  readonly path: string;
  readonly language: string | null;
}

export interface QuizManifest {
  readonly version: number;
  readonly title: string | null;
  readonly syntax: number | null;
  readonly languages: readonly string[];
  readonly files: readonly ManifestFile[];
  readonly mediaBase: string | null;
  readonly theme: string | null;
  readonly scripts: readonly string[];
  readonly buildHash: string | null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

/** A quick shape check: a manifest is an object with a `files` list. */
export function isManifest(value: unknown): boolean {
  const record = recordOf(value);
  return record !== null && Array.isArray(record["files"]);
}

function readFiles(raw: unknown): ManifestFile[] {
  if (!Array.isArray(raw)) {
    throw new Error("The manifest needs a files list.");
  }
  const files: ManifestFile[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      files.push({ path: item, language: null });
      continue;
    }
    const entry = recordOf(item);
    if (entry === null) {
      continue;
    }
    const path = text(entry["path"]);
    if (path === null) {
      throw new Error("A file in the manifest has no path.");
    }
    files.push({ path, language: text(entry["language"]) });
  }
  if (files.length === 0) {
    throw new Error("The manifest lists no files.");
  }
  return files;
}

export function parseManifest(value: unknown): QuizManifest {
  const record = recordOf(value);
  if (record === null) {
    throw new Error("The manifest is not an object.");
  }
  const media = recordOf(record["media"]);
  const build = recordOf(record["build"]);
  const version = record["version"];
  return {
    version: typeof version === "number" ? version : 3,
    title: text(record["title"]),
    syntax: typeof record["syntax"] === "number" ? record["syntax"] : null,
    languages: textList(record["languages"]),
    files: readFiles(record["files"]),
    mediaBase: media === null ? null : text(media["base"]),
    theme: text(record["theme"]),
    scripts: textList(record["scripts"]),
    buildHash: build === null ? null : text(build["hash"]),
  };
}
