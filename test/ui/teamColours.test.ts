import { describe, expect, test } from "bun:test";
import {
  assignTeamColours,
  colourFor,
  teamColourFor,
} from "../../src/shared/teamColours";

const names = ["Red", "Blue", "Green", "Amber", "Teal", "Rose"];

describe("team colours", () => {
  test("every team in a session gets its own colour", () => {
    const colours = assignTeamColours(names);
    const used = names.map((name) => colours.get(name)?.base ?? "");
    expect(new Set(used).size).toBe(names.length);
  });

  test("the same names give the same answer in any order", () => {
    const first = assignTeamColours(names);
    const second = assignTeamColours([...names].reverse());
    for (const name of names) {
      expect(second.get(name)?.base).toBe(first.get(name)?.base);
    }
  });

  test("blanks and repeats do not eat a colour", () => {
    const colours = assignTeamColours(["Red", " ", "Red", "Blue"]);
    expect(colours.size).toBe(2);
    expect(colours.get("Red")?.base).not.toBe(colours.get("Blue")?.base);
  });

  test("an unknown team still gets a colour", () => {
    const colours = assignTeamColours(["Red"]);
    expect(colourFor(colours, "Pink").base).toMatch(/^#/);
    expect(teamColourFor("").base).toMatch(/^#/);
  });

  test("the badge and the board agree on the same name", () => {
    // Both read from one map of the whole session, never from a single name.
    const board = assignTeamColours(["Red", "Blue"]);
    const badge = assignTeamColours(["Blue", "Red"]);
    expect(colourFor(badge, "Red").base).toBe(colourFor(board, "Red").base);
    expect(colourFor(badge, "Blue").base).toBe(colourFor(board, "Blue").base);
  });
});
