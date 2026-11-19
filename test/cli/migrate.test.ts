import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const CLI = join(ROOT, "cli", "index.ts");
const NAME = `dist/migrate-headings-${process.pid}.trivia`;
const PATH = join(ROOT, NAME);
const DOC_NAME = `dist/migrate-headings-docs-${process.pid}.md`;
const DOC_PATH = join(ROOT, DOC_NAME);
const AMBIGUOUS_NAME = `dist/migrate-headings-ambiguous-${process.pid}.trivia`;
const AMBIGUOUS_PATH = join(ROOT, AMBIGUOUS_NAME);

const DOC = `# Settings

## Options

Options => yes
`;

const AMBIGUOUS = `# Friday Night

Question => Which band?
Answers => Queen
`;

const LOOSE_V3 = `# Friday Night
Question => Which band?
Answers => Queen
`;

const LEGACY = `Title => Old one

## Which band wrote "Bohemian Rhapsody"?
### Answers
Queen

# Round two

Question => In which year did the Berlin Wall fall?
Answers => 1989
`;

function run(args: readonly string[]): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

function clean(): void {
  if (!existsSync(join(ROOT, "dist"))) {
    return;
  }
  for (const name of readdirSync(join(ROOT, "dist"))) {
    if (name.startsWith("migrate-headings-")) {
      rmSync(join(ROOT, "dist", name), { force: true });
    }
  }
}

test("migrate --headings converts old heading levels", () => {
  clean();
  writeFileSync(PATH, LEGACY, "utf8");
  try {
    const check = run(["migrate", NAME, "--headings", "--check"]);
    expect(check.status).toBe(1);
    expect(readFileSync(PATH, "utf8")).toBe(LEGACY);

    const write = run(["migrate", NAME, "--headings", "--write"]);
    expect(write.status).toBe(0);

    const migrated = readFileSync(PATH, "utf8");
    expect(migrated).toContain("### Which band wrote");
    expect(migrated).toContain("#### Answers");
    expect(migrated).toContain("## Round two");
    expect(migrated).toContain("Title => Old one");
  } finally {
    clean();
  }
});

test("migrate --headings skips a Markdown document", () => {
  clean();
  writeFileSync(DOC_PATH, DOC, "utf8");
  try {
    const result = run(["migrate", DOC_NAME, "--headings", "--write"]);
    expect(result.status).toBe(0);
    expect(readFileSync(DOC_PATH, "utf8")).toBe(DOC);
    expect(`${result.stdout}${result.stderr}`).toContain("not a quiz");
  } finally {
    clean();
  }
});

test("format leaves ambiguous headings alone", () => {
  clean();
  writeFileSync(AMBIGUOUS_PATH, AMBIGUOUS, "utf8");
  try {
    const result = run(["format", AMBIGUOUS_NAME, "--write"]);
    expect(result.status).toBe(0);
    expect(readFileSync(AMBIGUOUS_PATH, "utf8")).toBe(AMBIGUOUS);
    const message = `${result.stdout}${result.stderr}`;
    expect(message).toContain("ambiguous");
    expect(message).toContain("--from-v2");
    expect(message).toContain("--from-v3");
    expect(message).toContain("--current");
  } finally {
    clean();
  }
});

test("format --from-v3 formats a lone V3 title", () => {
  clean();
  writeFileSync(AMBIGUOUS_PATH, LOOSE_V3, "utf8");
  try {
    const result = run(["format", AMBIGUOUS_NAME, "--from-v3", "--write"]);
    expect(result.status).toBe(0);
    expect(readFileSync(AMBIGUOUS_PATH, "utf8")).toBe(AMBIGUOUS);

    writeFileSync(AMBIGUOUS_PATH, LOOSE_V3, "utf8");
    const alias = run(["format", AMBIGUOUS_NAME, "--current", "--write"]);
    expect(alias.status).toBe(0);
    expect(readFileSync(AMBIGUOUS_PATH, "utf8")).toBe(AMBIGUOUS);
  } finally {
    clean();
  }
});
