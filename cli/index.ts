/**
 * CLI. Same core functions as the browser, no DOM in sight.
 *
 *   bun run cli/index.ts validate test/fixtures
 *   bun run cli/index.ts build test/fixtures/simple.trivia --format html --out quiz.html
 *   bun run cli/index.ts grade quiz.trivia --answers responses.json
 */

import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildQuiz } from "../src/core/model/quiz";
import { questionMaxScore } from "../src/core/model/question";
import { planQuiz } from "../src/core/plan/plan";
import { gradeAttempt } from "../src/core/grading/report";
import type { ResponseMap } from "../src/core/session/responses";
import { formatText } from "../src/core/syntax/serialize";
import { listAttributes } from "../src/core/syntax/attributeRegistry";
import { ATTRIBUTE_DESCRIPTIONS } from "../src/core/syntax/attributeDocs";
import { gradesCsv, questionsCsv } from "../src/core/export/csv";
import { toGift } from "../src/core/export/gift";
import { toQti } from "../src/core/export/qti";
import { toEmbedded } from "../src/core/export/embedded";
import { toQuizJson } from "../src/core/export/json";
import { encryptQuiz } from "../src/platform/answerKey";
import { toStandaloneHtml } from "../src/core/export/standalone";
import { DiagnosticCodes, syntaxWarning } from "../src/core/syntax/diagnostics";
import {
  backup,
  buildWithIncludes,
  parseArgs,
  readExpanded,
  readQuiz,
  relativeName,
  reportDiagnostics,
  reportText,
  resolveTargets,
  ROOT,
  writeText,
} from "./lib";

const USAGE = `PQ-Trivia CLI

  validate <path...> [--strict]        parse and report
  format <path...> [--write]           rewrite to canonical form
  migrate <path...> [--write|--check]  canonicalise, keep a .bak
  build <file> [--format json|html|gift|qti|csv] [--out file] [--answers]
  pack <file> [--out dir] [--seed text]   an offline folder that plays
  encrypt <file> [--passphrase text] [--out file]
  grade <file> --answers <json> [--csv]
  stats <path...>                      counts, types, points
  docs                                 the attribute table
`;

const [command, ...rest] = process.argv.slice(2);
const { flags, targets } = parseArgs(rest);

if (command === undefined || command === "help" || command === "--help") {
  console.log(USAGE);
  process.exit(command === undefined ? 2 : 0);
}

if (command === "docs") {
  const lines = [
    "| Attribute | Aliases | Type | Group | Notes |",
    "|---|---|---|---|---|",
  ];
  for (const attribute of listAttributes()) {
    lines.push(
      `| ${attribute.key} | ${attribute.aliases.join(", ")} | ${attribute.type} | ${attribute.group} | ${ATTRIBUTE_DESCRIPTIONS[attribute.key] ?? ""} |`,
    );
  }
  console.log(lines.join("\n"));
  process.exit(0);
}

const files = await resolveTargets(targets);
if (files.length === 0) {
  console.error("No quiz files found.");
  process.exit(2);
}

let errors = 0;
let warnings = 0;

if (command === "validate") {
  const strict = flags["strict"] === true;
  for (const file of files) {
    const quiz = await readQuiz(file);
    const name = relativeName(file);
    const counted = reportDiagnostics(quiz.diagnostics);
    errors += counted.errors;
    warnings += counted.warnings;
    const maxScore = quiz.questions.reduce(
      (total, question) => total + questionMaxScore(question),
      0,
    );
    console.log(
      `${name}: ${quiz.questions.length} questions, ${quiz.rounds.length} rounds, ${maxScore} points${counted.errors > 0 ? ", errors" : ", ok"}`,
    );
  }
  console.log(
    `\n${files.length} file(s), ${errors} error(s), ${warnings} warning(s).`,
  );
  process.exit(errors > 0 || (strict && warnings > 0) ? 1 : 0);
}

if (command === "format") {
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const formatted = formatText(text, {});
    if (flags["write"] === true) {
      await writeText(file, formatted);
      console.log(`${relativeName(file)}: formatted`);
    } else {
      process.stdout.write(formatted);
    }
  }
  process.exit(0);
}

