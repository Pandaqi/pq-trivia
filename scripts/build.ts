/**
 * Build. Bun does the work, this script decides what and where.
 *
 * Adding an entry is a file in `src/entries/`, not a config edit.
 */

import { mkdir, readdir, readFile, rm, watch } from "node:fs/promises";
import { join } from "node:path";
import type { TranslationTable } from "../src/i18n/types";
import { minifyCss } from "./css";
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
    .filter(
      (file) =>
        file.endsWith(".ts") && file !== "index.ts" && file !== "all.ts",
    )
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

interface LocaleFiles {
  readonly locales: string;
  readonly live: string;
  readonly editor: string;
  readonly diagnostic: string;
  readonly loader: string;
}

/**
 * One key list, one value list per language. Repeating three hundred keys in
 * eight object literals is most of what gzip was asked to squeeze; the arrays
 * say the same thing once.
 */
function compactLocales(
  exportName: string,
  codes: readonly string[],
  tables: readonly TranslationTable[],
): string {
  const keys = [...new Set(tables.flatMap((table) => Object.keys(table)))];
  const values = tables.map((table) => keys.map((key) => table[key] ?? null));
  return `import type { TranslationTable } from "../src/i18n/types";

const KEYS = ${JSON.stringify(keys)};
const CODES = ${JSON.stringify(codes)};
const VALUES: (string | null)[][] = ${JSON.stringify(values)};

function tableAt(index: number): TranslationTable {
  const values = VALUES[index] ?? [];
  const table: Record<string, string> = {};
  for (let at = 0; at < KEYS.length; at += 1) {
    const key = KEYS[at];
    const value = values[at];
    if (key !== undefined && value !== null && value !== undefined) {
      table[key] = value;
    }
  }
  return table;
}

export const ${exportName}: Readonly<Record<string, TranslationTable>> =
  Object.fromEntries(CODES.map((code, index) => [code, tableAt(index)]));
`;
}

async function writeLocales(
  languages: readonly string[],
): Promise<LocaleFiles> {
  await mkdir(GENERATED_DIR, { recursive: true });
  const names = languages.map((code, index) => ({
    code,
    index,
    name: code.replaceAll("-", "_"),
  }));
  const imports = (suffix: string): string =>
    names
      .map(
        ({ code, index, name }) =>
          `import { ${name}${suffix} as locale${index} } from "../src/i18n/locales/${code}";`,
      )
      .join("\n");
  const entries = names
    .map(({ code, index }) => `${JSON.stringify(code)}: locale${index}`)
    .join(", ");
  const write = async (name: string, body: string): Promise<string> => {
    const path = join(GENERATED_DIR, name);
    await Bun.write(path, body);
    return path;
  };
  // A fresh query keeps watch mode honest: a changed locale file is read
  // again instead of served from the module cache.
  const stamp = `${Date.now()}-${Math.random()}`;
  const readTables = async (
    suffix: "Base" | "Live",
  ): Promise<readonly TranslationTable[]> =>
    Promise.all(
      names.map(async ({ code, name }) => {
        const module = (await import(
          `../src/i18n/locales/${code}.ts?${stamp}`
        )) as Record<string, TranslationTable | undefined>;
        return module[`${name}${suffix}`] ?? {};
      }),
    );
  const codes = names.map(({ code }) => code);
  const locales = await write(
    "locales.ts",
    compactLocales("LOCALES", codes, await readTables("Base")),
  );
  const live = await write(
    "liveLocales.ts",
    compactLocales("LIVE_LOCALES", codes, await readTables("Live")),
  );
  // The wizard shows diagnostics too, so its table carries both halves.
  const editorImports = names
    .map(
      ({ code, index, name }) =>
        `import { ${name}Editor as editor${index}, ${name}Diagnostics as diag${index} } from "../src/i18n/locales/${code}";`,
    )
    .join("\n");
  const editorEntries = names
    .map(
      ({ code, index }) =>
        `${JSON.stringify(code)}: { ...editor${index}, ...diag${index} }`,
    )
    .join(", ");
  const editor = await write(
    "editorLocales.ts",
    `${editorImports}\n\nexport const EDITOR_LOCALES = { ${editorEntries} };\n`,
  );
  const diagnostic = await write(
    "diagnosticLocales.ts",
    `${imports("Diagnostics")}\n\nexport const DIAGNOSTIC_LOCALES = { ${entries} };\n\nexport const DIAGNOSTIC_KEYS: ReadonlySet<string> = new Set(\n  Object.values(DIAGNOSTIC_LOCALES).flatMap((table) => Object.keys(table)),\n);\n`,
  );
  const loader = await write(
    "loaderLocales.ts",
    `${imports("Loader")}\n\nexport const LOADER_LOCALES = { ${entries} };\n`,
  );
  return { locales, live, editor, diagnostic, loader };
}

