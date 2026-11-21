import { describe, expect, test } from "bun:test";
import {
  checkContrast,
  contrastRatio,
  parseColor,
} from "../../src/core/values/contrast";

describe("contrast", () => {
  test("black on white is 21:1", () => {
    const black = parseColor("#000");
    const white = parseColor("white");
    expect(black).not.toBeNull();
    expect(white).not.toBeNull();
    if (black !== null && white !== null) {
      expect(contrastRatio(black, white)).toBeCloseTo(21, 0);
    }
  });

  test("rgb() and hex mean the same colour", () => {
    expect(parseColor("rgb(47 42 51)")).toEqual(parseColor("#2f2a33"));
    expect(parseColor("rgba(47, 42, 51, 0.5)")?.a).toBeCloseTo(0.5, 2);
  });

  test("oklch() is the colour the screen paints", () => {
    const red = parseColor("oklch(0.628 0.2577 29.23)");
    expect(red).not.toBeNull();
    if (red !== null) {
      expect(red.r).toBeGreaterThan(250);
      expect(red.g).toBeLessThan(4);
      expect(red.b).toBeLessThan(4);
    }
    expect(parseColor("oklch(100% 0 0)")).toEqual({
      r: 255,
      g: 255,
      b: 255,
      a: 1,
    });
    expect(parseColor("oklch(0% 0 0)")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseColor("oklch(0.5 0 0 / 50%)")?.a).toBeCloseTo(0.5, 2);
    expect(parseColor("oklch(0.7 25% 180)")?.g).toBeGreaterThan(150);
  });

  test("an oklch pair is judged like any other colour", () => {
    expect(
      checkContrast({
        "--pq-ink": "oklch(0.2 0 0)",
        "--pq-paper": "oklch(0.98 0 0)",
      }),
    ).toEqual([]);
    const found = checkContrast({
      "--pq-ink": "oklch(0.9 0 0)",
      "--pq-paper": "oklch(0.98 0 0)",
    });
    expect(found).toHaveLength(1);
  });

  test("dark ink on light paper passes", () => {
    expect(
      checkContrast({ "--pq-ink": "#2f2a33", "--pq-paper": "#faf5ea" }),
    ).toEqual([]);
  });

  test("pale ink on pale paper is flagged", () => {
    const found = checkContrast({
      "--pq-ink": "#b9b0a4",
      "--pq-paper": "#eaf0e2",
    });
    expect(found).toHaveLength(1);
    expect(found[0]?.foreground).toBe("--pq-ink");
    expect(found[0]?.background).toBe("--pq-paper");
    expect(found[0]?.ratio).toBeLessThan(2);
  });

  test("a token the theme does not set is skipped", () => {
    expect(checkContrast({ "--pq-ink": "#000" })).toEqual([]);
    expect(checkContrast({})).toEqual([]);
  });
});
