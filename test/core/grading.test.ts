import { describe, expect, test } from "bun:test";
import { GradeKind, gradeQuestion } from "../../src/core/grading/grading";
import { normalizeText, parseNumber } from "../../src/core/grading/normalize";
import {
  GradeBand,
  gradeAttempt,
  retryIds,
} from "../../src/core/grading/report";
import { GradingMode, QuestionType } from "../../src/core/model/question";
import { buildQuiz } from "../../src/core/model/quiz";
import { planQuiz } from "../../src/core/plan/plan";
import { answerRefs } from "../../src/core/model/answers";
import {
  ResponseKind,
  defaultResponse,
  type Response,
} from "../../src/core/session/responses";

const quiz = buildQuiz(`
Question => Pick two
Answers => A | B | C
Type => Choice
Correct => A | B
Score => 2
Scoring => partial

Question => Capital of France?
Answers => Paris
AlsoAccept => City of Paris
Grading => fuzzy
Score => 1

Question => The moon landing
Answers => 1969 | Apollo 11
Type => Cloze
Score => 4
Scoring => partial

Question => Put these in order
Answers => One | Two | Three
Type => Sort
Score => 3
Scoring => per-correct

Question => Match them
Answers => A ~ 1 | B ~ 2
Type => Match
Score => 2
Scoring => partial

Question => Name three colours
Answers => Red | Green | Blue
Type => List
Score => 3
Scoring => partial

Question => Which year?
Answers => 1989
Type => Range
Range => 1
Score => 1

Question => Truly exact
Answers => Yes
Grading => exact
Score => 1
`);

const plan = planQuiz(quiz);
const [choice, open, cloze, sort, match, list, range, exact] = plan.questions;

function graded(
  question: (typeof plan.questions)[number] | undefined,
  response: Response,
): ReturnType<typeof gradeQuestion> {
  if (question === undefined) {
    throw new Error("fixture lost a question");
  }
  return gradeQuestion(question, response);
}

describe("normalization", () => {
  test("folds case, whitespace and diacritics", () => {
    expect(normalizeText("  Café   au Lait ", GradingMode.Normalized)).toBe(
      "cafe au lait",
    );
    expect(normalizeText("Café", GradingMode.Exact)).toBe("Café");
  });

  test("fuzzy drops articles and punctuation", () => {
    expect(normalizeText("The Beatles!", GradingMode.Fuzzy)).toBe("beatles");
  });

  test("parses numbers the way people type them", () => {
    expect(parseNumber("1,5")).toBe(1.5);
    expect(parseNumber("1 500")).toBe(1500);
    expect(parseNumber("-2.5")).toBe(-2.5);
    expect(parseNumber("nope")).toBeNull();
  });
});

describe("choice", () => {
  test("multi-select by ID earns partial credit", () => {
    if (choice === undefined) throw new Error("missing choice");
    const first = answerRefs(choice)[0]?.id ?? "";
    const picked = graded(choice, {
      kind: ResponseKind.Choice,
      selected: [first],
    });
    expect(picked.answered).toBe(true);
    expect(picked.points).toBe(1);
    expect(picked.kind).toBe(GradeKind.Partial);
  });

  test("two wrong picks score nothing", () => {
    if (choice === undefined) throw new Error("missing choice");
    const picked = graded(choice, {
      kind: ResponseKind.Choice,
      selected: ["nope-1", "nope-2"],
    });
    expect(picked.points).toBe(0);
    expect(picked.kind).toBe(GradeKind.Wrong);
  });

  test("nothing selected is unanswered, not wrong", () => {
    if (choice === undefined) throw new Error("missing choice");
    const picked = graded(choice, defaultResponse(choice));
    expect(picked.kind).toBe(GradeKind.Unanswered);
    expect(picked.points).toBe(0);
  });

  test("a media answer is matched by its path, not its alt text", () => {
    const media = planQuiz(
      buildQuiz(`
Question => Pick the map
Answers => map.png { alt="A map" } | other.png
Type => Choice
Correct => map.png
Score => 2
`),
    );
    const question = media.questions[0];
    if (question === undefined) throw new Error("missing media question");
    const first = answerRefs(question)[0];
    if (first === undefined) throw new Error("missing media answer");
    const picked = graded(question, {
      kind: ResponseKind.Choice,
      selected: [first.id],
    });
    expect(picked.correct).toBe(true);
    expect(picked.points).toBe(2);
  });
});

describe("open", () => {
  test("aliases and fuzzy tolerate a typo", () => {
    if (open === undefined) throw new Error("missing open");
    expect(
      graded(open, { kind: ResponseKind.Open, text: "pariss" }).correct,
    ).toBe(true);
    expect(
      graded(open, { kind: ResponseKind.Open, text: "City of Paris" }).correct,
    ).toBe(true);
    expect(
      graded(open, { kind: ResponseKind.Open, text: "Lyon" }).correct,
    ).toBe(false);
  });

  test("exact grading keeps case", () => {
    if (exact === undefined) throw new Error("missing exact");
    expect(
      graded(exact, { kind: ResponseKind.Open, text: "yes" }).correct,
    ).toBe(false);
    expect(
      graded(exact, { kind: ResponseKind.Open, text: "Yes" }).correct,
    ).toBe(true);
  });
});

