import { describe, expect, test } from "bun:test";
import { createQuiz } from "../../src/core/quiz/create";
import type { QuizConfig } from "../../src/core/quiz/types";
import { PlayMode } from "../../src/core/session/session";
import { ResponseKind } from "../../src/core/session/responses";
import { questionScreen } from "../../src/core/session/viewModel";
import { defaultResponse, setOpenText } from "../../src/core/session/responses";
import { planQuiz } from "../../src/core/plan/plan";
import { buildQuiz } from "../../src/core/model/quiz";

const source = `Quiz => Play
Syntax => 3
Seed => music

Question => Who sang this?
Answers => Adele
Notes => Point at the poster on the left.
Timer => 20

Question => Pick a year
Answers => 1969 | 1970 | 1971
Correct => 1969
Type => Choice
Notes => It was the moon landing.
`;

async function loaded(
  config: QuizConfig = {},
): Promise<ReturnType<typeof createQuiz>> {
  const quiz = createQuiz({ config: { seed: "music", ...config } });
  await quiz.load({ type: "text", text: source });
  return quiz;
}

describe("presenter notes", () => {
  test("the host can read the note for the question on screen", async () => {
    const quiz = await loaded();
    quiz.goTo(0);
    expect(quiz.presenterNotes()).toEqual(["Point at the poster on the left."]);
  });

  test("the player view model never carries a note", async () => {
    const quiz = await loaded();
    quiz.goTo(0);
    const screen = quiz.currentScreen();
    expect(screen).not.toBeNull();
    expect(screen !== null && "notes" in screen).toBe(false);
  });

  test("a question without a note gives an empty list", async () => {
    const quiz = await loaded();
    const plan = quiz.state.plan;
    const id = plan?.questions[1]?.id ?? "";
    expect(quiz.presenterNotes(id)).toEqual(["It was the moon landing."]);
  });
});

describe("lifelines through the API", () => {
  test("50/50 is allowed and takes two answers away", async () => {
    const quiz = await loaded({ lifelines: ["50/50"] });
    quiz.goTo(1);
    expect(quiz.useLifeline("50/50")).toBe(true);
    expect(quiz.eliminated().length).toBe(2);
  });

  test("using it twice in one question changes nothing", async () => {
    const quiz = await loaded({ lifelines: ["50/50"] });
    quiz.goTo(1);
    quiz.useLifeline("50/50");
    expect(quiz.useLifeline("50/50")).toBe(false);
  });

  test("extra time needs a timer to buy time on", async () => {
    const quiz = await loaded({ lifelines: ["extra-time", "50/50"] });
    quiz.goTo(1);
    expect(quiz.useLifeline("extra-time")).toBe(false);
    quiz.goTo(0);
    expect(quiz.useLifeline("extra-time")).toBe(true);
  });

  test("restricted mode turns every lifeline off", async () => {
    const quiz = await loaded({ lifelines: ["50/50"], restricted: true });
    quiz.goTo(1);
    expect(quiz.useLifeline("50/50")).toBe(false);
  });
});

describe("undo through the API", () => {
  test("one step back on the answer just given", async () => {
    const quiz = await loaded();
    quiz.goTo(0);
    const id = quiz.state.plan?.questions[0]?.id ?? "";
    const question = quiz.state.plan?.questions[0];
    if (question === undefined) {
      throw new Error("no question");
    }
    expect(quiz.canUndo()).toBe(false);
    quiz.setResponse(id, {
      ...defaultResponse(question),
      kind: ResponseKind.Open,
      text: "Adele",
    });
    expect(quiz.canUndo()).toBe(true);
    expect(quiz.undo()).toBe(true);
    expect(quiz.state.responses[id]).toEqual(defaultResponse(question));
  });
});

describe("teams through the API", () => {
  test("a team name list starts team play", async () => {
    const quiz = await loaded();
    expect(quiz.standings()).toEqual([]);
    const names = quiz.setTeams(["Red", "Blue"]);
    expect(names).toEqual(["Red", "Blue"]);
    expect(quiz.state.team).toBe(0);
    expect(quiz.standings().length).toBe(2);
  });

  test("switching teams keeps each set of answers", async () => {
    const quiz = await loaded();
    quiz.setTeams(["Red", "Blue"]);
    const id = quiz.state.plan?.questions[0]?.id ?? "";
    const question = quiz.state.plan?.questions[0];
    if (question === undefined) {
      throw new Error("no question");
    }
    quiz.setResponse(id, {
      ...defaultResponse(question),
      kind: ResponseKind.Open,
      text: "Adele",
    });
    expect(quiz.setActiveTeam(1)).toBe(1);
    expect(quiz.state.responses[id]).toEqual(defaultResponse(question));
    quiz.setActiveTeam(0);
    expect(quiz.state.responses[id]).toMatchObject({ text: "Adele" });
  });
});

