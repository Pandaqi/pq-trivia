import { describe, expect, test } from "bun:test";
import { createQuiz } from "../../src/core/quiz/create";
import {
  languageFromFile,
  mergeModels,
  splitByLanguage,
} from "../../src/core/quiz/languages";
import { translate } from "../../src/i18n/dictionary";
import { buildQuiz } from "../../src/core/model/quiz";
import { ResponseKind } from "../../src/core/session/responses";

const EN = `## Round
Question => Which sea flooded in 1953?
ID => flood
Answers => North Sea
Question => What is the capital of the Netherlands?
ID => capital
Answers => Amsterdam
`;

const NL = `## Round
Question => Welke zee overstroomde in 1953?
ID => flood
Language => NL
Answers => Noordzee
Question => Wat is de hoofdstad van Nederland?
ID => capital
Language => NL
Answers => Amsterdam
`;

describe("language files", () => {
  test("the filename carries the language", () => {
    expect(languageFromFile("questions.nl.trivia")).toBe("NL");
    expect(languageFromFile("questions.en.md")).toBe("EN");
    expect(languageFromFile("quiz.trivia")).toBeNull();
  });

  test("both files load, and switching keeps an answer", async () => {
    const quiz = createQuiz({
      config: {
        languageDefault: "EN",
        seed: "lang",
        addMissingSectionScreens: false,
      },
    });
    await quiz.load({
      type: "files",
      files: [
        { name: "quiz.en.trivia", text: EN },
        { name: "quiz.nl.trivia", text: NL },
      ],
    });
    expect(quiz.languages()).toEqual(["EN", "NL"]);
    expect(quiz.state.language).toBe("EN");
    expect(quiz.t("next")).toBe("Next");
    const first = quiz.state.plan?.questions[0];
    expect(first?.text[0]?.text).toBe("Which sea flooded in 1953?");
    if (first !== undefined) {
      quiz.setResponse(first.id, {
        kind: ResponseKind.Open,
        text: "North Sea",
      });
    }
    expect(quiz.setLanguage("NL")).toBe(true);
    expect(quiz.t("next")).toBe("Volgende");
    const translated = quiz.state.plan?.questions[0];
    expect(translated?.text[0]?.text).toBe("Welke zee overstroomde in 1953?");
    expect(translated?.id).toBe("flood");
    expect(quiz.state.responses["flood"]).toEqual({
      kind: ResponseKind.Open,
      text: "North Sea",
    });
  });

  test("one file can hold several languages, linked by ID", () => {
    const model = buildQuiz(`${EN}\n${NL}`, { defaultLanguage: "EN" });
    const map = splitByLanguage(model, "EN");
    expect([...map.keys()].sort()).toEqual(["EN", "NL"]);
    expect(map.get("NL")?.questions[0]?.text[0]?.text).toBe(
      "Welke zee overstroomde in 1953?",
    );
  });

  test("another language does not silently fall back", () => {
    expect(translate("de", "next")).toBe("next");
    expect(translate("nl", "next")).toBe("Volgende");
  });

  test("a host can replace one UI string", async () => {
    const quiz = createQuiz({
      config: {
        languageDefault: "NL",
        translations: { nl: { next: "Verder" } },
      },
    });
    await quiz.load({
      type: "text",
      text: "Question => Een\nAnswers => 1",
      file: "quiz.nl.trivia",
    });
    expect(quiz.t("next")).toBe("Verder");
    expect(quiz.t("previous")).toBe("Vorige");
  });

  test("sync copies a score that the translation left alone", async () => {
    const quiz = createQuiz({
      config: {
        languageDefault: "EN",
        syncPropertiesWithTranslations: true,
        addMissingSectionScreens: false,
      },
    });
    await quiz.load({
      type: "files",
      files: [
        {
          name: "quiz.en.trivia",
          text: "## R\nQuestion => One\nAnswers => 1\nScore => 3\n",
        },
        {
          name: "quiz.nl.trivia",
          text: "## R\nQuestion => Een\nAnswers => 1\n",
        },
      ],
    });
    const before = quiz.state.plan?.questions[0]?.score;
    quiz.setLanguage("NL");
    expect(before).toBe(3);
    expect(quiz.state.plan?.questions[0]?.score).toBe(3);
  });

  test("models merge across files of one language", async () => {
    const root = buildQuiz(`## R\nQuestion => One\nScore => 3\n`, {
      defaultLanguage: "EN",
    });
    const child = buildQuiz(`## R\nQuestion => Een\n`, {
      defaultLanguage: "NL",
    });
    const merged = mergeModels([root, child]);
    expect(merged.questions).toHaveLength(2);
  });
});
