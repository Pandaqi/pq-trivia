/**
 * Gzip budgets. Cheap to check, easy to break, worth keeping honest.
 *
 * Release-time, not on every save.
 */

import { readdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const OUT_DIR = join(ROOT, "dist", "v3");

/**
 * Kilobytes of gzipped JavaScript.
 *
 * The original core budget was 15 KB. Grading, policies, timers, flow control
 * and saved attempts live in core because the CLI and the player both need
 * them. Measured split: parse + model + plan 11 KB, plus session and grading
 * 17 KB, full core 23 KB. V2's config doors (default timer, secret questions,
 * a global formatting switch) add a little, hence 25. The player carries
 * Preact, the unlock screen, Web Crypto, timer sounds and the handout exporter,
 * hence 48. Theme folders add the picker and the runtime, hence 52.
 */
const BUDGETS: Readonly<Record<string, number>> = {
  "core.js": 24,
  // Core plus `createQuiz`. Not in the spec budget list, but worth watching.
  "headless.js": 27,
  "player.js": 52,
  "pq-trivia.js": 55,
  "pq-trivia.min.js": 60,
  "pq-trivia.core.min.js": 26,
  // The separate live bundle. Preact is already in the player, but a host page
  // that only runs a lobby should not need the whole player. The join QR is
  // generated in the browser by `uqr`, which loads as its own chunk: a lobby
  // that never shows a QR never downloads the encoder.
  "multiplayer.js": 22,
  // Optional extras: worker parser, IndexedDB cache, manifest loading.
  "browser.js": 8,
  "parse.worker.js": 5,
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