describe("team start", () => {
  test("names become teams, and each keeps its own sheet", async () => {
    const quiz = await loaded();
    expect(quiz.setTeams([" Red ", "Blue", "red", ""])).toEqual([
      "Red",
      "Blue",
      "red 2",
    ]);

    // The start screen's path: teams first, then play.
    quiz.setMode(PlayMode.Questions);
    quiz.setInteractive(true);
    quiz.next();
    expect(quiz.state.teams.map((team) => team.name)).toEqual([
      "Red",
      "Blue",
      "red 2",
    ]);
    expect(quiz.state.team).toBe(0);

    const question = quiz.state.plan?.questions[0];
    if (question === undefined) {
      throw new Error("no question");
    }
    quiz.setResponse(
      question.id,
      setOpenText(defaultResponse(question), "Adele"),
    );

    // A switch stashes Red's sheet and loads Blue's.
    expect(quiz.setActiveTeam(1)).toBe(1);
    quiz.setResponse(question.id, setOpenText(defaultResponse(question), "no"));

    const rows = quiz.standings();
    expect(rows[0]?.name).toBe("Red");
    expect(rows[0]?.points).toBeGreaterThan(0);
    expect(rows[1]?.name).toBe("Blue");
    expect(rows[1]?.points).toBe(0);
  });
});

describe("lifelines belong to a team", () => {
  test("one team's 50/50 does not spend the next team's", async () => {
    const quiz = await loaded({ lifelines: ["50/50"] });
    quiz.goTo(1);
    quiz.setTeams(["Red", "Blue"]);
    expect(quiz.useLifeline("50/50")).toBe(true);
    expect(quiz.eliminated().length).toBe(2);
    quiz.setActiveTeam(1);
    expect(quiz.eliminated()).toEqual([]);
    expect(quiz.useLifeline("50/50")).toBe(true);
    quiz.setActiveTeam(0);
    expect(quiz.useLifeline("50/50")).toBe(false);
    expect(quiz.standings().length).toBe(2);
  });
});

describe("leaving team mode", () => {
  test("back to solo drops the teams and the board", async () => {
    const quiz = await loaded();
    quiz.setTeams(["Red", "Blue"]);
    quiz.goTo(0);
    quiz.stopTeams();
    expect(quiz.state.teams).toEqual([]);
    expect(quiz.state.team).toBe(-1);
    expect(quiz.standings()).toEqual([]);
  });
});

describe("lifelines never go below zero", () => {
  test("a two point lifeline on a one point question leaves zero", async () => {
    const quiz = await loaded({ lifelines: ["ask-room"] });
    quiz.goTo(0);
    expect(quiz.useLifeline("ask-room")).toBe(true);
    const question = quiz.state.plan?.questions[0];
    if (question === undefined) {
      throw new Error("no question");
    }
    quiz.setResponse(
      question.id,
      setOpenText(defaultResponse(question), "Adele"),
    );
    const row = quiz
      .grade()
      ?.questions.find((entry) => entry.id === question.id);
    expect(row?.correct).toBe(true);
    expect(row?.points).toBe(0);
  });
});

describe("clocks", () => {
  test("nothing is counting before the quiz starts", async () => {
    const quiz = await loaded({ quizLimit: 60_000 });
    expect(quiz.elapsed()).toBeNull();
    expect(quiz.quizRemaining()).toBeNull();
    expect(quiz.roundRemaining()).toBeNull();
  });

  test("a round timer counts from the first question of the round", async () => {
    const quiz = createQuiz({ config: { seed: "music", roundTimer: 300_000 } });
    await quiz.load({ type: "text", text: source });
    quiz.goTo(0);
    const plan = quiz.state.plan;
    const started = quiz.state.roundStartedAt;
    expect(started).not.toBeNull();
    expect(quiz.roundRemaining((started ?? 0) + 60_000)).toBe(240_000);
    expect(plan?.rounds[0]?.roundTimerMs).toBe(300_000);
  });
});

describe("pools in the report", () => {
  test("the report says which questions were drawn", () => {
    const quiz = buildQuiz(source);
    const plan = planQuiz(quiz, { seed: "music", poolSize: 1 });
    expect(plan.rounds[0]?.drawn.length).toBe(1);
  });
});

describe("questionScreen still builds with notes present", () => {
  test("a question with a note renders as before", async () => {
    const quiz = await loaded();
    const plan = quiz.state.plan;
    const question = plan?.questions[0];
    if (plan === null || question === undefined) {
      throw new Error("no plan");
    }
    const screen = questionScreen(
      question,
      { ...quiz.state, plan, index: 0 },
      {
        index: 0,
        total: plan.total,
        progress: { index: 0, total: plan.total, answered: 0, percent: 0 },
        roundName: null,
        roundSecret: null,
        roundNumber: null,
        roundPosition: 1,
        roundQuestionCount: 1,
        roundPoints: 1,
        seed: plan.seed,
        isRoundStart: true,
        authorsDiverse: false,
        categoriesDiverse: false,
      },
    );
    expect(screen.id).toBe(question.id);
    expect("notes" in screen).toBe(false);
  });
});
