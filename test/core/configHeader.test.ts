import { describe, expect, test } from "bun:test";
import { buildQuiz } from "../../src/core/model/quiz";
import { createQuiz } from "../../src/core/quiz/create";
import { ThemeMode } from "../../src/core/quiz/types";

const QUIZ = `Title => Header quiz
ShuffleQuestions => true
MediaFormats => jpg | png
Include => Author = Pandaqi | Type = Choice
FilterSections => Round two | Round five
DefaultTimer => 30
LanguageDefault => nl
ThemeMode => dark
LayoutMode => inline

## Round one

Question => First?
Answers => Yes | No
Correct => Yes
`;

describe("header settings", () => {
  test("reads booleans, lists, pairs, numbers and text", () => {
    const quiz = buildQuiz(QUIZ);

    expect(quiz.meta.config).toMatchObject({
      shuffleQuestions: true,
      mediaFormats: ["jpg", "png"],
      include: { author: "Pandaqi", type: "Choice" },
      filterSections: ["Round two", "Round five"],
      defaultTimer: 30,
      languageDefault: "nl",
      themeMode: "dark",
      layoutMode: "inline",
    });
  });

  test("a setting after a round belongs to the block, not the header", () => {
    const quiz = buildQuiz(
      QUIZ.replace("## Round one", "## Round one\n\nShuffleRounds => true"),
    );

    expect(quiz.meta.config["shuffleRounds"]).toBeUndefined();
  });

  test("header settings still work without a round", () => {
    const quiz = buildQuiz(`Title => Solo
ThemeMode => light

### Question one
Answers => A | B
Correct => A
`);

    expect(quiz.meta.config["themeMode"]).toBe("light");
    expect(quiz.rounds.map((round) => round.name)).toEqual(["General"]);
  });

  test("the theme audit can be turned off in the header", () => {
    const quiz = buildQuiz(
      "Title => Quiet\nThemeAudit => false\n\n## Round one\nQuestion => Q\nAnswers => A\n",
    );
    expect(quiz.meta.config["themeAudit"]).toBe(false);
  });

  test("code wins over the file", async () => {
    const quiz = createQuiz({ config: { languageDefault: "en" } });
    await quiz.load({ type: "text", text: QUIZ });

    expect(quiz.config.languageDefault).toBe("en");
    expect(quiz.config.themeMode).toBe(ThemeMode.Dark);
  });
});
