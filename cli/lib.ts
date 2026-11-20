/** Shared CLI helpers. Files in, models out. No DOM. */

import { readFile, writeFile, copyFile, mkdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";
import {
  countBySeverity,
  DiagnosticCodes,
  DiagnosticSeverity,
  formatDiagnostic,
  syntaxWarning,
  type Diagnostic,
} from "../src/core/syntax/diagnostics";
import type { QuizModel } from "../src/core/model/quiz";
import { buildQuiz } from "../src/core/model/quiz";
import { expandIncludes } from "../src/core/content/include";
import type { GradeReport } from "../src/core/grading/report";
import { GradeBand, formatDuration } from "../src/core/grading/report";
import { AnswerMark, markOf } from "../src/core/values/marks";

export const ROOT = join(import.meta.dir, "..");
export const EXTENSIONS = /\.(trivia|txt|md)$/;

export type Flags = Readonly<Record<string, string | true>>;

export interface ParsedArgs {
  readonly flags: Flags;
  readonly targets: string[];
}

/** Flags, their values and the paths that are neither. */
export function parseArgs(arguments_: readonly string[]): ParsedArgs {
  const flags: Record<string, string | true> = {};
  const targets: string[] = [];
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === undefined) {
      continue;
    }
    if (!argument.startsWith("--")) {
      targets.push(argument);
      continue;
    }
    const key = argument.slice(2);
    const next = arguments_[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[key] = next;
      index += 1;
    } else {
      flags[key] = true;
    }
  }
  return { flags, targets };
}

export function relativeName(path: string): string {
  return relative(ROOT, path).replaceAll("\\", "/");
}

export async function resolveTargets(
  targets: readonly string[],
): Promise<string[]> {
  const files: string[] = [];
  for (const target of targets) {
    // An absolute path is used as given. `join` would staple it to the repo.
    const path = isAbsolute(target) ? target : join(ROOT, target);
    if (EXTENSIONS.test(target)) {
      files.push(path);
      continue;
    }
    const glob = new Bun.Glob("**/*.{trivia,txt,md}");
    for await (const found of glob.scan({ cwd: path, onlyFiles: true })) {
      files.push(join(path, found));
    }
  }
  return files.sort();
}

export async function readQuiz(path: string): Promise<QuizModel> {
  const text = await readFile(path, "utf8");
  return buildQuiz(text, { file: relativeName(path) });
}

/** Every quiz file under the target's folder, keyed the way includes write it. */
export async function readBank(path: string): Promise<Map<string, string>> {
  const base = dirname(path);
  const files = new Map<string, string>();
  const glob = new Bun.Glob("**/*.{trivia,txt,md}");
  for await (const found of glob.scan({ cwd: base, onlyFiles: true })) {
    files.set(
      found.replaceAll("\\", "/"),
      await readFile(join(base, found), "utf8"),
    );
  }
  files.set(
    relative(base, path).replaceAll("\\", "/"),
    await readFile(path, "utf8"),
  );
  return files;
}

export interface ExpandedQuiz {
  /** The file with every `#include` written out. */
  readonly text: string;
  readonly quiz: QuizModel;
  readonly problems: readonly string[];
  readonly files: readonly string[];
}

export async function readExpanded(path: string): Promise<ExpandedQuiz> {
  const bank = await readBank(path);
  const own = relativeName(path);
  const key = relative(dirname(path), path).replaceAll("\\", "/");
  const text = bank.get(key) ?? (await readFile(path, "utf8"));
  const expanded = expandIncludes({ name: key, text }, bank);
  return {
    text: expanded.text,
    quiz: buildQuiz(expanded.text, { file: own }),
    problems: expanded.problems,
    files: expanded.files,
  };
}

export async function buildWithIncludes(path: string): Promise<{
  quiz: QuizModel;
  problems: readonly string[];
  files: readonly string[];
}> {
  const expanded = await readExpanded(path);
  return {
    quiz: expanded.quiz,
    problems: expanded.problems,
    files: expanded.files,
  };
}