describe("cloze", () => {
  test("each blank is a part, partial credit adds up", () => {
    if (cloze === undefined) throw new Error("missing cloze");
    const result = graded(cloze, {
      kind: ResponseKind.Cloze,
      blanks: ["1969", "Sputnik"],
    });
    expect(result.parts.length).toBe(2);
    expect(result.points).toBe(2);
    expect(result.kind).toBe(GradeKind.Partial);
  });
});

describe("sort", () => {
  test("by ID, not by position in a shuffled list", () => {
    if (sort === undefined) throw new Error("missing sort");
    const perfectOrder = answerRefs(sort).map((ref) => ref.id);
    const reversed = [...perfectOrder].reverse();
    const score = graded(sort, {
      kind: ResponseKind.Sort,
      order: reversed,
    });
    expect(score.parts.length).toBe(3);
    // The middle item lands in the middle either way.
    expect(score.points).toBe(3);

    const perfect = graded(sort, {
      kind: ResponseKind.Sort,
      order: perfectOrder,
    });
    expect(perfect.points).toBe(9);
    expect(perfect.correct).toBe(true);
  });
});

describe("match", () => {
  test("pairs are compared as pairs", () => {
    if (match === undefined) throw new Error("missing match");
    const perfect = graded(match, {
      kind: ResponseKind.Match,
      pairs: [
        ["A", "1"],
        ["B", "2"],
      ],
    });
    expect(perfect.points).toBe(2);
    const half = graded(match, {
      kind: ResponseKind.Match,
      pairs: [["A", "1"]],
    });
    expect(half.points).toBe(1);
    expect(half.kind).toBe(GradeKind.Partial);
  });
});

describe("list", () => {
  test("any order counts, each item once", () => {
    if (list === undefined) throw new Error("missing list");
    const result = graded(list, {
      kind: ResponseKind.List,
      items: ["Blue", "Red", "Yellow"],
    });
    expect(result.points).toBe(2);
    expect(result.parts.filter((part) => part.correct).length).toBe(2);
  });
});

describe("range", () => {
  test("the margin is included", () => {
    if (range === undefined) throw new Error("missing range");
    expect(
      graded(range, { kind: ResponseKind.Range, value: 1990 }).correct,
    ).toBe(true);
    expect(
      graded(range, { kind: ResponseKind.Range, value: 1990.5 }).correct,
    ).toBe(false);
  });
});

describe("report", () => {
  test("totals add up and retry lists every miss", () => {
    const responses = Object.fromEntries(
      plan.questions.map((question) => [
        question.id,
        defaultResponse(question),
      ]),
    );
    const report = gradeAttempt(plan, responses);
    expect(report.total).toBe(plan.questions.length);
    expect(report.maxPoints).toBe(plan.maxScore);
    expect(report.unanswered).toBe(plan.questions.length);
    expect(report.percent).toBe(0);
    expect(retryIds(report).length).toBe(plan.questions.length);
    expect(report.band).toBe(GradeBand.Practice);
  });

  test("a perfect streak run still reads as 100 percent", () => {
    const streakPlan = planQuiz(
      buildQuiz(`
Streaks => true

Question => One
Answers => A

Question => Two
Answers => B

Question => Three
Answers => C

Question => Four
Answers => D
`),
    );
    const responses: Record<string, Response> = {};
    for (const question of streakPlan.questions) {
      responses[question.id] = {
        kind: ResponseKind.Open,
        text: question.answers[0]?.text ?? "",
      };
    }
    const report = gradeAttempt(streakPlan, responses, { streaks: true });
    expect(report.points).toBeGreaterThan(report.maxPoints);
    expect(report.percent).toBe(100);
  });

  test("categories are grouped and scored separately", () => {
    const tagged = planQuiz(
      buildQuiz(`
Question => One
Answers => A
Category => History
Score => 2

Question => Two
Answers => B
Category => Music
Score => 3
`),
    );
    const report = gradeAttempt(tagged, {
      [tagged.questions[0]?.id ?? ""]: { kind: ResponseKind.Open, text: "A" },
    });
    expect(report.points).toBe(2);
    expect(report.categories.map((entry) => entry.name).sort()).toEqual([
      "History",
      "Music",
    ]);
    const history = report.categories.find((entry) => entry.name === "History");
    expect(history?.percent).toBe(100);
  });
});

test("every playable type has a grade", () => {
  for (const question of plan.questions) {
    const result = gradeQuestion(question, defaultResponse(question));
    expect(result.questionId).toBe(question.id);
    expect(result.maxPoints).toBeGreaterThanOrEqual(0);
  }
  expect(plan.questions.some((q) => q.type === QuestionType.Match)).toBe(true);
});
