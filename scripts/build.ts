/**
 * Build. Bun does the work, this script decides what and where.
 *
 * Adding an entry is a file in `src/entries/`, not a config edit.
 */

import { mkdir, readdir, readFile, rm, watch } from "node:fs/promises";
import { join } from "node:path";
type BuildPlugin = NonNullable<
  NonNullable<Parameters<typeof Bun.build>[0]>["plugins"]
>[number];

const ROOT = join(import.meta.dir, "..");
const OUT_DIR = join(ROOT, "dist", "v3");
const ENTRIES_DIR = join(ROOT, "src", "entries");
const LOCALES_DIR = join(ROOT, "src", "i18n", "locales");
const GENERATED_DIR = join(ROOT, ".pq-build");
const WATCH = process.argv.includes("--watch");

/**
 * Entries that need a flag. The wizard is one: `bun run build --editor`.
 *
 * A normal build removes the old output too, so "not in the default build"
 * stays true after someone built it once.
 */
const OPT_IN_ENTRIES: Readonly<Record<string, string>> = {
  editor: "--editor",
};

function wants(name: string): boolean {
  const flag = OPT_IN_ENTRIES[name];
  return flag === undefined || process.argv.includes(flag);
}

/**
 * `--languages nl`, `--languages=nl,en`, or `--languages none`.
 *
 * No flag means every language in `locales/`. A filtered build leaves the
 * others out of the bundle completely, and `none` ships no interface strings.
 */
function requestedLanguages(args: readonly string[]): string[] | null {
  let raw: string | null = null;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (arg === "--no-languages" || arg === "--languages=none") {
      return [];
    }
    if (arg.startsWith("--languages=")) {
      raw = arg.slice("--languages=".length);
      continue;
    }
    if (arg === "--languages") {
      raw = args[index + 1] ?? "";
      index += 1;
    }
  }
  if (raw === null) {
    return null;
  }
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0 && entry !== "none");
}

async function selectLanguages(): Promise<string[]> {
  const available = (await readdir(LOCALES_DIR))
    .filter((file) => file.endsWith(".ts") && file !== "index.ts")
    .map((file) => file.replace(/\.ts$/, ""))
    .sort();
  const requested = requestedLanguages(process.argv.slice(2));
  if (requested === null) {
    return available;
  }
  const missing = requested.filter((code) => !available.includes(code));
  if (missing.length > 0) {
    console.error(
      `Unknown language(s): ${missing.join(", ")}. Available: ${available.join(", ")}.`,
    );
    process.exit(1);
  }
  return requested;
}

async function writeLocales(languages: readonly string[]): Promise<string> {
  await mkdir(GENERATED_DIR, { recursive: true });
  const imports = languages
    .map(
      (code, index) =>
        `import { ${code.replaceAll("-", "_")} as locale${index} } from "../src/i18n/locales/${code}";`,
    )
    .join("\n");
  const entries = languages
    .map((code, index) => `${JSON.stringify(code)}: locale${index}`)
    .join(", ");
  const path = join(GENERATED_DIR, "locales.ts");
  await Bun.write(
    path,
    `${imports}\n\nexport const LOCALES = { ${entries} };\n`,
  );
  return path;
}

let localeFile = "";
const LOCALE_PLUGIN: BuildPlugin = {
  name: "pq-locales",
  setup(build) {
    build.onResolve({ filter: /^\.\/locales$/ }, (args) => {
      const importer = args.importer.replaceAll("\\", "/");
      return importer.endsWith("/src/i18n/dictionary.ts")
        ? { path: localeFile }
        : undefined;
    });
  },
};

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

async function build(languages: readonly string[]): Promise<boolean> {
  await mkdir(OUT_DIR, { recursive: true });
  // A rename leaves the old chunk behind, and dist is what ships. Chunks are
  // rebuilt every run, so dropping them costs nothing.
  for (const file of await readdir(OUT_DIR)) {
    const stale =
      file.startsWith("chunk-") &&
      (file.endsWith(".js") || file.endsWith(".js.map"));
    if (stale) {
      await rm(join(OUT_DIR, file));
    }
  }
  localeFile = await writeLocales(languages);

  for (const [name, flag] of Object.entries(OPT_IN_ENTRIES)) {
    if (process.argv.includes(flag)) {
      continue;
    }
    await rm(join(OUT_DIR, `${name}.js`), { force: true });
    await rm(join(OUT_DIR, `${name}.js.map`), { force: true });
    console.log(
      `  ${name}.js skipped. Build the wizard with \`bun run build ${flag}\`.`,
    );
  }

  // One file in src/entries/ is one artifact. No config edit to add an entry.
  const entryFiles = (await readdir(ENTRIES_DIR))
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"))
    .filter((file) => wants(file.replace(/\.ts$/, "")))
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
      // Dynamic imports (the QR encoder) become their own file instead of
      // riding along in a bundle most lobbies never need. Only the ESM
      // entries can split; the IIFE ones are one file by design.
      splitting: iifeName === undefined,
      minify: true,
      sourcemap: "external",
      // Entries keep their own name. A chunk is named after the module that
      // pulled it in (`chunk-preview.js`), or after the entry for the entry's
      // own dynamic imports (`chunk-editor.js`), so a network panel can name it.
      naming: {
        entry: `[dir]/${iifeName ?? `${entry.name}.[ext]`}`,
        chunk: "chunk-[name].[ext]",
      },
      banner: banner(entry.name),
      plugins: [LOCALE_PLUGIN],
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

const languages = await selectLanguages();
console.log(
  languages.length === 0
    ? "Languages: none (interface keys only)"
    : `Languages: ${languages.join(", ")}`,
);
const built = await build(languages);
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
      void build(languages);
    }, 100);
  }
}