/** Themes stay readable in `src/`; bundles get the compact text. */
const CSS_PLUGIN: BuildPlugin = {
  name: "pq-css",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => ({
      contents: minifyCss(await readFile(args.path, "utf8")),
      loader: "text",
    }));
  },
};

let localeFiles: LocaleFiles = {
  locales: "",
  live: "",
  editor: "",
  diagnostic: "",
  loader: "",
};
/**
 * The one-file bundle leaves `uqr` out: ten kilobytes of encoder for a lobby
 * that only reaches the same browser until the page loads Trystero, and the
 * lobby already falls back to the room code and the link. `src/entries/qr.ts`
 * ships the encoder as `pq-qr.min.js`; `parts.tsx` loads that script when its
 * dynamic import rejects.
 */
const QR_STUB_PLUGIN: BuildPlugin = {
  name: "pq-qr-stub",
  setup(build) {
    build.onResolve({ filter: /^\.\/qr$/ }, (args) => {
      const importer = args.importer.replaceAll("\\", "/");
      return importer.endsWith("/src/multiplayer/ui/parts.tsx")
        ? { path: "pq-qr", namespace: "pq-qr-stub" }
        : undefined;
    });
    build.onLoad({ filter: /.*/, namespace: "pq-qr-stub" }, () => ({
      contents:
        "export function encode() { throw new Error('The QR encoder is in pq-qr.min.js.'); }",
      loader: "js",
    }));
  },
};

const LOCALE_PLUGIN: BuildPlugin = {
  name: "pq-locales",
  setup(build) {
    build.onResolve({ filter: /^\.\/locales$/ }, (args) => {
      const importer = args.importer.replaceAll("\\", "/");
      return importer.endsWith("/src/i18n/dictionary.ts")
        ? { path: localeFiles.locales }
        : undefined;
    });
    build.onResolve({ filter: /liveLocales$/ }, () => ({
      path: localeFiles.live,
    }));
    build.onResolve({ filter: /editorLocales$/ }, () => ({
      path: localeFiles.editor,
    }));
    build.onResolve({ filter: /diagnosticLocales$/ }, () => ({
      path: localeFiles.diagnostic,
    }));
    build.onResolve({ filter: /loaderLocales$/ }, () => ({
      path: localeFiles.loader,
    }));
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
  return `/*! PQ-Trivia v${version} | ${name} | MIT | https://pandaqi.github.io/pq-trivia/ */`;
}

/** Entries that ship as IIFE and a fixed file name. */
const IIFE_ENTRIES: Readonly<Record<string, string>> = {
  standalone: "pq-trivia.min.js",
  // The encoder the one-file bundle fetches when a lobby opens.
  qr: "pq-qr.min.js",
};

/**
 * Themes built from parts. Sources stay small and readable; hosts link one file.
 */
const THEME_PARTS: Readonly<Record<string, readonly string[]>> = {
  "paper.css": [
    "fonts.css",
    "paper.base.css",
    "paper.answers.css",
    "paper.controls.css",
    "paper.interactive.css",
    "paper.live.css",
  ],
  "print.css": ["print.pages.css", "print.questions.css", "print.forms.css"],
};

/** Where the block that opens at `open` closes, or the end of the text. */
function closingBrace(css: string, open: number): number {
  let depth = 0;
  for (let cursor = open; cursor < css.length; cursor += 1) {
    const char = css[cursor];
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char !== "}") {
      continue;
    }
    depth -= 1;
    if (depth === 0) {
      return cursor;
    }
  }
  return css.length;
}

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
    const cursor = closingBrace(css, open);
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

  // The OFL text travels with the embedded Figtree subsets. A font without
  // its licence is not a font you can ship.
  await Bun.write(
    join(outThemes, "Figtree-OFL.txt"),
    Bun.file(join(themeDir, "fonts", "Figtree-OFL.txt")),
  );
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
  localeFiles = await writeLocales(languages);

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
      // entries can split; the IIFE ones are one file by design, so the
      // one-file bundle loads `pq-qr.min.js` as a sibling script instead.
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
      plugins: [
        LOCALE_PLUGIN,
        CSS_PLUGIN,
        ...(iifeName === undefined ? [] : [QR_STUB_PLUGIN]),
      ],
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

// Declarations are part of the package. Watch mode skips them: the next save
// rebuilds the JavaScript anyway, and a type emit on every keystroke is noise.
if (!WATCH) {
  console.log("\nTypes: dist/types");
  const types = Bun.spawnSync(["bun", "run", "types"], {
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (types.exitCode !== 0) {
    process.exit(1);
  }
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
