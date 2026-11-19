/**
 * Release check. It never publishes. It proves the box is packed.
 *
 *   bun run release:dry
 *
 * Then, by hand, when the numbers look right:
 *   git tag v3.0.0 && git push --tags
 *   npm publish --provenance --access public
 *
 * The last two are a human decision with a human's name on it.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const DIST = join(ROOT, "dist", "v3");

interface PackageJson {
  readonly version: string;
  readonly private?: boolean;
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
  ["bun", "run", "build"],
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
console.log(
  `  1. ${pkg.private === true ? 'Set "private": false in package.json.' : "package.json is publishable."}`,
);
console.log(`  2. git tag v${version} && git push --tags`);
console.log("  3. npm publish --provenance --access public");
console.log("  4. bun run docs:build, then deploy docs/.vitepress/dist");
console.log("  5. Announce it. Tell the store. Update the gallery.");
