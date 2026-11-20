/**
 * Our own lint. About 100 lines, no dependency.
 *
 * Three jobs:
 * 1. Layers point one way. Core never imports a renderer or a platform file.
 * 2. Source hygiene. No DOM in core, no `any`, no @ts-ignore, no stray logs.
 * 3. No dead CSS. A class nobody renders is a rule that lies about the page.
 *
 * `bun run lint` runs all three. `bun run layers` runs only the first.
 */

import { readFile, readdir } from "node:fs/promises";
import { join, posix } from "node:path";

const ROOT = join(import.meta.dir, "..");
const layersOnly = process.argv.includes("--layers-only");

/** CODING_STYLE.md: 500 lines per file, 12 entries per folder. */
const MAX_LINES = 500;
const MAX_ENTRIES = 12;

/**
 * Author utilities, for quiz text rather than for our own markup, plus the
 * token classes the highlighter builds with a template string. Used, just not
 * by name in any file here.
 */
const CSS_ALLOWED: ReadonlySet<string> = new Set([
  "pq-dark",
  "pq-invert",
  "pq-center",
  "pq-spotlight",
  "pq-quote",
]);
const CSS_ALLOWED_PREFIXES: readonly string[] = ["pq-token-"];

const LAYER_OF: Readonly<Record<string, number>> = {
  core: 1,
  shared: 2,
  multiplayer: 7,
  editor: 4,
  platform: 5,
  themes: 6,
  renderers: 7,
  entries: 8,
  animations: 6,
};

const IMPORT_PATTERN =
  /(?:^|\n)\s*(?:import|export)[^;\n]*?from\s+["']([^"']+)["']|(?:^|\n)\s*import\s+["']([^"']+)["']/g;

/** One import, judged. Null when the edge is fine or outside the layers. */
function importProblem(
  file: string,
  specifier: string,
  text: string,
  sourceLayer: number | null,
): Problem | null {
  const target = relativeTarget(file, specifier);
  const targetLayer = layerOf(target);
  if (sourceLayer === null || targetLayer === null) {
    if (!target.startsWith("src/v2")) {
      return null;
    }
    return {
      file,
      line: lineOf(text, specifier),
      message: "V3 code imports archived V2 source.",
    };
  }
  if (targetLayer <= sourceLayer) {
    return null;
  }
  return {
    file,
    line: lineOf(text, specifier),
    message: `Layer ${sourceLayer} imports layer ${targetLayer} (${target}). Dependencies point one way.`,
  };
}

interface Problem {
  file: string;
  line: number;
  message: string;
}

function layerOf(path: string): number | null {
  const clean = path.replaceAll("\\", "/");
  const match = /^src\/([^/]+)\//.exec(clean);
  if (!match) {
    return null;
  }
  const segment = match[1] ?? "";
  return LAYER_OF[segment] ?? null;
}

function relativeTarget(file: string, specifier: string): string {
  return posix.normalize(posix.join(posix.dirname(file), specifier));
}

const problems: Problem[] = [];
const glob = new Bun.Glob("src/**/*.{ts,tsx}");

for await (const entry of glob.scan({ cwd: ROOT, onlyFiles: true })) {
  const file = entry.replaceAll("\\", "/");
  if (file.includes("/v2/")) {
    continue;
  }
  const text = await readFile(join(ROOT, file), "utf8");
  const lines = text.split(/\r?\n/);
  const sourceLayer = layerOf(file);

  // Locale tables are data, not code. One file per language is the rule.
  const isLocaleTable = file.startsWith("src/i18n/locales/");
  if (!layersOnly && !isLocaleTable && lines.length > MAX_LINES) {
    problems.push({
      file,
      line: MAX_LINES,
      message: `${lines.length} lines. Split it. One file, one job, 500 lines maximum.`,
    });
  }

  for (const match of text.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1] ?? match[2];
    if (specifier === undefined || !specifier.startsWith(".")) {
      continue;
    }
    const problem = importProblem(file, specifier, text, sourceLayer);
    if (problem !== null) {
      problems.push(problem);
    }
  }

  if (layersOnly) {
    continue;
  }

  const isCore = file.startsWith("src/core/");
  lines.forEach((line, index) => {
    const number = index + 1;
    if (
      isCore &&
      /(?<![.\w$])(document|window|localStorage|sessionStorage|navigator)\s*\.|(?<![.\w$])HTMLElement\b|\binnerHTML\b/.test(
        line,
      )
    ) {
      problems.push({
        file,
        line: number,
        message:
          "DOM access in core. Core compiles with lib ES2022 for a reason.",
      });
    }
    if (/:\s*any\b/.test(line) || /\bas any\b/.test(line)) {
      problems.push({
        file,
        line: number,
        message: "`any` hides a real type.",
      });
    }
    if (/@ts-(ignore|nocheck)/.test(line)) {
      problems.push({
        file,
        line: number,
        message: "Suppressing the type checker is not a fix.",
      });
    }
    if (/console\.(log|debug)\(/.test(line)) {
      problems.push({
        file,
        line: number,
        message: "Stray console call. Use a diagnostic or remove it.",
      });
    }
  });
}

function lineOf(text: string, needle: string): number {
  const index = text.indexOf(needle);
  if (index < 0) {
    return 1;
  }
  return text.slice(0, index).split(/\r?\n/).length;
}

/** Every class in the themes, checked against every file that can name one. */
async function deadCss(): Promise<void> {
  const dir = join(ROOT, "src/themes");
  const files = (await readdir(dir)).filter((name) => name.endsWith(".css"));
  const seen = new Map<string, Problem>();
  for (const file of files) {
    const text = await readFile(join(dir, file), "utf8");
    for (const match of text.matchAll(/\.([a-z][a-z0-9]*(?:-[a-z0-9]+)*)/gi)) {
      const name = match[1] ?? "";
      if (name.length < 3 || seen.has(name) || CSS_ALLOWED.has(name)) {
        continue;
      }
      if (CSS_ALLOWED_PREFIXES.some((prefix) => name.startsWith(prefix))) {
        continue;
      }
      seen.set(name, {
        file: `src/themes/${file}`,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        message: `\`.${name}\` is never rendered. Delete the rule.`,
      });
    }
  }
  const corpus: string[] = [];
  for await (const path of new Bun.Glob(
    "{src,examples,test,cli}/**/*.{ts,tsx,html,js}",
  ).scan({ cwd: ROOT, onlyFiles: true })) {
    const clean = path.replaceAll("\\", "/");
    if (clean.startsWith("src/v2/")) {
      continue;
    }
    corpus.push(await readFile(join(ROOT, clean), "utf8"));
  }
  const text = corpus.join("\n");
  for (const [name, problem] of seen) {
    if (!text.includes(name)) {
      problems.push(problem);
    }
  }
}

if (!layersOnly) {
  await deadCss();

  const folders = new Set<string>(["src"]);
  for await (const path of new Bun.Glob("src/**").scan({
    cwd: ROOT,
    onlyFiles: false,
  })) {
    const normalized = path.replaceAll("\\", "/");
    if (normalized.startsWith("src/v2")) {
      continue;
    }
    folders.add(normalized);
  }
  for (const folder of folders) {
    const entries = await readdir(join(ROOT, folder)).catch(
      () => [] as string[],
    );
    if (entries.length > MAX_ENTRIES) {
      problems.push({
        file: folder,
        line: 1,
        message: `${entries.length} entries. Split the folder. ${MAX_ENTRIES} maximum.`,
      });
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`${problem.file}:${problem.line} ${problem.message}`);
  }
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}

console.log(layersOnly ? "Layers are clean." : "Lint is clean.");