if (command === "migrate") {
  let changed = 0;
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const formatted = formatText(text, {});
    if (formatted === text) {
      console.log(`${relativeName(file)}: already canonical`);
      continue;
    }
    changed += 1;
    if (flags["write"] === true) {
      await backup(file);
      await writeText(file, formatted);
      console.log(`${relativeName(file)}: migrated (backup kept)`);
    } else {
      console.log(`${relativeName(file)}: needs migration`);
    }
  }
  if (changed > 0 && flags["check"] === true) {
    console.error(`\n${changed} file(s) need migration.`);
    process.exit(1);
  }
  process.exit(0);
}

if (command === "build") {
  const file = files[0];
  if (file === undefined) {
    console.error("build needs one file.");
    process.exit(2);
  }
  const { quiz, problems, files: used } = await buildWithIncludes(file);
  for (const problem of problems) {
    const diagnostic = syntaxWarning(DiagnosticCodes.InvalidLine, problem);
    console.log(`${diagnostic.code} ${diagnostic.message}`);
  }
  reportDiagnostics(quiz.diagnostics);
  const plan = planQuiz(quiz);
  const format = typeof flags["format"] === "string" ? flags["format"] : "json";
  let output: string;
  switch (format) {
    case "html":
      output = toStandaloneHtml(plan, quiz.meta, {
        answers: flags["answers"] === true,
      });
      break;
    case "gift":
      output = toGift(plan, quiz.meta);
      break;
    case "qti":
      output = toQti(plan, quiz.meta);
      break;
    case "csv":
      output = questionsCsv(plan, quiz.meta);
      break;
    case "json":
    default:
      output = toQuizJson(quiz, { pretty: true });
      break;
  }
  const out = flags["out"];
  if (typeof out === "string") {
    await writeText(join(ROOT, out), output);
    console.log(
      `Wrote ${out}: ${plan.questions.length} questions from ${used.length} file(s).`,
    );
  } else {
    process.stdout.write(output);
  }
  process.exit(0);
}

