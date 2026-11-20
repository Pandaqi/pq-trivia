/**
 * CLI. Same core functions as the browser, no DOM in sight.
 *
 *   bun run cli/index.ts validate test/fixtures
 *   bun run cli/index.ts build test/fixtures/simple.trivia --format html --out quiz.html
 *   bun run cli/index.ts grade quiz.trivia --answers responses.json
 */

import { mkdir, readFile } from "node:fs/promises";
import { generatePackKeys, verifyPack, type PackSignature } from "./sign";
import { packCommand } from "./pack";
import { isAbsolute, join } from "node:path";
import { buildQuiz } from "../src/core/model/quiz";
import { questionMaxScore } from "../src/core/model/question";
import { planQuiz } from "../src/core/plan/plan";
import { gradeAttempt } from "../src/core/grading/report";
import type { ResponseMap } from "../src/core/session/responses";
import { formatText } from "../src/core/syntax/serialize";
import {
  detectHeadingStyle,
  HeadingStyle,
  looksLikeQuiz,
  migrateHeadings,
} from "../src/core/syntax/headings";
import { listAttributes } from "../src/core/syntax/attributeRegistry";
import { ATTRIBUTE_DESCRIPTIONS } from "../src/core/syntax/attributeDocs";
import { gradesCsv, questionsCsv } from "../src/core/export/csv";
import { toGift } from "../src/core/export/gift";
import { toQti } from "../src/core/export/qti";
import { toEmbedded } from "../src/core/export/embedded";
import { toQuizJson } from "../src/core/export/json";
import { encryptQuiz } from "../src/platform/answerKey";
import { toStandaloneHtml } from "../src/core/export/standalone";
import { mediaOptionsFrom } from "../src/core/values/media";

import {
  importContent,
  importFormatOf,
  ImportFormat,
} from "../src/core/content/import";
import { nearDuplicates } from "../src/core/content/duplicates";
import {
  backup,
  buildWithIncludes,
  parseArgs,
  readExpanded,
  readPackFiles,
  readQuiz,
  requireCleanQuiz,
  relativeName,
  reportDiagnostics,
  reportText,
  resolveTargets,
  ROOT,
  writeText,
} from "./lib";

const USAGE = `PQ-Trivia CLI

  validate <path...> [--strict]        parse and report
  format <path...> [--write] [--from-v2|--from-v3]
                                       rewrite to canonical form
  migrate <path...> [--write|--check] [--headings] [--from-v2]
                                       canonicalise, keep a .bak
                                       --headings shifts heading levels only
  build <file> [--format json|html|gift|qti|csv] [--out file] [--answers]
  import <file.csv|file.md> [--out file]  a spreadsheet or notes into Trivia Syntax
  pack <file> [--out dir] [--seed text] [--key private.pem]
                                       an offline folder that plays
  keygen [--out dir]                   a signing key pair for packs
  verify <packdir>                     check a signed pack, file by file
  encrypt <file> [--passphrase text] [--out file]
  grade <file> --answers <json> [--csv]
  stats <path...>                      counts, types, points
  docs                                 the attribute table
`;

/** The flag wins. Otherwise the extension decides. */
function formatFrom(
  flag: string | true | undefined,
  source: string,
): ImportFormat {
  if (flag === "csv") {
    return ImportFormat.Csv;
  }
  if (flag === "markdown" || flag === "md") {
    return ImportFormat.Markdown;
  }
  return importFormatOf(source);
}

/** `--from-v2` and `--from-v3` beat the detector; they never fight each other. */
function headingStyle(
  fromV2: boolean,
  fromV3: boolean,
  text: string,
): HeadingStyle {
  if (fromV2) {
    return HeadingStyle.Legacy;
  }
  if (fromV3) {
    return HeadingStyle.Current;
  }
  return detectHeadingStyle(text);
}

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

// Import reads a spreadsheet or a Markdown file, so it runs before the quiz
// file search: a `.csv` is not a quiz file until this command makes it one.
/** A path from the command line, absolute or relative to the repo. */
function fromHere(path: string): string {
  return isAbsolute(path) ? path : join(ROOT, path);
}

if (command === "keygen") {
  const outFlag = flags["out"];
  const outDir = join(ROOT, typeof outFlag === "string" ? outFlag : "keys");
  const keys = generatePackKeys();
  await mkdir(outDir, { recursive: true });
  await writeText(join(outDir, "pq-pack-private.pem"), keys.privateKey);
  await writeText(join(outDir, "pq-pack-public.pem"), keys.publicKey);
  console.log(`Wrote ${outDir}/pq-pack-private.pem and pq-pack-public.pem.`);
  console.log("Keep the private half off the web. Ship the public one.");
  process.exit(0);
}

