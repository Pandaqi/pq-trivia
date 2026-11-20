import { describe, expect, test } from "bun:test";
import { nearDuplicates } from "../../src/core/content/duplicates";
import { DiagnosticSeverity } from "../../src/core/syntax/diagnostics";
import { buildQuiz } from "../../src/core/model/quiz";

const questions = buildQuiz(`Quiz => Doubles
Syntax => 3

Question => Who wrote the song Hey Jude for the Beatles?
Answers => Paul McCartney

Question => Who wrote the song "Hey Jude" for The Beatles?
Answers => McCartney

Question => What is the capital city of Portugal today?
Answers => Lisbon
`).questions;

describe("near duplicates", () => {
  test("the same question twice is named twice", () => {
    const found = nearDuplicates(questions);
    expect(found.length).toBe(1);
    expect(found[0]?.message).toContain("alike");
  });

  test("a warning, never an error", () => {
    expect(nearDuplicates(questions)[0]?.severity).toBe(
      DiagnosticSeverity.Warning,
    );
  });

  test("unrelated questions are left alone", () => {
    const pair = questions.slice(0, 1).concat(questions.slice(2, 3));
    expect(nearDuplicates(pair)).toEqual([]);
  });

  test("the pair names both IDs, so the author can find them", () => {
    const found = nearDuplicates(questions);
    expect(found[0]?.suggestion).toContain(questions[0]?.id ?? "?");
  });

  test("parsing a file says nothing about it", () => {
    const parsed = buildQuiz(`Quiz => Doubles
Syntax => 3

Question => Who wrote the song Hey Jude for the Beatles?
Answers => Paul McCartney

Question => Who wrote the song "Hey Jude" for The Beatles?
Answers => McCartney
`);
    expect(parsed.diagnostics).toEqual([]);
  });

  test("a short answer is not a duplicate of anything", () => {
    const short = buildQuiz(`Question => 1969
Answers => 1969

Question => 1970
Answers => 1970
`).questions;
    expect(nearDuplicates(short)).toEqual([]);
  });
});
