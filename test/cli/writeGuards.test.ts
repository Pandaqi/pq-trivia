import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const CLI = join(ROOT, "cli", "index.ts");
const BROKEN = "test/fixtures/broken.trivia";

function run(args: readonly string[]): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, PQ_PASSPHRASE: "correct horse" },
  });
}

function guard(relative: string): string {
  const path = join(ROOT, relative);
  rmSync(path, { recursive: true, force: true });
  return path;
}

test("pack refuses a broken quiz and writes nothing", () => {
  const out = `dist/cli-guard-pack-${process.pid}`;
  const path = guard(out);
  const result = run(["pack", BROKEN, "--out", out]);
  expect(result.status).toBe(1);
  expect(String(result.stderr)).toContain("Fix the errors first");
  expect(existsSync(path)).toBe(false);
});

test("encrypt refuses a broken quiz and writes nothing", () => {
  const out = `dist/cli-guard-encrypt-${process.pid}.json`;
  const path = guard(out);
  const result = run(["encrypt", BROKEN, "--out", out]);
  expect(result.status).toBe(1);
  expect(String(result.stderr)).toContain("Fix the errors first");
  expect(existsSync(path)).toBe(false);
});
