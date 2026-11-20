import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkAssets } from "../../cli/assets";
import { buildQuiz } from "../../src/core/model/quiz";

let folder = "";

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), "pq-assets-"));
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

function quizPath(): string {
  return join(folder, "quiz.trivia");
}

async function writeQuiz(options: {
  readonly media?: string;
  readonly theme?: string;
}): Promise<string> {
  const media =
    options.media === undefined ? "" : `Media => ${options.media}\n`;
  const theme =
    options.theme === undefined ? "" : `Theme => ${options.theme}\n`;
  const text = `Title => Asset test
${theme}
Question => Which painting?
${media}Type => Open
Answers => The Starry Night
`;
  await writeFile(quizPath(), text);
  return text;
}

function quizOf(text: string): ReturnType<typeof buildQuiz> {
  return buildQuiz(text, { file: "quiz.trivia" });
}

describe("asset checking", () => {
  test("a missing media file is reported against its question", async () => {
    const text = await writeQuiz({
      media: 'media/painting.jpg { alt="A painting" }',
    });
    const report = await checkAssets(quizOf(text), quizPath());

    expect(report.checked).toBe(1);
    expect(report.problems).toHaveLength(1);
    expect(report.problems[0]?.where).toContain("question 1");
    expect(report.problems[0]?.message).toContain(
      "missing file: media/painting.jpg",
    );
  });

  test("an image without alt text is reported", async () => {
    await mkdir(join(folder, "media"), { recursive: true });
    await writeFile(join(folder, "media", "painting.jpg"), "not really a jpeg");
    const text = await writeQuiz({ media: "media/painting.jpg" });
    const report = await checkAssets(quizOf(text), quizPath());

    expect(report.problems).toHaveLength(1);
    expect(report.problems[0]?.message).toContain("image without alt text");
  });

  test("theme stylesheets, fonts and backgrounds are checked", async () => {
    await mkdir(join(folder, "themes", "demo", "fonts"), { recursive: true });
    await writeFile(
      join(folder, "themes", "demo", "theme.trivia-theme"),
      `Label => Demo
Stylesheet => style.css
Font => body | Demo | regular | fonts/demo.woff2

### Background
bg.svg
`,
    );
    const text = await writeQuiz({ theme: "demo" });
    const report = await checkAssets(quizOf(text), quizPath());
    const messages = report.problems.map((problem) =>
      problem.message.replaceAll("\\", "/"),
    );

    expect(report.theme).toBe("Demo");
    expect(messages).toContain("missing file: themes/demo/style.css");
    expect(messages).toContain("missing file: themes/demo/fonts/demo.woff2");
    expect(messages).toContain("missing file: themes/demo/bg.svg");
  });

  test("a complete quiz has no problems", async () => {
    await mkdir(join(folder, "media"), { recursive: true });
    await writeFile(join(folder, "media", "painting.jpg"), "not really a jpeg");
    const text = await writeQuiz({
      media: 'media/painting.jpg { alt="A painting" }',
    });
    const report = await checkAssets(quizOf(text), quizPath());

    expect(report.problems).toEqual([]);
    expect(report.checked).toBe(1);
  });
});

async function runValidate(file: string): Promise<{
  readonly code: number;
  readonly output: string;
}> {
  const child = Bun.spawn({
    cmd: [process.execPath, "cli/index.ts", "validate", file, "--assets"],
    cwd: join(import.meta.dir, "..", ".."),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { code, output: `${stdout}${stderr}` };
}

describe("validate --assets", () => {
  test("the per-file line says errors, not ok, when a file is missing", async () => {
    await writeQuiz({ media: 'media/painting.jpg { alt="A painting" }' });
    const result = await runValidate(quizPath());

    expect(result.code).toBe(1);
    expect(result.output).not.toContain(", ok");
    expect(result.output).toContain("missing file: media/painting.jpg");
    expect(result.output).toContain("1 error(s)");
  });

  test("a clean quiz still says ok", async () => {
    await mkdir(join(folder, "media"), { recursive: true });
    await writeFile(join(folder, "media", "painting.jpg"), "not really a jpeg");
    await writeQuiz({ media: 'media/painting.jpg { alt="A painting" }' });
    const result = await runValidate(quizPath());

    expect(result.code).toBe(0);
    expect(result.output).toContain(", ok");
    expect(result.output).toContain("assets: 1 file(s), 0 problem(s).");
  });
});