if (command === "verify") {
  const dir = targets[0];
  if (dir === undefined) {
    console.error("verify needs a pack folder.");
    process.exit(2);
  }
  const packDir = fromHere(dir);
  let signature: PackSignature | null = null;
  try {
    signature = JSON.parse(
      await readFile(join(packDir, "signature.json"), "utf8"),
    ) as PackSignature;
  } catch {
    console.error("No signature.json in that folder. Nothing to check.");
    process.exit(1);
  }
  if (signature === null) {
    process.exit(1);
  }
  const files = await readPackFiles(packDir, Object.keys(signature.files));
  const check = verifyPack(files, signature);
  if (!check.ok) {
    for (const problem of check.problems) {
      console.error(problem);
    }
    console.error("This pack is not the one that was signed. Do not use it.");
    process.exit(1);
  }
  console.log(
    `Signed pack checks out: ${Object.keys(signature.files).length} file(s).`,
  );
  process.exit(0);
}

if (command === "import") {
  const source = targets[0];
  if (source === undefined) {
    console.error("import needs one file.");
    process.exit(2);
  }
  // An absolute path is used as given. `join` on Windows would staple it to
  // the repo and produce a path that cannot exist.
  const text = await readFile(fromHere(source), "utf8");
  const format = formatFrom(flags["format"], source);
  const result = importContent(text, format);
  const counted = reportDiagnostics(result.diagnostics);
  const out =
    typeof flags["out"] === "string"
      ? flags["out"]
      : `${source.replace(/\.[^.]+$/, "")}.trivia`;
  if (flags["out"] === undefined) {
    process.stdout.write(result.text);
  } else {
    await writeText(fromHere(out), result.text);
    console.log(`Wrote ${out}: ${result.questions} question(s).`);
  }
  process.exit(counted.errors > 0 ? 1 : 0);
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
    const text = await readFile(file, "utf8");
    const style = detectHeadingStyle(text);
    const quiz = await readQuiz(file);
    const name = relativeName(file);
    if (style === HeadingStyle.Legacy) {
      console.log(
        `${name}: V2 headings. Run migrate ${relativeName(file)} --headings --write.`,
      );
    }
    // Duplicate wording is an authoring smell, not a broken file. Only the
    // content check looks for it; a player never pays for the scan.
    const counted = reportDiagnostics([
      ...quiz.diagnostics,
      ...nearDuplicates(quiz.questions),
    ]);
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
  const fromV2 = flags["from-v2"] === true;
  const fromV3 = flags["from-v3"] === true || flags["current"] === true;
  if (fromV2 && fromV3) {
    console.error("Use --from-v2 or --from-v3, not both.");
    process.exit(2);
  }
  for (const file of files) {
    const name = relativeName(file);
    const text = await readFile(file, "utf8");
    if (!looksLikeQuiz(text)) {
      console.error(`${name}: not a quiz, skipped`);
      continue;
    }
    const style = headingStyle(fromV2, fromV3, text);
    if (style === HeadingStyle.Ambiguous) {
      console.error(
        `${name}: headings are ambiguous. Add --from-v2 for old content. Add --from-v3 or --current for a title-only V3 quiz.`,
      );
      continue;
    }
    const source =
      style === HeadingStyle.Legacy
        ? migrateHeadings(text, { force: true })
        : text;
    const formatted = formatText(source, {});
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
  const headingsOnly = flags["headings"] === true;
  const forceLegacy = flags["from-v2"] === true;
  let changed = 0;
  for (const file of files) {
    const name = relativeName(file);
    const text = await readFile(file, "utf8");
    if (!looksLikeQuiz(text)) {
      console.log(`${name}: not a quiz, skipped`);
      continue;
    }
    const style = forceLegacy ? HeadingStyle.Legacy : detectHeadingStyle(text);
    if (style === HeadingStyle.Ambiguous) {
      console.log(
        `${name}: headings are ambiguous. Add --from-v2 if this is old content.`,
      );
    }
    const source = migrateHeadings(text, forceLegacy ? { force: true } : {});
    const migrated = headingsOnly ? source : formatText(source, {});
    if (migrated === text) {
      console.log(
        `${name}: ${headingsOnly ? "headings already current" : "already canonical"}`,
      );
      continue;
    }
    changed += 1;
    if (flags["write"] === true) {
      await backup(file);
      await writeText(file, migrated);
      console.log(
        `${name}: ${headingsOnly ? "headings migrated" : "migrated"} (backup kept)`,
      );
    } else {
      console.log(`${name}: needs ${headingsOnly ? "heading " : ""}migration`);
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
  requireCleanQuiz(quiz, problems);
  const plan = planQuiz(quiz);
  const format = typeof flags["format"] === "string" ? flags["format"] : "json";
  let output: string;
  switch (format) {
    case "html":
      // The header may set a media folder and formats. The handout obeys them.
      output = toStandaloneHtml(plan, quiz.meta, {
        answers: flags["answers"] === true,
        media: mediaOptionsFrom(quiz.meta.config),
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
  process.exit(await packCommand(files, flags));
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
  requireCleanQuiz(quiz, problems);
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
