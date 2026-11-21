/**
 * Release check. It never publishes. It proves the box is packed.
 *
 *   bun run release:dry
 *
 * Then, by hand, when the numbers look right:
 *   git tag v3.0.0 && git push --tags
 *
 * The tag workflow runs this again, publishes with `bun publish`, and creates
 * the GitHub release. No npm on your machine, no npm in the workflow.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const DIST = join(ROOT, "dist", "v3");

interface PackageJson {
  readonly version: string;
}

const pkg = JSON.parse(
  await readFile(join(ROOT, "package.json"), "utf8"),
) as PackageJson;
const versionSource = await readFile(
  join(ROOT, "src", "core", "version.ts"),
  "utf8",
);
const version = /VERSION\s*=\s*"([^"]+)"/.exec(versionSource)?.[1];

if (version === undefined) {
  console.error("Could not read VERSION from src/core/version.ts.");
  process.exit(1);
}
if (version !== pkg.version) {
  console.error(
    `Version mismatch: package.json says ${pkg.version}, src/core/version.ts says ${version}.`,
  );
  process.exit(1);
}

const STEPS: ReadonlyArray<readonly string[]> = [
  ["bun", "run", "check"],
  ["bun", "run", "lint"],
  ["bun", "run", "test"],
  // The wizard is an advertised door, so the release build carries it. That
  // also puts its size budget and checksum in the same run as everything else.
  ["bun", "run", "build:editor"],
  ["bun", "run", "size"],
  ["bun", "run", "check:content"],
  ["bun", "run", "docs:reference"],
];

for (const step of STEPS) {
  console.log(`\n$ ${step.join(" ")}`);
  const result = Bun.spawnSync([...step], {
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) {
    console.error(`\nRelease stopped: ${step.join(" ")} failed.`);
    process.exit(1);
  }
}

// A package that promises these doors must contain the files behind them.
const required = [
  join(DIST, "editor.js"),
  join(DIST, "themes", "Figtree-OFL.txt"),
  join(DIST, "themes", "paper.css"),
  join(ROOT, "dist", "types", "entries", "player.d.ts"),
] as const;
for (const path of required) {
  if (!(await Bun.file(path).exists())) {
    console.error(`\nMissing from the release: ${path.replace(ROOT, ".")}.`);
    process.exit(1);
  }
}

// Checksums, so a download can be checked against the release.
const files = (await readdir(DIST))
  .filter((file) => file.endsWith(".js"))
  .sort();
const lines: string[] = [];
for (const file of files) {
  const bytes = await Bun.file(join(DIST, file)).arrayBuffer();
  const hash = new Bun.CryptoHasher("sha256")
    .update(new Uint8Array(bytes))
    .digest("hex");
  lines.push(`${hash}  ${file}`);
}
await writeFile(join(DIST, "SHA256SUMS"), `${lines.join("\n")}\n`, "utf8");

console.log(`\nRelease dry run done: v${version}.`);
console.log(`Checksums: dist/v3/SHA256SUMS (${files.length} files).`);
console.log("");
console.log("Left for a human:");
console.log("  1. Add NPM_TOKEN to the repository secrets.");
console.log("     Granular token, read and write on the @pandaqi scope, bypass 2FA.");
console.log(`  2. git tag v${version} && git push --tags`);
console.log("  3. The tag workflow publishes with bun and creates the release.");
console.log("  4. bun run docs:build, then deploy docs/.vitepress/dist.");
console.log("  5. Announce it. Tell the store. Update the gallery.");
