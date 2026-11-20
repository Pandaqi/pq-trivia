import { describe, expect, test } from "bun:test";
import { buildQuiz } from "../../src/core/model/quiz";
import {
  detectHeadingStyle,
  HeadingStyle,
  looksLikeQuiz,
  migrateHeadings,
} from "../../src/core/syntax/headings";

describe("heading shorthand", () => {
  test("# is the quiz, ## the section, ### the question, #### the block", () => {
    const quiz = buildQuiz(`# The Big Quiz

## Round one

### Which band wrote "Bohemian Rhapsody"?
#### Answers
Queen
The Beatles
Correct => Queen
`);

    expect(quiz.meta.title).toBe("The Big Quiz");
    expect(quiz.rounds.map((round) => round.name)).toEqual(["Round one"]);
    expect(quiz.questions).toHaveLength(1);
    expect(quiz.questions[0]?.text[0]?.text).toBe(
      'Which band wrote "Bohemian Rhapsody"?',
    );
    expect(quiz.questions[0]?.answers.map((answer) => answer.text)).toEqual([
      "Queen",
      "The Beatles",
    ]);
  });

  test("every level is optional", () => {
    const quiz = buildQuiz(`Question => Solo
Answers => A | B
Correct => A
`);

    expect(quiz.meta.title).toBe("");
    expect(quiz.rounds.map((round) => round.name)).toEqual(["General"]);
    expect(quiz.questions).toHaveLength(1);
  });

  test("### never starts a section and ## never a question", () => {
    const quiz = buildQuiz(`## One

### First
Answers => A | B
Correct => A

### Second
Answers => C | D
Correct => C
`);

    expect(quiz.rounds.map((round) => round.name)).toEqual(["One"]);
    expect(quiz.questions).toHaveLength(2);
  });

  test("the title heading can sit above the header settings", () => {
    const quiz = buildQuiz(`# Titled
ShuffleQuestions => true

## Round
### Question
Answers => A | B
Correct => A
`);

    expect(quiz.meta.title).toBe("Titled");
    expect(quiz.meta.config["shuffleQuestions"]).toBe(true);
  });
});

describe("heading migration", () => {
  const LEGACY = `Title => Old one
Author => Pandaqi

## Which band wrote "Bohemian Rhapsody"?
### Answers
Queen
The Beatles
Correct => Queen

# Round two

Question => In which year did the Berlin Wall fall?
Answers => 1989
`;

  test("old headings are recognised", () => {
    expect(detectHeadingStyle(LEGACY)).toBe(HeadingStyle.Legacy);
  });

  test("old headings shift one level and parse", () => {
    const migrated = migrateHeadings(LEGACY);

    expect(migrated).toContain("### Which band wrote");
    expect(migrated).toContain("#### Answers");
    expect(migrated).toContain("## Round two");

    const quiz = buildQuiz(migrated);
    expect(quiz.meta.title).toBe("Old one");
    expect(quiz.rounds.map((round) => round.name)).toEqual([
      "General",
      "Round two",
    ]);
    expect(quiz.questions).toHaveLength(2);
    expect(quiz.questions[0]?.answers[0]?.text).toBe("Queen");
  });

  test("a title header plus one round is still old", () => {
    const text = `Title => Solo

# Round
Question => One?
Answers => Yes
`;
    expect(detectHeadingStyle(text)).toBe(HeadingStyle.Legacy);
    expect(migrateHeadings(text)).toContain("## Round");
  });

  test("current headings stay put", () => {
    const text = `# Friday Night

## Music

### Which band?
#### Answers
Queen
`;
    expect(detectHeadingStyle(text)).toBe(HeadingStyle.Current);
    expect(migrateHeadings(text)).toBe(text);
  });

  test("a lone # heading is ambiguous", () => {
    const text = `# Friday Night

Question => Which band?
Answers => Queen
`;
    expect(detectHeadingStyle(text)).toBe(HeadingStyle.Ambiguous);
  });

  test("a quiz has keys, a block or an include", () => {
    expect(looksLikeQuiz(LEGACY)).toBe(true);
    expect(looksLikeQuiz("Question => One?\nAnswers => Two\n")).toBe(true);
    expect(looksLikeQuiz("## Round\n### Question\n#### Answers\nA\n")).toBe(
      true,
    );
    expect(looksLikeQuiz("#include questions/one.trivia\n")).toBe(true);
  });

  test("docs without quiz content are not quizzes", () => {
    expect(looksLikeQuiz("# Settings\n\n## Options\n\nOptions => yes\n")).toBe(
      false,
    );
    expect(looksLikeQuiz("# Guide\n\n```\nAnswers => example\n```\n")).toBe(
      false,
    );
  });

  test("a # heading that repeats the title header is current", () => {
    const text = `Title => Friday Night

# Friday Night

## Music

### Which band?
Answers => Queen
`;
    expect(detectHeadingStyle(text)).toBe(HeadingStyle.Current);
  });
});
