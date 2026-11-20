import { describe, expect, test } from "bun:test";
import { buildQuiz } from "../../src/core/model/quiz";
import { planQuiz } from "../../src/core/plan/plan";
import { gradeAttempt } from "../../src/core/grading/report";
import { createAttempt } from "../../src/core/session/attempts";
import { ResponseKind, type Response } from "../../src/core/session/responses";
import {
  analyticsCsv,
  attemptSummary,
  questionStats,
} from "../../src/core/export/analytics";

const SOURCE = `Quiz => Class
Syntax => 3

Question => One
Answers => a
Correct => a

Question => Two
Answers => b
Correct => b
`;

function attempt(
  answers: Readonly<Record<string, string>>,
): ReturnType<typeof createAttempt> {
  const plan = planQuiz(buildQuiz(SOURCE));
  const responses: Record<string, Response> = {};
  for (const question of plan.questions) {
    responses[question.id] = {
      kind: ResponseKind.Open,
      text: answers[question.id] ?? "",
    };
  }
  const report = gradeAttempt(plan, responses, { title: "Class" });
  return createAttempt(
    "class",
    "Class",
    {
      seed: "class",
      shuffleQuestions: false,
      shuffleRounds: false,
      mode: "questions",
      restricted: false,
    },
    {
      index: plan.questions.length,
      status: "finished",
      responses,
      startedAt: 0,
      endedAt: 1000,
      report,
      savedAt: 1000,
    },
  );
}

describe("attempt analytics", () => {
  const questions = planQuiz(buildQuiz(SOURCE)).questions;
  const first = questions[0]?.id ?? "";
  const second = questions[1]?.id ?? "";
  const records = [
    attempt({ [first]: "a", [second]: "b" }),
    attempt({ [first]: "a" }),
  ];

  test("per-question counts add up", () => {
    const stats = questionStats(records);
    expect(stats.length).toBe(2);
    expect(stats[0]?.attempts).toBe(2);
    expect(stats[0]?.correct).toBe(2);
    expect(stats[1]?.attempts).toBe(2);
    expect(stats[1]?.correct).toBe(1);
    expect(stats[1]?.correctPercent).toBe(50);
  });

  test("the summary counts graded attempts", () => {
    const summary = attemptSummary(records);
    expect(summary.attempts).toBe(2);
    expect(summary.finished).toBe(2);
    expect(summary.questions).toBe(2);
    expect(summary.bestPercent).toBe(100);
  });

  test("the CSV has a summary and one row per question", () => {
    const csv = analyticsCsv(records);
    const rows = csv.split("\r\n");
    expect(rows[0]).toContain("Attempts");
    expect(rows[1]).toContain("2");
    expect(csv).toContain("Question");
    expect(
      rows.filter((row) => row.includes("One") || row.includes("Two")).length,
    ).toBe(2);
  });

  test("no attempts is an empty table, not a crash", () => {
    const csv = analyticsCsv([]);
    expect(csv).toContain("Attempts");
    expect(questionStats([])).toEqual([]);
  });
});
