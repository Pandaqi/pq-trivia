import { describe, expect, test } from "bun:test";
import { buildQuiz } from "../../src/core/model/quiz";
import { QuestionType } from "../../src/core/model/question";
import { gradeQuestion } from "../../src/core/grading/grading";
import { GradeKind } from "../../src/core/grading/types";
import {
  defineQuestionType,
  QuestionTypeRegistry,
} from "../../src/core/grading/plugins";
import { createQuiz } from "../../src/core/quiz/create";
import { ResponseKind } from "../../src/core/session/responses";
import {
  syntaxWarning,
  DiagnosticCodes,
} from "../../src/core/syntax/diagnostics";

const SOURCE = `Quiz => Plugins
Syntax => 3

Question => Is the sky blue?
Answers => yes | no
Correct => yes
Score => 2
Type => Confidence
`;

/** A tiny type: tap "sure" and the question is worth its points. */
const confidence = defineQuestionType({
  id: "confidence",
  label: "Confidence",
  grade(question, response) {
    const value =
      response.kind === ResponseKind.Custom
        ? (response.value as { sure?: unknown } | null)
        : null;
    const sure = value?.sure === true;
    return {
      points: sure ? question.score : 0,
      correct: sure,
      normalizedGiven: sure ? ["sure"] : ["not sure"],
      normalizedCorrect: ["sure"],
    };
  },
  validate(_question, diagnostics) {
    diagnostics.push(
      syntaxWarning(DiagnosticCodes.InvalidValue, "Confidence checked."),
    );
  },
});

describe("question type plugins", () => {
  test("a registered type name parses as a custom question", () => {
    const quiz = buildQuiz(SOURCE, { pluginTypes: ["confidence"] });
    expect(quiz.questions[0]?.type).toBe(QuestionType.Custom);
    expect(quiz.questions[0]?.plugin).toBe("confidence");
  });

  test("an unregistered type still warns and falls back", () => {
    const quiz = buildQuiz(SOURCE);
    expect(quiz.questions[0]?.type).toBe(QuestionType.Open);
    expect(
      quiz.diagnostics.some(
        (entry) => entry.code === DiagnosticCodes.UnknownType,
      ),
    ).toBe(true);
  });

  test("a plugin grades its own response", () => {
    const registry = new QuestionTypeRegistry();
    registry.add(confidence);
    const question = buildQuiz(SOURCE, { pluginTypes: registry.ids() })
      .questions[0]!;
    const correct = gradeQuestion(
      question,
      { kind: ResponseKind.Custom, value: { sure: true } },
      { plugins: registry },
    );
    expect(correct.points).toBe(2);
    expect(correct.correct).toBe(true);
    expect(correct.kind).toBe(GradeKind.Correct);

    const wrong = gradeQuestion(
      question,
      { kind: ResponseKind.Custom, value: { sure: false } },
      { plugins: registry },
    );
    expect(wrong.points).toBe(0);
    expect(wrong.answered).toBe(true);
  });

  test("the quiz API registers a type before loading", async () => {
    const quiz = createQuiz();
    const remove = quiz.registerQuestionType(confidence);
    await quiz.load({ type: "text", text: SOURCE });
    const id = quiz.state.plan?.questions[0]?.id ?? "";
    quiz.setResponse(id, { kind: ResponseKind.Custom, value: { sure: true } });
    expect(quiz.grade()?.points).toBe(2);
    expect(
      quiz
        .diagnostics()
        .some((entry) => entry.message === "Confidence checked."),
    ).toBe(true);
    remove();
    expect(quiz.questionTypes.ids()).toEqual([]);
    quiz.destroy();
  });

  test("a plugin id has to look like a type name", () => {
    expect(() =>
      defineQuestionType({ ...confidence, id: "Not A Type" }),
    ).not.toThrow();
    expect(() =>
      defineQuestionType({ ...confidence, id: "9 lives" }),
    ).toThrow();
    expect(defineQuestionType({ ...confidence, id: "Foo Bar" }).id).toBe(
      "foo-bar",
    );
  });
});
