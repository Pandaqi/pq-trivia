/** Shared CLI helpers. Files in, models out. No DOM. */

import { readFile, writeFile, copyFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
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
    const path = join(ROOT, target);
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
    const mark = question.correct ? "✓" : question.answered ? "✗" : "–";
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

/** `.bak` next to the file, only when a write is really going to happen. */
export async function backup(path: string): Promise<void> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await copyFile(path, `${path}.${stamp}.bak`);
}

export async function writeText(path: string, text: string): Promise<void> {
  await writeFile(path, text, "utf8");
}
