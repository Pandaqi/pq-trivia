import { describe, expect, test } from "bun:test";
import {
  applyPointRules,
  DEFAULT_NEGATIVE_MARK,
  ScoringPreset,
  STREAK_CAP,
  STREAK_FULL,
  STREAK_MIN,
  streakMultiplier,
  type PointRules,
} from "../../src/core/grading/points";
import { part } from "../../src/core/grading/parts";

const rules = (preset: ScoringPreset, streaks = false): PointRules => ({
  preset,
  negativeMarking: DEFAULT_NEGATIVE_MARK,
  streaks,
});

const correct = {
  points: 2,
  maxPoints: 2,
  correct: true,
  answered: true,
  parts: [part("Answer", "a", "a", true, 2)],
};

const wrong = {
  points: 0,
  maxPoints: 4,
  correct: false,
  answered: true,
  parts: [part("Answer", "a", "", false, 2), part("Answer", "b", "b", true, 2)],
};

describe("streak multipliers", () => {
  test("nothing before three in a row", () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(STREAK_MIN - 1)).toBe(1);
  });

  test("half again at three, double at six", () => {
    expect(streakMultiplier(STREAK_MIN)).toBe(1.5);
    expect(streakMultiplier(STREAK_FULL)).toBe(2);
  });

  test("the cap holds forever", () => {
    expect(streakMultiplier(STREAK_FULL + 1)).toBe(STREAK_CAP);
    expect(streakMultiplier(500)).toBe(STREAK_CAP);
  });
});

describe("scoring presets", () => {
  test("standard leaves the question alone", () => {
    const result = applyPointRules(wrong, rules(ScoringPreset.Standard), 0);
    expect(result.points).toBe(0);
  });

  test("negative marking takes a quarter", () => {
    const result = applyPointRules(wrong, rules(ScoringPreset.Negative), 0);
    expect(result.points).toBe(-1);
  });

  test("a skipped question is not punished", () => {
    const result = applyPointRules(
      { ...wrong, answered: false },
      rules(ScoringPreset.Negative),
      0,
    );
    expect(result.points).toBe(0);
  });

  test("all-or-nothing drops partial points", () => {
    const partial = { ...wrong, points: 2 };
    const result = applyPointRules(
      partial,
      rules(ScoringPreset.AllOrNothing),
      0,
    );
    expect(result.points).toBe(0);
  });

  test("partial pays the share of parts that are right", () => {
    const result = applyPointRules(wrong, rules(ScoringPreset.Partial), 0);
    expect(result.points).toBe(2);
  });
});

describe("points and streaks together", () => {
  test("three in a row doubles the question", () => {
    const result = applyPointRules(
      correct,
      rules(ScoringPreset.Standard, true),
      2,
    );
    expect(result.run).toBe(3);
    expect(result.multiplier).toBe(1.5);
    expect(result.points).toBe(3);
  });

  test("a streak never moves the ceiling", () => {
    const result = applyPointRules(
      correct,
      rules(ScoringPreset.Standard, true),
      9,
    );
    expect(result.multiplier).toBe(2);
    expect(result.maxPoints).toBe(2);
  });

  test("a wrong answer resets the run", () => {
    const result = applyPointRules(
      wrong,
      rules(ScoringPreset.Standard, true),
      9,
    );
    expect(result.run).toBe(0);
    expect(result.multiplier).toBe(1);
  });

  test("a penalty is never multiplied", () => {
    const result = applyPointRules(
      wrong,
      rules(ScoringPreset.Negative, true),
      9,
    );
    expect(result.points).toBe(-1);
  });

  test("streaks off means no bonus at all", () => {
    const result = applyPointRules(correct, rules(ScoringPreset.Standard), 12);
    expect(result.multiplier).toBe(1);
    expect(result.points).toBe(2);
  });
});
