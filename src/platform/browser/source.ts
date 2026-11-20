/**
 * Where a quiz comes from. One URL, an optional manifest, no guessing.
 *
 * The old loader asked the server about every possible file name. This one
 * fetches exactly what it was told to fetch, once.
 */

import { isEncryptedQuiz } from "../../core/export/embedded";
import {
  isManifest,
  parseManifest,
  type QuizManifest,
} from "../../core/quiz/manifest";
import type { Quiz } from "../../core/session/quiz";
import { loaderT } from "../../i18n/loader";
import type { Translate } from "../../i18n/types";
import { fetchTextCached } from "./cache/fetchCached";
import type { TextCache } from "./cache/textCache";
import { fetchText } from "./fetchText";

export const FILE_PROTOCOL_HINT =
  "Browsers block reading quiz files from file://. Inline the quiz text in the page, or serve the folder over http (bun run preview).";

export interface LoadSourceOptions {
  readonly cache?: TextCache;
}

function quizLoaderT(quiz: Quiz): Translate {
  return loaderT(quiz.state.language ?? quiz.config.language);
}

export function isFileProtocol(url?: string): boolean {
  if (url !== undefined) {
    return url.startsWith("file:");
  }
  return typeof location !== "undefined" && location.protocol === "file:";
}

function isAbsolute(path: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("/");
}

function absolute(url: string): string {
  if (typeof location === "undefined" || isAbsolute(url)) {
    return url;
  }
  try {
    return new URL(url, location.href).href;
  } catch {
    return url;
  }
}

function baseOf(url: string): string {
  const full = absolute(url);
  const cut = full.lastIndexOf("/");
  return cut < 0 ? "" : full.slice(0, cut + 1);
}

export function resolvePath(base: string, path: string): string {
  if (isAbsolute(path)) {
    return path;
  }
  return `${base}${path.replace(/^\.\//, "")}`;
}

export interface QuizSourceFile {
  readonly name: string;
  readonly text: string;
}

export interface QuizFileSearch {
  /** Base URL. Relative paths get joined to it. */
  readonly base?: string;
  /** Folder inside the base, for example `questions/`. */
  readonly folder?: string;
  /** Exact file names. The search stops at the first missing one. */
  readonly filenames?: readonly string[];
  /** Extensions to try, without the dot. */
  readonly extensions?: readonly string[];
  /** Prefix for the numbered probe: `questions-0.trivia`. */
  readonly pattern?: string;
  /** Stop probing after this many files. */
  readonly limit?: number;
}

/** Every listed name, up to the first one that does not answer. */
async function readNamedFiles(
  names: readonly string[],
  load: (url: string) => Promise<string>,
  resolve: (name: string) => string,
): Promise<QuizSourceFile[]> {
  const files: QuizSourceFile[] = [];
  for (const name of names) {
    try {
      files.push({ name, text: await load(resolve(name)) });
    } catch {
      break;
    }
  }
  return files;
}

/** The first extension that answers for this number, or null. */
async function readNumberedFile(
  pattern: string,
  index: number,
  extensions: readonly string[],
  load: (url: string) => Promise<string>,
  resolve: (name: string) => string,
): Promise<QuizSourceFile | null> {
  for (const extension of extensions) {
    const name = `${pattern}-${index}.${extension}`;
    try {
      return { name, text: await load(resolve(name)) };
    } catch {
      // Try the next extension.
    }
  }
  return null;
}

/**
 * V2's auto-search: exact names, or `questions-0.trivia`, `questions-1` …
 * until a number is missing. Nothing is parsed here; a miss is just a miss.
 */
export async function findQuizFiles(
  search: QuizFileSearch,
  read: (url: string) => Promise<string> = fetchText,
): Promise<QuizSourceFile[]> {
  const base = search.base ?? "";
  const folder = search.folder ?? "";
  const resolve = (name: string): string => {
    const path = `${folder}${name}`;
    return base.length === 0 ? path : new URL(path, base).href;
  };
  const files: QuizSourceFile[] = [];
  const names = (search.filenames ?? [])
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  if (names.length > 0) {
    return readNamedFiles(names, read, resolve);
  }

  const extensions = (search.extensions ?? ["trivia", "txt", "md"])
    .map((extension) => extension.trim().replace(/^\./, ""))
    .filter((extension) => extension.length > 0);
  const pattern = search.pattern ?? "questions";
  const limit = search.limit ?? 50;
  for (let index = 0; index < limit; index += 1) {
    const found = await readNumberedFile(
      pattern,
      index,
      extensions,
      read,
      resolve,
    );
    if (found === null) {
      break;
    }
    files.push(found);
  }
  return files;
}

async function read(
  url: string,
  cache: TextCache | undefined,
  t?: Translate,
): Promise<string> {
  return cache === undefined
    ? fetchText(url, t)
    : fetchTextCached(url, cache, t);
}

async function loadManifest(
  quiz: Quiz,
  text: string,
  source: string,
  options: LoadSourceOptions,
): Promise<QuizManifest> {
  const t = quizLoaderT(quiz);
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    throw new Error(t("loaderJson", { source }));
  }
  const manifest = parseManifest(data);
  const base = baseOf(source);
  const files = await Promise.all(
    manifest.files.map(async (file) => ({
      name: file.path,
      text: await read(resolvePath(base, file.path), options.cache, t),
    })),
  );
  await quiz.load({ type: "files", files });
  return manifest;
}

/** Text already in hand: a file, an editor pane, a paste. */
export async function loadQuizText(
  quiz: Quiz,
  raw: string,
  source: string,
  options: LoadSourceOptions = {},
): Promise<QuizManifest | null> {
  const text = raw.replace(/^\uFEFF/, "");
  if (!text.trimStart().startsWith("{")) {
    await quiz.load({ type: "text", text, file: source });
    return null;
  }
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    throw new Error(quizLoaderT(quiz)("loaderJson", { source }));
  }
  if (isManifest(data)) {
    return await loadManifest(quiz, text, source, options);
  }
  await quiz.load(
    isEncryptedQuiz(data)
      ? { type: "encrypted", data }
      : { type: "inline", data },
  );
  return null;
}

/** The one door for `<pq-quiz src>` and every host that loads from a URL. */
export async function loadQuizSource(
  quiz: Quiz,
  source: string,
  options: LoadSourceOptions = {},
): Promise<QuizManifest | null> {
  const t = quizLoaderT(quiz);
  if (isFileProtocol(source) || (isFileProtocol() && !isAbsolute(source))) {
    throw new Error(t("loaderFileProtocol"));
  }
  let text: string;
  try {
    text = await read(absolute(source), options.cache, t);
  } catch (error) {
    if (isFileProtocol()) {
      throw new Error(t("loaderFileProtocol"));
    }
    throw error;
  }
  return loadQuizText(quiz, text, source, options);
}
