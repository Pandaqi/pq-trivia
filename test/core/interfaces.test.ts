import { describe, expect, test } from "bun:test";
import { GradeKind, gradeQuestion } from "../../src/core/grading/grading";
import {
  gradeAttempt,
  WagerRisk,
  wagerRiskOf,
} from "../../src/core/grading/report";
import { stakingLimit } from "../../src/core/grading/wager";
import { gradesCsv } from "../../src/core/export/csv";
import { answerRefs } from "../../src/core/model/answers";
import { buildQuiz } from "../../src/core/model/quiz";
import {
  QuestionType,
  type QuestionModel,
} from "../../src/core/model/question";
import { planQuiz } from "../../src/core/plan/plan";
import {
  Confidence,
  ResponseKind,
  defaultResponse,
  type Response,
} from "../../src/core/session/responses";
import {
  createSessionState,
  sessionReducer,
} from "../../src/core/session/session";

const quiz = buildQuiz(`
Question => Pick the false one
Answers => True | Also true | False
Type => Choice
Correct => True | Also true
Negate => true
Score => 2

Question => How heavy
Answers => 42
Type => Estimate
Tolerance => 2
Unit => kg
Score => 1

Question => Rank these
Answers => One | Two | Three
Type => Rank
Score => 3

Question => Odd one out
Answers => Cat | Dog | Banana
Type => OddOneOut
Correct => Banana
AlsoAccept => a banana is not an animal
Score => 2

Question => Where is it
Media => map.png
Answers => 40,60
Type => Hotspot
HitRadius => 5
Score => 1

Question => Mark the rows
Type => Matrix
Answers => True | False
Rows => Sky is blue | Water is dry
Correct => True | False
Score => 2

Question => Fill both
Type => Parts
Parts => open: Capital: 2 | number: Year: 1
Answers => Paris || 1999
Score => 3

Question => Which bucket
Type => Classification
Answers => Apple | Banana
Buckets => Fruit | Vegetable
Correct => Apple @ Fruit | Banana @ Fruit
Score => 2

Question => Place the labels
Type => Diagram
Media => map.png
Answers => Door | Window
Targets => Front @ 20,30 | Side @ 70,40
Correct => Door @ Front | Window @ Side
Score => 2
`);

const plan = planQuiz(quiz);

function question(type: QuestionType): (typeof plan.questions)[number] {
  const found = plan.questions.find((entry) => entry.type === type);
  if (found === undefined) {
    throw new Error(`fixture lost its ${type} question`);
  }
  return found;
}

function grade(
  type: QuestionType,
  response: Response,
): ReturnType<typeof gradeQuestion> {
  return gradeQuestion(question(type), response);
}

function ids(type: QuestionType): string[] {
  return answerRefs(question(type)).map((ref) => ref.id);
}

describe("negation", () => {
  test("the one false option is the answer", () => {
    const refs = ids(QuestionType.Choice);
    const result = grade(QuestionType.Choice, {
      kind: ResponseKind.Choice,
      selected: [refs[2] ?? ""],
    });
    expect(result.correct).toBe(true);
    expect(result.points).toBe(2);
  });

  test("picking a true statement is wrong", () => {
    const refs = ids(QuestionType.Choice);
    const result = grade(QuestionType.Choice, {
      kind: ResponseKind.Choice,
      selected: [refs[0] ?? ""],
    });
    expect(result.correct).toBe(false);
    expect(result.points).toBe(0);
  });
});

describe("estimate", () => {
  test("the tolerance edges count", () => {
    expect(
      grade(QuestionType.Estimate, { kind: ResponseKind.Range, value: 42 })
        .correct,
    ).toBe(true);
    expect(
      grade(QuestionType.Estimate, { kind: ResponseKind.Range, value: 44 })
        .correct,
    ).toBe(true);
    expect(
      grade(QuestionType.Estimate, { kind: ResponseKind.Range, value: 44.5 })
        .correct,
    ).toBe(false);
    expect(
      grade(QuestionType.Estimate, { kind: ResponseKind.Range, value: 40 })
        .correct,
    ).toBe(true);
    expect(
      grade(QuestionType.Estimate, { kind: ResponseKind.Range, value: 39.9 })
        .correct,
    ).toBe(false);
  });

  test("the unit is shown, never graded", () => {
    const result = grade(QuestionType.Estimate, {
      kind: ResponseKind.Range,
      value: 42,
    });
    expect(result.parts[0]?.expected).toContain("kg");
  });
});

