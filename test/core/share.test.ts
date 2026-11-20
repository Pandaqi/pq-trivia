import { describe, expect, test } from "bun:test";
import { orderFromQuery, shareQuery } from "../../src/core/plan/share";

describe("sharing a seed", () => {
  test("the query carries the seed and the order", () => {
    const query = shareQuery({
      seed: "music night",
      shuffleQuestions: true,
      shuffleRounds: false,
    });
    expect(query).toContain("seed=music%20night");
    expect(query).toContain("shuffle=1");
    expect(query).not.toContain("rounds=");
  });

  test("reading it back gives the same order", () => {
    const order = orderFromQuery("?seed=music-night&shuffle=1&rounds=true");
    expect(order).toEqual({
      seed: "music-night",
      shuffleQuestions: true,
      shuffleRounds: true,
    });
  });

  test("an empty or broken search says nothing", () => {
    expect(orderFromQuery("")).toEqual({});
    expect(orderFromQuery("?seed=")).toEqual({});
    expect(orderFromQuery("?shuffle=maybe&rounds=0")).toEqual({
      shuffleRounds: false,
    });
  });

  test("there is no place for an answer", () => {
    const query = shareQuery({ seed: "abc", shuffleQuestions: false });
    expect(query).toBe("seed=abc");
  });
});
