/**
 * CLI. Same core functions as the browser, no DOM in sight.
 *
 *   bun run cli/index.ts validate test/fixtures
 *   bun run cli/index.ts format test/fixtures/simple.trivia --write
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { buildQuiz } from "../src/core/model/quiz";
import { questionMaxScore } from "../src/core/model/question";
import { formatText } from "../src/core/syntax/serialize";
import { listAttributes } from "../src/core/syntax/attributeRegistry";
import { ATTRIBUTE_DESCRIPTIONS } from "../src/core/syntax/attributeDocs";
import {
  countBySeverity,
  DiagnosticSeverity,
  formatDiagnostic,
} from "../src/core/syntax/diagnostics";

const ROOT = join(import.meta.dir, "..");

async function collectFiles(targets: readonly string[]): Promise<string[]> {
  const files: string[] = [];
  for (const target of targets) {
    const path = join(ROOT, target);
    if (/\.(trivia|txt|md)$/.test(target)) {
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

function usage(): never {
  console.error(
    "Usage: pq-trivia <validate|format|docs> <path...> [--write] [--strict]",
  );
  process.exit(2);
}

const [command, ...rest] = process.argv.slice(2);
const flags = rest.filter((argument) => argument.startsWith("--"));
const targets = rest.filter((argument) => !argument.startsWith("--"));

if (command === "docs") {
  const lines = [
    "| Attribute | Aliases | Type | Group | Notes |",
    "|---|---|---|---|---|",
  ];
  for (const attribute of listAttributes()) {
    const aliases = attribute.aliases.join(", ");
    const notes = ATTRIBUTE_DESCRIPTIONS[attribute.key] ?? "";
    lines.push(
      `| ${attribute.key} | ${aliases} | ${attribute.type} | ${attribute.group} | ${notes} |`,
    );
  }
  console.log(lines.join("\n"));
  process.exit(0);
}

if (command === undefined || targets.length === 0) {
  usage();
}

const strict = flags.includes("--strict");
const write = flags.includes("--write");
const files = await collectFiles(targets);

if (files.length === 0) {
  console.error("No quiz files found.");
  process.exit(2);
}

let errors = 0;
let warnings = 0;

for (const file of files) {
  const text = await readFile(file, "utf8");
  const name = relative(ROOT, file).replaceAll("\\", "/");

  if (command === "validate") {
    const quiz = buildQuiz(text, { file: name });
    const diagnostics = quiz.diagnostics;
    const fileErrors = countBySeverity(diagnostics, DiagnosticSeverity.Error);
    const fileWarnings = countBySeverity(
      diagnostics,
      DiagnosticSeverity.Warning,
    );
    errors += fileErrors;
    warnings += fileWarnings;
    for (const diagnostic of diagnostics) {
      console.log(formatDiagnostic(diagnostic));
    }
    const maxScore = quiz.questions.reduce(
      (total, question) => total + questionMaxScore(question),
      0,
    );
    const rounds = `${quiz.rounds.length} ${quiz.rounds.length === 1 ? "round" : "rounds"}`;
    console.log(
      `${name}: ${quiz.questions.length} questions, ${rounds}, ${maxScore} points${fileErrors > 0 ? ", errors" : ", ok"}`,
    );
    continue;
  }

  if (command === "format") {
    const formatted = formatText(text, {});
    if (write) {
      await writeFile(file, formatted, "utf8");
      console.log(`${name}: formatted`);
    } else {
      process.stdout.write(formatted);
    }
    continue;
  }

  usage();
}

if (command === "validate") {
  console.log(
    `\n${files.length} file(s), ${errors} error(s), ${warnings} warning(s).`,
  );
  if (errors > 0 || (strict && warnings > 0)) {
    process.exit(1);
  }
}
