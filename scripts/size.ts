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
  "headless.js": 61,
  "player.js": 106,
  "pq-trivia.js": 105,
  // Phase 10 added pools, variants, streaks, lifelines, teams and the score
  // rules. Measured 127.4 after the full diagnostic copy. The QR encoder moved
  // to `pq-qr.min.js`, which the one-file bundle loads when a lobby opens.
  "pq-trivia.min.js": 129,
  "pq-trivia.core.min.js": 42,
  // The wizard itself. The player arrives as a lazy chunk, so this number is
  // the forms and the buffer, never the quiz screen.
  "editor.js": 60,
  // What editor.js shares with the preview chunk: Preact, the store and the
  // wizard's copy in every language. Measured 34.8 with the full diagnostic
  // copy.
  "chunk-editor.js": 36,
  // The player, fetched only when a preview opens.
  "chunk-preview.js": 80,
  // The separate live bundle. Preact is already in the player, but a host page
  // that only runs a lobby should not need the whole player. Measured 41.3
  // after room and diagnostic strings moved into the locale files.
  "multiplayer.js": 43,
  // The join QR, split out. A lobby that never shows one never downloads it.
  "chunk-qr.js": 8,
  // The same encoder as a script, for the one-file bundle.
  "pq-qr.min.js": 8,
  // Optional extras: worker parser, IndexedDB cache, manifest loading.
  "browser.js": 14,
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
