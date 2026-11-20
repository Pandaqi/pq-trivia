import { describe, expect, test } from "bun:test";
import {
  cleanTeamNames,
  DEFAULT_TEAM_NAME,
  leaderOf,
  leaderboard,
  MAX_TEAMS,
  teamStandings,
} from "../../src/core/grading/teams";
import { buildQuiz } from "../../src/core/model/quiz";
import { planQuiz } from "../../src/core/plan/plan";
import { defaultResponse, setOpenText } from "../../src/core/session/responses";

const plan = planQuiz(
  buildQuiz(`Quiz => Teams
Syntax => 3

Question => Capital of France?
Answers => Paris

Question => Capital of Spain?
Answers => Madrid
`),
);

describe("team names", () => {
  test("spaces go, blanks go, repeats get a number", () => {
    expect(cleanTeamNames(["  Red  ", "", "Red", "Blue"])).toEqual([
      "Red",
      "Red 2",
      "Blue",
    ]);
  });

  test("an empty list still makes two teams", () => {
    expect(cleanTeamNames([])).toEqual([
      `${DEFAULT_TEAM_NAME} 1`,
      `${DEFAULT_TEAM_NAME} 2`,
    ]);
  });

  test("there is a limit", () => {
    const many = Array.from({ length: MAX_TEAMS + 5 }, (_, i) => `T${i}`);
    expect(cleanTeamNames(many).length).toBe(MAX_TEAMS);
  });
});

describe("standings", () => {
  const questions = plan.questions;
  const first = questions[0];
  const second = questions[1];
  if (first === undefined || second === undefined) {
    throw new Error("fixture is broken");
  }

  test("each team scores with its own answers", () => {
    const standings = teamStandings(plan, [
      { name: "Red", responses: {} },
      {
        name: "Blue",
        responses: {
          [first.id]: setOpenText(defaultResponse(first), "Paris"),
          [second.id]: setOpenText(defaultResponse(second), "Madrid"),
        },
      },
    ]);
    expect(standings[1]?.points).toBe(2);
    expect(standings[0]?.points).toBe(0);
    expect(leaderboard(standings)[0]?.name).toBe("Blue");
  });

  test("the leader is nobody when the scores are level", () => {
    const standings = teamStandings(plan, [
      { name: "Red", responses: {} },
      { name: "Blue", responses: {} },
    ]);
    expect(leaderOf(standings)).toBeNull();
  });

  test("a round carries its own numbers", () => {
    const standings = teamStandings(plan, [{ name: "Red", responses: {} }]);
    expect(standings[0]?.rounds.length).toBe(1);
    expect(standings[0]?.total).toBe(2);
  });
});
