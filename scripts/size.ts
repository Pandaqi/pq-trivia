/**
 * Gzip budgets. Cheap to check, easy to break, worth keeping honest.
 *
 * Release-time, not on every save.
 */

import { readdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const OUT_DIR = join(ROOT, "dist", "v3");

/** Kilobytes of gzipped JavaScript. */
const BUDGETS: Readonly<Record<string, number>> = {
  "core.js": 15,
  "headless.js": 18,
  "player.js": 40,
  "pq-trivia.js": 55,
  "pq-trivia.min.js": 60,
  "pq-trivia.core.min.js": 18,
  "multiplayer.js": 12,
  "animations.js": 6,
  "editor.js": 45,
};

let failures = 0;
let checked = 0;

const files = await readdir(OUT_DIR).catch(() => [] as string[]);
for (const file of files.sort()) {
  if (!file.endsWith(".js")) {
    continue;
  }
  const bytes = await Bun.file(join(OUT_DIR, file)).arrayBuffer();
  const gzipped = Bun.gzipSync(new Uint8Array(bytes)).byteLength;
  const kib = gzipped / 1024;
  const budget = BUDGETS[file];
  checked += 1;

  if (budget === undefined) {
    console.log(`${file.padEnd(24)} ${kib.toFixed(1)} KB  (no budget)`);
    continue;
  }

  const over = kib > budget;
  if (over) {
    failures += 1;
  }
  const mark = over ? "over" : "ok";
  console.log(
    `${file.padEnd(24)} ${kib.toFixed(1)} KB / ${budget} KB  ${mark}`,
  );
}

if (checked === 0) {
  console.error("No artifacts in dist/v3. Run `bun run build` first.");
  process.exit(1);
}

if (failures > 0) {
  console.error(`\n${failures} artifact(s) over budget.`);
  process.exit(1);
}

console.log("\nBudgets hold.");
