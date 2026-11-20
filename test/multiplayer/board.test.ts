import { describe, expect, test } from "bun:test";
import { ranksOf, winnersOf } from "../../src/multiplayer/board";

const row = (id: string, score: number) => ({ id, name: id, score });

describe("winners", () => {
  test("a tie at the top makes everyone on it a winner", () => {
    const winners = winnersOf([row("a", 4), row("b", 4), row("c", 3)]);
    expect([...winners].sort()).toEqual(["a", "b"]);
  });

  test("one leader is one winner", () => {
    expect([...winnersOf([row("a", 2), row("b", 1)])]).toEqual(["a"]);
  });

  test("three-way ties count too", () => {
    const winners = winnersOf([row("a", 2), row("b", 2), row("c", 2)]);
    expect(winners.size).toBe(3);
  });

  test("nobody wins a board of zeroes", () => {
    expect(winnersOf([row("a", 0), row("b", 0)]).size).toBe(0);
  });

  test("an empty board has no winner", () => {
    expect(winnersOf([]).size).toBe(0);
  });

  test("winners get the same rank, and the next one skips", () => {
    const rows = [row("a", 5), row("b", 5), row("c", 3)];
    expect(rows.map((entry) => ranksOf(rows).get(entry.id))).toEqual([1, 1, 3]);
  });

  test("a tie in the middle skips too", () => {
    const rows = [row("a", 5), row("b", 4), row("c", 4), row("d", 1)];
    expect(rows.map((entry) => ranksOf(rows).get(entry.id))).toEqual([
      1, 2, 2, 4,
    ]);
  });

  test("no ties, no gaps", () => {
    const rows = [row("a", 3), row("b", 2), row("c", 1)];
    expect(rows.map((entry) => ranksOf(rows).get(entry.id))).toEqual([1, 2, 3]);
  });

  test("everyone on zero still gets a place", () => {
    const rows = [row("a", 0), row("b", 0), row("c", 0)];
    expect(rows.map((entry) => ranksOf(rows).get(entry.id))).toEqual([1, 1, 1]);
  });
});
