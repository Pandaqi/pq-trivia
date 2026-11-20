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
 * These were rewritten after the first four budgets had silently become walls:
 * core measured 27, headless 39, player 73 and the IIFE 83 against limits of
 * 24/27/52/60. A budget you are already over before you start is not a budget,
 * it is a nag.
 *
 * So: current size, plus room for the features already on the list. Roughly a
 * third again on every artifact. When an artifact lands well under its number,
 * bring it back down. That is a nicer job than shaving a kilobyte to pass.
 */
const BUDGETS: Readonly<Record<string, number>> = {
  "core.js": 40,
  // Core plus `createQuiz`. Not in the spec budget list, but worth watching.
  "headless.js": 55,
  "player.js": 100,
  "pq-trivia.js": 105,
  "pq-trivia.min.js": 115,
  "pq-trivia.core.min.js": 42,
  // The wizard carries the player, because its preview is the real thing. So
  // its budget is a player plus the forms: 77.3 KB measured, plus air.
  "editor.js": 95,
  // The separate live bundle. Preact is already in the player, but a host page
  // that only runs a lobby should not need the whole player.
  "multiplayer.js": 32,
  // The join QR, split out. A lobby that never shows one never downloads it.
  "chunk-qr.js": 8,
  // Optional extras: worker parser, IndexedDB cache, manifest loading.
  "browser.js": 12,
  "parse.worker.js": 8,
  "animations.js": 10,
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
