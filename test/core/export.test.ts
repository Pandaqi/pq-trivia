import { describe, expect, test } from "bun:test";
import { expandIncludes } from "../../src/core/content/include";
import { escapeCsv, gradesCsv, questionsCsv } from "../../src/core/export/csv";
import { toGift } from "../../src/core/export/gift";
import { fromQuizJson, toQuizJson } from "../../src/core/export/json";
import {
  buildPrintModel,
  PrintPageKind,
} from "../../src/core/export/printModel";
import { toQti } from "../../src/core/export/qti";
import { toStandaloneHtml } from "../../src/core/export/standalone";
import { gradeAttempt } from "../../src/core/grading/report";
import { buildQuiz } from "../../src/core/model/quiz";
import { planQuiz } from "../../src/core/plan/plan";
import { createAttempt, AttemptJournal } from "../../src/core/session/attempts";
import { ResponseKind } from "../../src/core/session/responses";
import { PlayMode } from "../../src/core/session/session";
import { ScreenKind } from "../../src/core/session/viewModel";
import { MemoryStorage } from "../../src/core/session/storage";
import { createQuiz } from "../../src/core/quiz";

const TEXT = `
Title => Export Test
Description => One of each.
Seed => export-seed

# Round one

Question => Which <script>alert(1)</script> is safe?
Answers => A | B | C
Type => Choice
Correct => B
Category => Safety
Score => 2

Question => Name two colours.
Answers => Red | Blue
Type => List
Score => 2
Scoring => partial

Question => Match.
Answers => Moon ~ Night | Sun ~ Day
Type => Match
Score => 2
`;

const quiz = buildQuiz(TEXT);
const plan = planQuiz(quiz);

describe("includes", () => {
  const files = new Map([
    [
      "parts/music.trivia",
      `# Music\n\nQuestion => First band?\nAnswers => The Beatles`,
    ],
    [
      "parts/shared.trivia",
      `Quiz => Should not win\n\n# Bonus\n\nQuestion => Bonus question?\nAnswers => Yes`,
    ],
  ]);

  test("include lines are replaced by file content", () => {
    const result = expandIncludes(
      { name: "main.trivia", text: "Include => parts/music.trivia" },
      files,
    );
    expect(result.problems).toEqual([]);
    expect(result.text).toContain("Question => First band?");
    expect(result.files).toContain("parts/music.trivia");
  });

  test("a selector takes one round and drops the bank header", () => {
    const result = expandIncludes(
      { name: "main.trivia", text: "Include => parts/shared.trivia#Bonus" },
      files,
    );
    expect(result.text).toContain("Question => Bonus question?");
    expect(result.text).not.toContain("Should not win");
    expect(result.text).not.toContain("# Music");
  });

  test("a missing file is a problem, not a crash", () => {
    const result = expandIncludes(
      { name: "main.trivia", text: "Include => nope.trivia" },
      files,
    );
    expect(result.problems.length).toBe(1);
    expect(result.text.trim()).toBe("");
  });

  test("a cycle stops instead of looping forever", () => {
    const cyclic = new Map([
      ["a.trivia", "Include => b.trivia"],
      ["b.trivia", "Include => a.trivia"],
    ]);
    const result = expandIncludes(
      { name: "a.trivia", text: "Include => b.trivia" },
      cyclic,
    );
    expect(result.problems.length).toBeGreaterThan(0);
  });
});

describe("json", () => {
  test("export then import gives the same questions back", () => {
    const raw = toQuizJson(quiz);
    const back = fromQuizJson(JSON.parse(raw));
    expect(back.quiz.questions.length).toBe(quiz.questions.length);
    expect(back.quiz.questions.map((q) => q.id)).toEqual(
      quiz.questions.map((q) => q.id),
    );
    expect(back.quiz.questions[0]?.text[0]?.text).toBe(
      quiz.questions[0]?.text[0]?.text,
    );
  });

  test("compact and pretty parse the same", () => {
    const pretty = fromQuizJson(JSON.parse(toQuizJson(quiz)));
    const compact = fromQuizJson(
      JSON.parse(toQuizJson(quiz, { compact: true, pretty: false })),
    );
    expect(compact.quiz.questions.length).toBe(pretty.quiz.questions.length);
  });
});

