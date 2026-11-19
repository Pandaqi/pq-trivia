/**
 * Build. Bun does the work, this script decides what and where.
 *
 * Adding an entry is a file in `src/entries/`, not a config edit.
 */

import { mkdir, readdir, readFile, watch } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const OUT_DIR = join(ROOT, "dist", "v3");
const ENTRIES_DIR = join(ROOT, "src", "entries");
const WATCH = process.argv.includes("--watch");

interface Entry {
  readonly name: string;
  readonly path: string;
  readonly format: "esm" | "iife";
}

interface PackageJson {
  readonly version: string;
}

const pkg = JSON.parse(
  await readFile(join(ROOT, "package.json"), "utf8"),
) as PackageJson;
const version = await readFile(
  join(ROOT, "src", "core", "version.ts"),
  "utf8",
).then((text) => {
  const match = /VERSION\s*=\s*"([^"]+)"/.exec(text);
  return match?.[1] ?? pkg.version;
});

if (version !== pkg.version) {
  console.error(
    `Version mismatch: package.json says ${pkg.version}, src/core/version.ts says ${version}.`,
  );
  process.exit(1);
}

function banner(name: string): string {
  return `/*! PQ-Trivia v${version} | ${name} | MIT | https://pq-trivia.dev */`;
}

/** Entries that ship as IIFE and a fixed file name. */
const IIFE_ENTRIES: Readonly<Record<string, string>> = {
  standalone: "pq-trivia.min.js",
};

/**
 * Themes built from parts. Sources stay small and readable; hosts link one file.
 */
const THEME_PARTS: Readonly<Record<string, readonly string[]>> = {
  "paper.css": [
    "paper.base.css",
    "paper.answers.css",
    "paper.controls.css",
    "paper.interactive.css",
    "paper.live.css",
  ],
  "print.css": ["print.pages.css", "print.questions.css", "print.forms.css"],
};

/** Remove every `@media print { … }` wrapper, whatever the nesting. */
function unwrapMediaPrint(css: string): string {
  let out = "";
  let index = 0;
  for (;;) {
    const at = css.indexOf("@media print", index);
    if (at < 0) {
      out += css.slice(index);
      return out;
    }
    out += css.slice(index, at);
    const open = css.indexOf("{", at);
    let depth = 0;
    let cursor = open;
    for (; cursor < css.length; cursor += 1) {
      const char = css[cursor];
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          break;
        }
      }
    }
    out += css.slice(open + 1, cursor);
    index = cursor + 1;
  }
}

async function copyThemes(): Promise<void> {
  const themeDir = join(ROOT, "src", "themes");
  const outThemes = join(OUT_DIR, "themes");
  await mkdir(outThemes, { recursive: true });

  const parts = new Set(Object.values(THEME_PARTS).flat());
  for (const file of await readdir(themeDir)) {
    if (!file.endsWith(".css") || parts.has(file) || file in THEME_PARTS) {
      continue;
    }
    await Bun.write(join(outThemes, file), Bun.file(join(themeDir, file)));
  }

  for (const [output, sources] of Object.entries(THEME_PARTS)) {
    const text = (
      await Promise.all(
        sources.map((file) => readFile(join(themeDir, file), "utf8")),
      )
    ).join("\n\n");
    await Bun.write(join(outThemes, output), text);
  }

  // Print proof: the same rules with @media print removed, so a page can show
  // the print layout on screen. Dev artifact; production links print.css.
  const printCss = await readFile(join(outThemes, "print.css"), "utf8");
  const proof = `/* Generated from print.css. Do not edit.\n * On screen it shows the print layout; production links print.css with media="print". */\n${unwrapMediaPrint(printCss)}`;
  await Bun.write(join(outThemes, "print.proof.css"), proof);
}

async function build(): Promise<boolean> {
  await mkdir(OUT_DIR, { recursive: true });

  // One file in src/entries/ is one artifact. No config edit to add an entry.
  const entryFiles = (await readdir(ENTRIES_DIR))
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"))
    .sort();
  const entries: Entry[] = entryFiles.map((file) => ({
    name: file.replace(/\.ts$/, ""),
    path: join(ENTRIES_DIR, file),
    format: "esm" as const,
  }));

  let ok = true;
  for (const entry of entries) {
    const iifeName = IIFE_ENTRIES[entry.name];
    const result = await Bun.build({
      entrypoints: [entry.path],
      outdir: OUT_DIR,
      target: "browser",
      format: iifeName === undefined ? entry.format : "iife",
      minify: true,
      sourcemap: "external",
      naming: `[dir]/${iifeName ?? `${entry.name}.[ext]`}`,
      banner: banner(entry.name),
    });

    if (!result.success) {
      ok = false;
      for (const log of result.logs) {
        console.error(log.message);
      }
      continue;
    }

    for (const output of result.outputs) {
      const size = (await Bun.file(output.path).arrayBuffer()).byteLength;
      console.log(
        `  ${output.path.replace(ROOT, ".")}  ${(size / 1024).toFixed(1)} KB`,
      );
    }
  }

  await copyThemes();
  return ok;
}

const built = await build();
if (!built) {
  process.exit(1);
}

if (WATCH) {
  console.log("\nWatching src/ for changes. Ctrl+C stops.");
  const watcher = watch(join(ROOT, "src"), { recursive: true });
  let timer: ReturnType<typeof setTimeout> | null = null;
  for await (const event of watcher) {
    if (!event.filename?.endsWith(".ts")) {
      continue;
    }
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      console.log(`\n${event.filename} changed. Rebuilding.`);
      void build();
    }, 100);
  }
}
