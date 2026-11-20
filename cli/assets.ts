/**
 * Do the files a quiz points at exist?
 *
 * Parsing cannot see the disk. A typo in `media/starry-night.jpg` passes every
 * syntax check and then shows a broken image at the quiz night. This walks the
 * model, finds every local media path and theme file, and says what is missing.
 *
 * Paths are read the way the player reads them: relative to the page that
 * carries the quiz, which is the quiz file's own folder in every example.
 */

import { readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { QuestionType, type QuestionModel } from "../src/core/model/question";
import type { QuizModel } from "../src/core/model/quiz";
import { parseThemeSettings } from "../src/core/quiz/theme";
import {
  MediaKind,
  mediaForConfig,
  mediaOptionsFrom,
  parseMediaDescriptor,
  type MediaDescriptor,
  type MediaOptions,
} from "../src/core/values/media";

export interface AssetProblem {
  /** Which question or part asked for the file. */
  readonly where: string;
  /** What is wrong, with the path as written. */
  readonly message: string;
}

export interface AssetReport {
  /** Unique local files looked for. */
  readonly checked: number;
  readonly problems: readonly AssetProblem[];
  /** The theme label, when the quiz names a theme. */
  readonly theme: string | null;
}

/** A URL, a site-root path or a fragment is not ours to check. */
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i;
const INLINE_IMAGE = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function withoutQuery(path: string): string {
  return path.replace(/[?#].*$/, "");
}

async function isFile(path: string): Promise<boolean> {
  return stat(path).then(
    (info) => info.isFile(),
    () => false,
  );
}

function textOf(question: QuestionModel): string {
  return question.text
    .map((value) => value.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function whereOf(question: QuestionModel, index: number): string {
  if (
    question.type === QuestionType.Start ||
    question.type === QuestionType.End
  ) {
    return question.type;
  }
  const text = textOf(question);
  const tail =
    text.length === 0
      ? ""
      : ` (${text.slice(0, 54)}${text.length > 54 ? "…" : ""})`;
  return `question ${index + 1}${tail}`;
}

/** Every file one media descriptor needs: the file itself, its extras, srcset. */
function descriptorPaths(
  descriptor: MediaDescriptor,
  options: MediaOptions,
): readonly string[] {
  const resolved = mediaForConfig(descriptor, options);
  const found = [resolved.path];
  for (const key of ["poster", "captions", "transcript"] as const) {
    const value = resolved.options[key];
    if (value !== undefined && value.trim().length > 0) {
      found.push(value);
    }
  }
  const srcset = resolved.options["srcset"];
  if (srcset !== undefined) {
    for (const entry of srcset.split(",")) {
      const path = entry.trim().split(/\s+/)[0];
      if (path !== undefined && path.length > 0) {
        found.push(path);
      }
    }
  }
  return found;
}

/** Markdown images inside wording, which have no `Media` line of their own. */
function inlinePaths(question: QuestionModel): readonly string[] {
  const blobs = [
    ...question.text.map((value) => value.text),
    ...question.answers.map((value) => value.text),
    ...question.comments.map((value) => value.text),
    ...question.hints.map((value) => value.text),
    question.explanation ?? "",
    question.description ?? "",
  ];
  const paths: string[] = [];
  for (const blob of blobs) {
    for (const match of blob.matchAll(INLINE_IMAGE)) {
      const path = match[1];
      if (path !== undefined) {
        paths.push(path);
      }
    }
  }
  return paths;
}

function themeRoot(quiz: QuizModel): string {
  const configured = quiz.meta.config["subFolderTheme"];
  const root =
    typeof configured === "string" && configured.trim().length > 0
      ? configured.trim()
      : "themes/";
  return root.endsWith("/") ? root : `${root}/`;
}

export async function checkAssets(
  quiz: QuizModel,
  quizFile: string,
): Promise<AssetReport> {
  const base = dirname(quizFile);
  const media = mediaOptionsFrom(quiz.meta.config);
  const problems: AssetProblem[] = [];
  const seen = new Set<string>();
  let checked = 0;

  const check = async (raw: string, where: string): Promise<void> => {
    const path = withoutQuery(raw).trim();
    if (path.length === 0 || EXTERNAL.test(path)) {
      return;
    }
    const disk = isAbsolute(path) ? path : join(base, path);
    if (seen.has(disk)) {
      return;
    }
    seen.add(disk);
    checked += 1;
    if (!(await isFile(disk))) {
      problems.push({ where, message: `missing file: ${raw}` });
    }
  };

  const checkAlt = (
    descriptor: MediaDescriptor,
    where: string,
    fallback: string | null,
  ): void => {
    if (descriptor.kind !== MediaKind.Image) {
      return;
    }
    const alt = descriptor.options["alt"] ?? fallback ?? "";
    if (alt.trim().length === 0) {
      problems.push({
        where,
        message: `image without alt text: ${descriptor.path}`,
      });
    }
  };

  const checkQuestion = async (
    question: QuestionModel,
    index: number,
  ): Promise<void> => {
    const where = whereOf(question, index);
    for (const descriptor of question.media) {
      checkAlt(descriptor, where, question.alt);
      for (const path of descriptorPaths(descriptor, media)) {
        await check(path, where);
      }
    }
    for (const answer of question.answers) {
      if (answer.keepAsIs) {
        continue;
      }
      const descriptor = parseMediaDescriptor(answer.text);
      if (
        descriptor.kind === MediaKind.File ||
        descriptor.kind === MediaKind.Link
      ) {
        continue;
      }
      checkAlt(descriptor, where, question.alt);
      for (const path of descriptorPaths(descriptor, media)) {
        await check(path, where);
      }
    }
    for (const path of inlinePaths(question)) {
      await check(path, where);
    }
  };

  for (const [index, question] of quiz.questions.entries()) {
    await checkQuestion(question, index);
  }
  if (quiz.start !== null) {
    await checkQuestion(quiz.start, -1);
  }
  if (quiz.end !== null) {
    await checkQuestion(quiz.end, -1);
  }

  // The start screen hero is a config value, not a question.
  const banner = quiz.meta.config["bannerImage"];
  if (typeof banner === "string" && banner.trim().length > 0) {
    await check(banner, "start screen");
  }
  if (quiz.meta.image !== null && quiz.meta.image.trim().length > 0) {
    await check(quiz.meta.image, "quiz header");
  }

  const theme = quiz.meta.theme?.trim() ?? "";
  let themeLabel: string | null = null;
  if (theme.length > 0 && /\.css(?:[?#].*)?$/i.test(theme)) {
    await check(theme, "theme");
  } else if (theme.length > 0) {
    const folder = theme.includes("/") ? theme : `${themeRoot(quiz)}${theme}/`;
    const themeDir = join(base, folder);
    const settingsFile = join(themeDir, "theme.trivia-theme");
    if (await isFile(settingsFile)) {
      const settings = parseThemeSettings(await readFile(settingsFile, "utf8"));
      themeLabel = settings.label;
      for (const issue of settings.issues) {
        problems.push({ where: "theme", message: issue });
      }
      const local = (path: string): string =>
        join(folder, withoutQuery(path).trim());
      if (settings.stylesheet.trim().length > 0) {
        await check(local(settings.stylesheet), "theme");
      }
      for (const font of settings.fonts) {
        await check(local(font.file), "theme");
      }
      for (const background of settings.backgrounds) {
        await check(local(background), "theme");
      }
    } else {
      await check(join(folder, "style.css"), "theme");
    }
  }

  return { checked, problems, theme: themeLabel };
}