if (command === "pack") {
  const file = files[0];
  if (file === undefined) {
    console.error("pack needs one file.");
    process.exit(2);
  }
  const { text: expanded, quiz, problems } = await readExpanded(file);
  for (const problem of problems) {
    const diagnostic = syntaxWarning(DiagnosticCodes.InvalidLine, problem);
    console.log(`${diagnostic.code} ${diagnostic.message}`);
  }
  if (quiz.questions.length === 0) {
    console.error("Nothing to pack: this quiz has no questions.");
    process.exit(1);
  }
  const slug =
    quiz.meta.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "quiz";
  const outFlag = flags["out"];
  const outDir = join(
    ROOT,
    typeof outFlag === "string" ? outFlag : `dist/pack/${slug}`,
  );
  const escaper = (text: string): string =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  // Includes are already written out, so the pack is one self-contained file.
  const text = formatText(expanded, {}).replaceAll("</script", "<\\/script");
  const seed = typeof flags["seed"] === "string" ? flags["seed"] : "";
  const title = escaper(quiz.meta.title);
  const packFiles = [
    "index.html",
    "quiz.trivia",
    "pq-trivia.min.js",
    "style.css",
    "print.css",
    "manifest.json",
    "sw.js",
  ];
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="print.css" media="print">
<script src="pq-trivia.min.js" defer></script>
</head>
<body>
<div id="app"></div>
<script id="quiz-text" type="text/plain">
${text}
</script>
<script>
window.addEventListener("load", function () {
  var host = document.getElementById("app");
  var source = document.getElementById("quiz-text").textContent;
  var quiz = PQTrivia.createQuiz({ config: { seed: ${JSON.stringify(seed)} } });
  PQTrivia.mountQuiz(quiz, host);
  quiz.load({ type: "text", text: source });
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
});
</script>
</body>
</html>
`;
  const sw = `/* Offline pack: cache the seven files, serve them when the network is gone. */
const CACHE = "pq-pack-${slug}";
const FILES = ${JSON.stringify(packFiles, null, 2)};
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
});
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request)),
  );
});
`;
  try {
    await mkdir(outDir, { recursive: true });
    await copyFile(
      join(ROOT, "dist/v3/pq-trivia.min.js"),
      join(outDir, "pq-trivia.min.js"),
    );
    await copyFile(
      join(ROOT, "dist/v3/themes/paper.css"),
      join(outDir, "style.css"),
    );
    await copyFile(
      join(ROOT, "dist/v3/themes/print.css"),
      join(outDir, "print.css"),
    );
  } catch {
    console.error("Build first: bun run build makes the player and themes.");
    process.exit(1);
  }
  await writeText(join(outDir, "quiz.trivia"), text);
  await writeText(join(outDir, "index.html"), html);
  await writeText(
    join(outDir, "manifest.json"),
    `${JSON.stringify(
      {
        name: quiz.meta.title,
        version: 3,
        seed,
        questions: quiz.questions.length,
        files: packFiles,
      },
      null,
      2,
    )}\n`,
  );
  await writeText(join(outDir, "sw.js"), sw);
  console.log(`Packed ${quiz.questions.length} questions into ${outDir}.`);
  console.log("Open index.html from the folder, Wi-Fi or not.");
  process.exit(0);
}

if (command === "encrypt") {
  const file = files[0];
  if (file === undefined) {
    console.error("encrypt needs one file.");
    process.exit(2);
  }
  const flag = flags["passphrase"];
  const passphrase =
    typeof flag === "string" ? flag : process.env["PQ_PASSPHRASE"];
  if (passphrase === undefined || passphrase.length === 0) {
    console.error("encrypt needs --passphrase or PQ_PASSPHRASE.");
    process.exit(2);
  }
  if (passphrase.length < 8) {
    console.warn(
      "A short passphrase is a short wall. Eight characters or more, please.",
    );
  }
  const { quiz, problems } = await readExpanded(file);
  for (const problem of problems) {
    const diagnostic = syntaxWarning(DiagnosticCodes.InvalidLine, problem);
    console.log(`${diagnostic.code} ${diagnostic.message}`);
  }
  reportDiagnostics(quiz.diagnostics);
  if (quiz.questions.length === 0) {
    console.error("Nothing to encrypt: this quiz has no questions.");
    process.exit(1);
  }
  const payload = await encryptQuiz(toEmbedded(quiz), passphrase);
  const outFlag = flags["out"];
  const out =
    typeof outFlag === "string"
      ? join(ROOT, outFlag)
      : `${file.replace(/\.[^.]+$/, "")}.encrypted.json`;
  await writeText(out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `Encrypted ${quiz.questions.length} questions into ${relativeName(out)}.`,
  );
  console.log("There is no recovery. Keep the passphrase somewhere else.");
  process.exit(0);
}

if (command === "grade") {
  const file = files[0];
  const answersPath = flags["answers"];
  if (file === undefined || typeof answersPath !== "string") {
    console.error("grade needs a quiz file and --answers responses.json");
    process.exit(2);
  }
  const quiz = await readQuiz(file);
  const plan = planQuiz(quiz);
  const raw = JSON.parse(await readFile(join(ROOT, answersPath), "utf8")) as
    { responses?: unknown } | Record<string, unknown>;
  const responses = (
    "responses" in raw && raw.responses !== undefined ? raw.responses : raw
  ) as ResponseMap;
  const report = gradeAttempt(plan, responses, { title: quiz.meta.title });
  console.log(flags["csv"] === true ? gradesCsv(report) : reportText(report));
  process.exit(0);
}

if (command === "stats") {
  let questions = 0;
  let rounds = 0;
  let points = 0;
  const types = new Map<string, number>();
  for (const file of files) {
    const quiz = buildQuiz(await readFile(file, "utf8"), {
      file: relativeName(file),
    });
    const plan = planQuiz(quiz);
    questions += plan.total;
    rounds += plan.rounds.length;
    points += plan.maxScore;
    for (const question of plan.questions) {
      types.set(question.type, (types.get(question.type) ?? 0) + 1);
    }
    console.log(
      `${relativeName(file)}: ${plan.total} questions, ${plan.rounds.length} rounds, ${plan.maxScore} points`,
    );
  }
  const minutes = Math.max(1, Math.round((questions * 35) / 60));
  console.log(
    `\n${files.length} file(s): ${questions} questions, ${rounds} rounds, ${points} points.`,
  );
  console.log(`Roughly ${minutes} minutes of play.`);
  for (const [type, count] of [...types.entries()].sort()) {
    console.log(`  ${type}: ${count}`);
  }
  process.exit(0);
}

console.error(`Unknown command "${command}".\n`);
console.log(USAGE);
process.exit(2);