describe("other exporters", () => {
  const report = gradeAttempt(plan, {
    [plan.questions[0]?.id ?? ""]: {
      kind: ResponseKind.Choice,
      selected: [],
    },
  });

  test("csv escapes quotes and commas", () => {
    expect(escapeCsv('He said "hi", loudly')).toBe('"He said ""hi"", loudly"');
    const csv = gradesCsv(report);
    expect(csv).toContain("Question,Number,Round");
    expect(csv).toContain("Total");
    expect(questionsCsv(plan, quiz.meta).split("\r\n").length).toBe(
      plan.questions.length + 2,
    );
  });

  test("gift keeps the right markers", () => {
    const gift = toGift(plan, quiz.meta);
    expect(gift).toContain("::Q1::");
    expect(gift).toContain("=B");
    expect(gift).toContain("~A");
    expect(gift).toContain("=Moon -> Night");
  });

  test("qti is xml with one item per question", () => {
    const qti = toQti(plan, quiz.meta);
    expect(qti.startsWith("<?xml")).toBe(true);
    expect(qti.match(/<assessmentItem /g)?.length).toBe(plan.questions.length);
  });

  test("print model has a page per stage and every question", () => {
    const document = buildPrintModel(plan, quiz.meta);
    expect(document.pages[0]?.kind).toBe(PrintPageKind.Cover);
    const questions = document.pages.flatMap((page) => page.questions);
    expect(questions.length).toBe(plan.questions.length);
    expect(document.maxScore).toBe(plan.maxScore);
  });

  test("standalone html escapes injected markup", () => {
    const html = toStandaloneHtml(plan, quiz.meta);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });
});

describe("attempts", () => {
  test("the newest unfinished attempt comes back", async () => {
    const journal = new AttemptJournal(new MemoryStorage(), "test-quiz");
    const config = {
      seed: "export-seed",
      shuffleQuestions: false,
      shuffleRounds: false,
      mode: "questions",
      restricted: false,
    };
    const fields = {
      responses: {},
      startedAt: 1,
      endedAt: null,
      report: null,
      savedAt: 100,
    };
    await journal.save(
      createAttempt("test-quiz", "Old", config, {
        ...fields,
        index: 1,
        status: "playing",
        savedAt: 10,
      }),
    );
    await journal.save(
      createAttempt("test-quiz", "New", config, {
        ...fields,
        index: 2,
        status: "playing",
        savedAt: 200,
      }),
    );
    await journal.save(
      createAttempt("test-quiz", "Done", config, {
        ...fields,
        index: 3,
        status: "finished",
        savedAt: 300,
      }),
    );
    const resumable = await journal.resumable();
    expect(resumable?.index).toBe(2);
    expect((await journal.history()).length).toBe(3);
    await journal.clear();
    expect(await journal.history()).toEqual([]);
  });

  test("a saved attempt resumes into the session", async () => {
    const journal = new AttemptJournal(new MemoryStorage(), "resume-key");
    await journal.save(
      createAttempt(
        "resume-key",
        "Resume quiz",
        {
          seed: "export-seed",
          shuffleQuestions: false,
          shuffleRounds: false,
          mode: "questions",
          restricted: false,
        },
        {
          index: 1,
          status: "playing",
          responses: {},
          startedAt: 1,
          endedAt: null,
          report: null,
          savedAt: 5,
        },
      ),
    );
    const local = createQuiz();
    local.attachAttempts(journal);
    await local.load({ type: "text", text: TEXT, file: "resume.trivia" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(local.savedAttempt()).not.toBeNull();
    expect(local.resume()).toBe(true);
    expect(local.state.index).toBe(1);
    local.destroy();
  });
});

describe("restricted mode", () => {
  test("no reveal, no answer mode, no going back", async () => {
    const local = createQuiz({ config: { restricted: true } });
    await local.load({ type: "text", text: TEXT });
    local.next();
    local.next();
    expect(local.state.index).toBe(1);
    expect(local.prev().ok).toBe(false);
    expect(local.reveal()).toBe(false);
    expect(local.setMode(PlayMode.Answers)).toBe(false);
    expect(local.currentScreen()?.kind).toBe(ScreenKind.Question);
    const screen = local.currentScreen();
    if (screen?.kind === ScreenKind.Question) {
      expect(screen.answers.every((answer) => answer.correct === null)).toBe(
        true,
      );
    }
    local.destroy();
  });
});
