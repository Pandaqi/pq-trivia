import { describe, expect, test } from "bun:test";
import { CONFIG_COVERAGE } from "../../src/core/quiz/types";
import {
  CONFIG_CODE_ONLY,
  CONFIG_HEADER_ROWS,
} from "../../src/core/syntax/configAttributes";

describe("config coverage", () => {
  test("every QuizConfig key has a header row or a code-only reason", () => {
    // The real check is the type of CONFIG_COVERAGE. This keeps it in a test
    // report instead of only in a compiler error.
    expect(CONFIG_COVERAGE).toBe(true);
  });

  test("header keys are unique and do not overlap code-only keys", () => {
    const header = CONFIG_HEADER_ROWS.map((row) => row.key);
    expect(new Set(header).size).toBe(header.length);

    for (const row of CONFIG_CODE_ONLY) {
      expect(header).not.toContain(row.key);
      expect(row.why.length).toBeGreaterThan(10);
    }
  });
});
