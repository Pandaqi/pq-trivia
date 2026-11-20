import { describe, expect, test } from "bun:test";
import {
  importContent,
  importFormatOf,
  ImportFormat,
} from "../../src/core/content/import";
import { buildQuiz } from "../../src/core/model/quiz";

const csv = `question,answer,type,score,round
Capital of France?,Paris,open,1,Geography
"Which is bigger, a whale or a cat?",whale,choice,2,Geography
`;

describe("importing a spreadsheet", () => {
  test("every row becomes a question", () => {
    const result = importContent(csv, ImportFormat.Csv);
    expect(result.questions).toBe(2);
    const quiz = buildQuiz(result.text);
    expect(quiz.questions.length).toBe(2);
    expect(quiz.rounds[0]?.name).toBe("Geography");
  });

  test("commas inside quotes stay inside the field", () => {
    const result = importContent(csv, ImportFormat.Csv);
    expect(result.text).toContain("a whale or a cat?");
  });

  test("a newline inside quotes stays in the field", () => {
    const result = importContent(
      'question,answer\nWho?,"two\nlines"\nFine?,yes\n',
      ImportFormat.Csv,
    );
    expect(result.questions).toBe(2);
    expect(result.text).toContain("two\nlines");
  });

  test("a row without a question is reported", () => {
    const result = importContent(
      "question,answer\n,orphan\nFine?,yes\n",
      ImportFormat.Csv,
    );
    expect(result.questions).toBe(1);
    expect(result.diagnostics.length).toBe(1);
    expect(result.diagnostics[0]?.message).toContain("Row 2");
  });

  test("a header with no question column stops the import", () => {
    const result = importContent("name,answer\nHi,yes\n", ImportFormat.Csv);
    expect(result.questions).toBe(0);
    expect(result.diagnostics[0]?.message).toContain("question");
  });

  test("the file extension picks the format", () => {
    expect(importFormatOf("quiz.csv")).toBe(ImportFormat.Csv);
    expect(importFormatOf("notes.md")).toBe(ImportFormat.Markdown);
  });
});

describe("importing Markdown", () => {
  const markdown = `## Who wrote Hey Jude?
- **Paul McCartney**
- John Lennon
> He gave it away, of course.

## Which album?
- Abbey Road
`;

  test("headings are questions and bullets are answers", () => {
    const result = importContent(markdown, ImportFormat.Markdown);
    expect(result.questions).toBe(2);
    const quiz = buildQuiz(result.text);
    expect(quiz.questions.length).toBe(2);
  });

  test("one hash is the quiz title, not a question", () => {
    const result = importContent(
      `# The Big Music Quiz\n\n${markdown}`,
      ImportFormat.Markdown,
    );
    expect(result.questions).toBe(2);
    const quiz = buildQuiz(result.text);
    expect(quiz.meta.title).toBe("The Big Music Quiz");
    expect(quiz.questions.length).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  test("a second title is reported, not merged", () => {
    const result = importContent(
      `# First\n\n${markdown}# Second\n\n## Another?\n- yes\n`,
      ImportFormat.Markdown,
    );
    expect(result.diagnostics.length).toBe(1);
    expect(result.text.startsWith("Quiz => First")).toBe(true);
    expect(result.text).not.toContain("Second");
  });

  test("bold means correct, and the bold goes", () => {
    const result = importContent(markdown, ImportFormat.Markdown);
    expect(result.text).toContain("Correct => Paul McCartney");
    expect(result.text).not.toContain("**");
  });

  test("a note becomes the explanation", () => {
    const result = importContent(markdown, ImportFormat.Markdown);
    expect(result.text).toContain("Explanation => He gave it away");
  });

  test("a stray line is named, not swallowed", () => {
    const result = importContent("## Q\nloose words\n", ImportFormat.Markdown);
    expect(result.diagnostics[0]?.message).toContain("Line 2");
  });
});