describe("rank", () => {
  const order = ids(QuestionType.Rank);

  test("perfect order earns everything", () => {
    const result = grade(QuestionType.Rank, {
      kind: ResponseKind.Sort,
      order,
    });
    expect(result.correct).toBe(true);
    expect(result.points).toBe(3);
  });

  test("the score is the share of neighbouring pairs in order", () => {
    // Four items, so moving one leaves some pairs standing.
    const four = planQuiz(
      buildQuiz(`
Question => Rank four
Answers => A | B | C | D
Type => Rank
Score => 3
`),
    );
    const target = four.questions[0];
    if (target === undefined) throw new Error("missing four-item rank");
    const perfect = answerRefs(target).map((ref) => ref.id);
    const moved = [
      perfect[1] ?? "",
      perfect[2] ?? "",
      perfect[3] ?? "",
      perfect[0] ?? "",
    ];
    const result = gradeQuestion(target, {
      kind: ResponseKind.Sort,
      order: moved,
    });
    expect(result.correct).toBe(false);
    expect(result.points).toBe(2);
  });

  test("an empty order is unanswered", () => {
    const result = grade(QuestionType.Rank, {
      kind: ResponseKind.Sort,
      order: [],
    });
    expect(result.kind).toBe(GradeKind.Unanswered);
    expect(result.points).toBe(0);
  });

  test("a duplicate cannot fake a perfect order", () => {
    const result = grade(QuestionType.Rank, {
      kind: ResponseKind.Sort,
      order: [order[0] ?? "", order[1] ?? "", order[1] ?? ""],
    });
    expect(result.correct).toBe(false);
  });
});

describe("odd one out", () => {
  test("the pick and the reason are two halves", () => {
    const pick = ids(QuestionType.OddOneOut)[2] ?? "";
    const full = grade(QuestionType.OddOneOut, {
      kind: ResponseKind.Reasoned,
      selected: [pick],
      reason: "A banana is not an animal",
    });
    expect(full.correct).toBe(true);
    expect(full.points).toBe(2);

    const half = grade(QuestionType.OddOneOut, {
      kind: ResponseKind.Reasoned,
      selected: [pick],
      reason: "because",
    });
    expect(half.correct).toBe(false);
    expect(half.points).toBe(1);
  });
});

describe("hotspot", () => {
  test("a click inside the radius is right", () => {
    expect(
      grade(QuestionType.Hotspot, {
        kind: ResponseKind.Hotspot,
        point: { x: 42, y: 60 },
      }).correct,
    ).toBe(true);
  });

  test("a click outside the radius is wrong", () => {
    expect(
      grade(QuestionType.Hotspot, {
        kind: ResponseKind.Hotspot,
        point: { x: 50, y: 60 },
      }).correct,
    ).toBe(false);
  });

  test("no click is unanswered", () => {
    expect(
      grade(QuestionType.Hotspot, { kind: ResponseKind.Hotspot, point: null })
        .kind,
    ).toBe(GradeKind.Unanswered);
  });
});

describe("matrix", () => {
  const scale = ids(QuestionType.Matrix);

  test("each row scores on its own", () => {
    const result = grade(QuestionType.Matrix, {
      kind: ResponseKind.Matrix,
      rows: [[scale[0] ?? ""], [scale[0] ?? ""]],
    });
    expect(result.parts.length).toBe(2);
    expect(result.points).toBe(1);
    expect(result.kind).toBe(GradeKind.Partial);
  });

  test("all rows right is correct", () => {
    const result = grade(QuestionType.Matrix, {
      kind: ResponseKind.Matrix,
      rows: [[scale[0] ?? ""], [scale[1] ?? ""]],
    });
    expect(result.correct).toBe(true);
    expect(result.points).toBe(2);
  });
});