export function reportDiagnostics(diagnostics: readonly Diagnostic[]): {
  errors: number;
  warnings: number;
} {
  for (const diagnostic of diagnostics) {
    console.log(formatDiagnostic(diagnostic));
  }
  return {
    errors: countBySeverity(diagnostics, DiagnosticSeverity.Error),
    warnings: countBySeverity(diagnostics, DiagnosticSeverity.Warning),
  };
}

/**
 * The one gate for commands that write. Parse errors or missing includes mean
 * no output: a half-parsed quiz on disk is worse than an error message.
 *
 * Exits the process, so it belongs at the edge, not in a library.
 */
export function requireCleanQuiz(
  quiz: QuizModel,
  problems: readonly string[],
): void {
  for (const problem of problems) {
    const diagnostic = syntaxWarning(DiagnosticCodes.InvalidLine, problem);
    console.log(`${diagnostic.code} ${diagnostic.message}`);
  }
  const counted = reportDiagnostics(quiz.diagnostics);
  if (problems.length > 0 || counted.errors > 0) {
    console.error("Fix the errors first. Nothing was written.");
    process.exit(1);
  }
}

function bandLabel(band: GradeBand): string {
  switch (band) {
    case GradeBand.Excellent:
      return "Excellent";
    case GradeBand.Good:
      return "Good";
    case GradeBand.Fair:
      return "Fair";
    case GradeBand.Practice:
      return "Keep practising";
    case GradeBand.Empty:
    default:
      return "No points";
  }
}

function statusMark(question: GradeReport["questions"][number]): string {
  if (question.correct) {
    return markOf(true);
  }
  if (question.answered) {
    return markOf(false);
  }
  return AnswerMark.Skipped;
}

export function reportText(report: GradeReport): string {
  const lines = [
    report.title.length > 0 ? report.title : "Quiz",
    `Score: ${report.points} / ${report.maxPoints} (${report.percent}%) — ${bandLabel(report.band)}`,
    `Correct ${report.correct}, wrong ${report.wrong}, skipped ${report.unanswered}`,
  ];
  if (report.durationMs !== null) {
    lines.push(`Time: ${formatDuration(report.durationMs)}`);
  }
  lines.push("");
  for (const question of report.questions) {
    const mark = statusMark(question);
    lines.push(
      `${mark} ${question.index + 1}. ${question.title} (${question.points}/${question.maxPoints})`,
    );
    for (const part of question.parts) {
      if (part.correct) {
        continue;
      }
      lines.push(
        `    ${part.label}: "${part.given}" should be "${part.expected}"`,
      );
    }
  }
  return lines.join("\n");
}

/**
 * Copy a quiz's media next to the HTML.
 *
 * A pack that points at `media/crowd.jpg` on the author's laptop is not
 * offline. Absolute URLs are left alone: they are somebody else's network.
 */
export async function copyMedia(
  paths: readonly string[],
  baseDir: string,
  outDir: string,
  subFolder: string,
): Promise<{ copied: number; missing: string[] }> {
  const missing: string[] = [];
  let copied = 0;
  for (const path of new Set(paths)) {
    if (
      path.length === 0 ||
      /^[a-z][a-z0-9+.-]*:/i.test(path) ||
      path.startsWith("//")
    ) {
      continue;
    }
    const from = join(baseDir, subFolder, path);
    const exists = await stat(from).then(
      () => true,
      () => false,
    );
    if (!exists) {
      missing.push(path);
      continue;
    }
    const to = join(outDir, subFolder, path);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
    copied += 1;
  }
  return { copied, missing };
}

/** `.bak` next to the file, only when a write is really going to happen. */
export async function backup(path: string): Promise<void> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await copyFile(path, `${path}.${stamp}.bak`);
}

export async function writeText(path: string, text: string): Promise<void> {
  await writeFile(path, text, "utf8");
}

/** Read every file a signature names. Missing ones are named by `verifyPack`. */
export async function readPackFiles(
  root: string,
  paths: readonly string[],
): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = {};
  for (const path of paths) {
    try {
      files[path] = await readFile(join(root, path));
    } catch {
      // Missing files are reported by `verifyPack`, with their names.
    }
  }
  return files;
}
