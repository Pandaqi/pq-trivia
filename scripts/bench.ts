/**
 * Benchmark. Run it when something feels slow, not on every save.
 *
 *   bun run bench
 *
 * Ten thousand questions through parse, model, plan and grade. The numbers on
 * your machine are the only numbers that matter.
 */

import { gradeAttempt } from "../src/core/grading/report";
import { buildQuiz } from "../src/core/model/quiz";
import { QuestionType } from "../src/core/model/question";
import { planQuiz } from "../src/core/plan/plan";
import { createQuiz } from "../src/core/quiz";
import {
  ResponseKind,
  type Response,
} from "../src/core/session/responses";

const QUESTIONS = 10_000;
const ROUND_SIZE = 50;

function quizText(count: number): string {
  const lines: string[] = [
    "Title => Benchmark",
    "Syntax => 3",
    "Seed => bench",
    "",
  ];
  for (let index = 0; index < count; index += 1) {
    if (index % ROUND_SIZE === 0) {
      lines.push(`# Round ${index / ROUND_SIZE + 1}`, "");
    }
    if (index % 3 === 0) {
      lines.push(
        `Question => Which answer is number ${index}?`,
        "Answers => Alpha | Beta | Gamma",
        "Type => Choice",
        "Correct => Beta",
        "Explanation => Because the benchmark says so.",
        "",
      );
      continue;
    }
    lines.push(
      `Question => Question ${index} wants a number.`,
      `Answers => ${index}`,
      "Type => Range",
      "Range => 0",
      "Timer => 30s",
      "",
    );
  }
  return lines.join("\n");
}

function timed<T>(label: string, run: () => T): T {
  const start = performance.now();
  const value = run();
  const ms = performance.now() - start;
  console.log(`${label.padEnd(28)} ${ms.toFixed(0)} ms`);
  return value;
}

const text = quizText(QUESTIONS);
console.log(
  `Benchmark: ${QUESTIONS} questions, ${(text.length / 1024).toFixed(0)} KB of text.\n`,
);

const quiz = timed("parse and build", () => buildQuiz(text));
const plan = timed("plan", () => planQuiz(quiz));

const entries: Record<string, Response> = {};
for (const question of plan.questions) {
  entries[question.id] =
    question.type === QuestionType.Range
      ? { kind: ResponseKind.Range, value: 1 }
      : { kind: ResponseKind.Choice, selected: [] };
}
timed("grade every question", () =>
  gradeAttempt(plan, entries, { title: "Benchmark" }),
);

timed("mount and destroy 100x", () => {
  for (let index = 0; index < 100; index += 1) {
    const session = createQuiz();
    session.destroy();
  }
});

console.log(`\nPlan: ${plan.total} questions, ${plan.rounds.length} rounds.`);
console.log("Budgets in the roadmap: 10k questions navigate smoothly.");