describe("parts", () => {
  test("each part keeps its own points", () => {
    const half = grade(QuestionType.Parts, {
      kind: ResponseKind.Parts,
      values: ["Lyon", "1999"],
    });
    expect(half.points).toBe(1);
    expect(half.parts.length).toBe(2);

    const full = grade(QuestionType.Parts, {
      kind: ResponseKind.Parts,
      values: ["Paris", "1999"],
    });
    expect(full.correct).toBe(true);
    expect(full.points).toBe(3);
  });

  test("an empty part list is unanswered", () => {
    expect(
      grade(QuestionType.Parts, defaultResponse(question(QuestionType.Parts)))
        .kind,
    ).toBe(GradeKind.Unanswered);
  });
});

describe("classification", () => {
  test("one item in the wrong bucket still earns the other", () => {
    const result = grade(QuestionType.Classification, {
      kind: ResponseKind.Buckets,
      placements: [
        ["Apple", "Fruit"],
        ["Banana", "Vegetable"],
      ],
    });
    expect(result.points).toBe(1);
    expect(result.kind).toBe(GradeKind.Partial);
  });

  test("both buckets right is correct", () => {
    const result = grade(QuestionType.Classification, {
      kind: ResponseKind.Buckets,
      placements: [
        ["Apple", "Fruit"],
        ["Banana", "Fruit"],
      ],
    });
    expect(result.correct).toBe(true);
    expect(result.points).toBe(2);
  });
});

describe("diagram", () => {
  test("labels are compared to their targets", () => {
    const result = grade(QuestionType.Diagram, {
      kind: ResponseKind.Match,
      pairs: [
        ["Door", "Front"],
        ["Window", "Front"],
      ],
    });
    expect(result.points).toBe(1);
  });
});

describe("session extras", () => {
  const state = sessionReducer(
    createSessionState(),
    { type: "load/success", plan },
    0,
  );
  const first = plan.questions[0];
  if (first === undefined) {
    throw new Error("fixture lost its first question");
  }

  test("confidence, no idea, wager and plays stay in the session", () => {
    const withConfidence = sessionReducer(state, {
      type: "confidence/set",
      questionId: first.id,
      level: Confidence.High,
    });
    expect(withConfidence.confidence[first.id]).toBe(Confidence.High);

    const blank = sessionReducer(withConfidence, {
      type: "noidea/set",
      questionId: first.id,
      value: true,
    });
    expect(blank.noIdea).toContain(first.id);

    const wagered = sessionReducer(blank, {
      type: "wager/set",
      questionId: first.id,
      value: 2,
    });
    expect(wagered.wagers[first.id]).toBe(2);

    const played = sessionReducer(wagered, {
      type: "media/play",
      questionId: first.id,
    });
    expect(played.mediaPlays[first.id]).toBe(1);
  });

  test("the report carries the flags and the CSV gets a column", () => {
    const report = gradeAttempt(
      plan,
      {},
      {
        noIdea: [first.id],
        confidence: { [first.id]: Confidence.Low },
        wagers: { [first.id]: 2 },
      },
    );
    expect(report.noIdea).toBe(1);
    expect(report.questions[0]?.noIdea).toBe(true);
    expect(report.questions[0]?.confidence).toBe(Confidence.Low);
    // This question has no `Wager => true`, so the number is not a bet.
    expect(report.questions[0]?.wager).toBeNull();
    expect(report.questions[0]?.wagerRisk).toBeNull();

    const csv = gradesCsv(report);
    expect(csv).toContain("Confidence");
    expect(csv).toContain("no idea");
    expect(csv).toContain("low");
  });

  test("risk is a share of the question, not a number of points", () => {
    expect(wagerRiskOf(1, 10)).toBe(WagerRisk.Low);
    expect(wagerRiskOf(5, 10)).toBe(WagerRisk.Medium);
    expect(wagerRiskOf(9, 10)).toBe(WagerRisk.High);
    expect(wagerRiskOf(0, 0)).toBe(WagerRisk.Low);
  });
});

