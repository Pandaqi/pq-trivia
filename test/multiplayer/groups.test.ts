import { describe, expect, test } from "bun:test";
import type { LivePlayer } from "../../src/multiplayer/types";
import { playerGroups } from "../../src/multiplayer/ui/parts";

function player(id: string, name: string, team?: string): LivePlayer {
  return {
    id,
    name,
    score: 0,
    connected: true,
    ready: false,
    answered: false,
    late: 0,
    stake: null,
    ...(team === undefined ? {} : { team }),
  };
}

describe("host screen groups", () => {
  test("phones sharing a team sit under one head, each team its own colour", () => {
    const groups = playerGroups([
      player("1", "Ada", "Red"),
      player("2", "Bo", "Red"),
      player("3", "Cy", "Blue"),
    ]);
    expect(groups.map((group) => group.name)).toEqual(["Blue", "Red"]);
    const red = groups.find((group) => group.name === "Red");
    expect(red?.rows.length).toBe(2);
    const blue = groups.find((group) => group.name === "Blue");
    expect(red?.colour.base).not.toBe(blue?.colour.base);
  });

  test("a phone that came alone gets a group with no head", () => {
    const groups = playerGroups([player("1", "Ada")]);
    expect(groups.length).toBe(1);
    expect(groups[0]?.name).toBe(null);
  });

  test("teams come before the solo phones", () => {
    const groups = playerGroups([player("1", "Ada"), player("2", "Bo", "Red")]);
    expect(groups.map((group) => group.name)).toEqual(["Red", null]);
  });

  test("twelve teams get twelve different colours", () => {
    // Twelve colours, so twelve teams are distinct. Past that the palette
    // repeats, which is why MAX_TEAMS is twelve.
    const names = Array.from({ length: 12 }, (_, index) => `T${index}`);
    const groups = playerGroups(
      names.map((name, index) => player(String(index), `p${index}`, name)),
    );
    const bases = new Set(groups.map((group) => group.colour.base));
    expect(bases.size).toBe(12);
  });
});
