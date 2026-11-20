/**
 * The pure half of drag and drop. The click path and the drag path call these
 * same functions, so a move is tested once.
 */

import { describe, expect, test } from "bun:test";
import {
  connectPair,
  moveItem,
  placeItem,
} from "../../src/renderers/forms/drag";

describe("moveItem", () => {
  test("moves an item and keeps the rest in order", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  test("an impossible move changes nothing", () => {
    expect(moveItem(["a", "b"], 0, 0)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], -1, 1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
});

describe("connectPair", () => {
  test("connecting again moves the pair instead of duplicating it", () => {
    expect(connectPair([["a", "1"]], "a", "2")).toEqual([["a", "2"]]);
    expect(connectPair([["a", "1"]], "b", "1")).toEqual([["b", "1"]]);
    expect(connectPair([], "a", "1")).toEqual([["a", "1"]]);
  });
});

describe("placeItem", () => {
  test("an item lives in one bucket at a time", () => {
    expect(placeItem([["apple", "fruit"]], "apple", "veg")).toEqual([
      ["apple", "veg"],
    ]);
  });
});