describe("a wager", () => {
  const wagerQuiz = buildQuiz(`
Question => Warm up
Answers => A | B
Type => Choice
Correct => B
Score => 5

Question => All in
Answers => A | B
Type => Choice
Correct => B
Score => 2
Wager => true
`);
  const wagerPlan = planQuiz(wagerQuiz, { seed: "wager" });
  const warmUp = wagerPlan.questions[0];
  const question = wagerPlan.questions[1];
  if (warmUp === undefined || question === undefined) {
    throw new Error("the wager quiz lost a question");
  }

  function pick(target: QuestionModel, text: string): Response {
    const ref = answerRefs(target).find((item) => item.value.text === text);
    if (ref === undefined) {
      throw new Error(`no answer called ${text}`);
    }
    return { kind: ResponseKind.Choice, selected: [ref.id] };
  }

  test("a right answer wins the stake on top of the points", () => {
    const report = gradeAttempt(
      wagerPlan,
      { [warmUp.id]: pick(warmUp, "B"), [question.id]: pick(question, "B") },
      { wagers: { [question.id]: 2 } },
    );
    expect(report.questions[1]?.points).toBe(4);
    expect(report.questions[1]?.maxPoints).toBe(4);
    expect(report.points).toBe(9);
    expect(report.maxPoints).toBe(9);
    expect(report.percent).toBe(100);
  });

  test("a wrong answer loses the stake", () => {
    const report = gradeAttempt(
      wagerPlan,
      { [warmUp.id]: pick(warmUp, "B"), [question.id]: pick(question, "A") },
      { wagers: { [question.id]: 2 } },
    );
    expect(report.questions[1]?.points).toBe(-2);
    expect(report.points).toBe(3);
    expect(report.maxPoints).toBe(9);
  });

  test("a score never goes below zero", () => {
    const report = gradeAttempt(
      wagerPlan,
      { [question.id]: pick(question, "A") },
      { wagers: { [question.id]: 2 } },
    );
    // Nothing earned yet, so there is nothing to take.
    expect(report.questions[0]?.points).toBe(0);
    expect(report.questions[1]?.points).toBe(0);
    expect(report.points).toBe(0);
    expect(report.percent).toBe(0);
  });

  test("the stake cap is the smaller of the question and the score", () => {
    expect(stakingLimit(2, 5)).toBe(2);
    expect(stakingLimit(5, 2)).toBe(2);
    expect(stakingLimit(2.7, 5)).toBe(2);
    expect(stakingLimit(2, -1)).toBe(0);
  });

  test("a stake may not exceed the score", () => {
    const report = gradeAttempt(
      wagerPlan,
      { [question.id]: pick(question, "B") },
      { wagers: { [question.id]: 2 } },
    );
    // Nothing in the bank yet, so there is nothing to bet: just the 2 points.
    expect(report.questions[1]?.points).toBe(2);
    expect(report.questions[1]?.wager).toBeNull();
    expect(report.points).toBe(2);
    expect(report.maxPoints).toBe(7);
  });

  test("no answer means no bet", () => {
    const report = gradeAttempt(
      wagerPlan,
      { [warmUp.id]: pick(warmUp, "B") },
      { wagers: { [question.id]: 2 } },
    );
    expect(report.questions[1]?.wager).toBeNull();
    expect(report.points).toBe(5);
    expect(report.maxPoints).toBe(7);
  });

  test("a stake without the attribute is ignored", () => {
    const plain = plan.questions[0];
    if (plain === undefined) {
      throw new Error("the fixture lost its first question");
    }
    const report = gradeAttempt(
      plan,
      { [plain.id]: { kind: ResponseKind.Choice, selected: [] } },
      { wagers: { [plain.id]: 5 } },
    );
    expect(report.questions[0]?.wager).toBeNull();
    expect(report.questions[0]?.maxPoints).toBe(2);
  });
});
