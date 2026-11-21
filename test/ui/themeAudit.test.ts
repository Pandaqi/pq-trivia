import { describe, expect, test } from "bun:test";
import { themeAudit } from "../../src/platform/browser/theme";

const LOW_CONTRAST = {
  foreground: "--pq-ink",
  background: "--pq-paper",
  ratio: 1.2,
};

const image = (width: number, height: number) => async () => ({
  width,
  height,
});

describe("theme audit", () => {
  test("reports low contrast", async () => {
    const issues = await themeAudit({
      warnings: [LOW_CONTRAST],
      theme: null,
    });
    expect(issues).toEqual([{ kind: "contrast", ...LOW_CONTRAST }]);
  });

  test("reports a background stretched past twice its width", async () => {
    const issues = await themeAudit({
      warnings: [],
      theme: { images: ["bg.png"] },
      shownWidth: 1200,
      measure: image(400, 300),
    });
    expect(issues).toEqual([
      { kind: "image", file: "bg.png", width: 400, height: 300 },
    ]);
  });

  test("leaves a large enough background alone", async () => {
    const issues = await themeAudit({
      warnings: [],
      theme: { images: ["bg.png"] },
      shownWidth: 1200,
      measure: image(900, 600),
    });
    expect(issues).toEqual([]);
  });

  test("names a missing background", async () => {
    const issues = await themeAudit({
      warnings: [],
      theme: { images: ["https://example.test/themes/forest/gone.png?v=2"] },
      shownWidth: 1200,
      measure: async () => "missing",
    });
    expect(issues).toEqual([{ kind: "imageMissing", file: "gone.png" }]);
  });

  test("does not measure an SVG background", async () => {
    let measured = 0;
    const issues = await themeAudit({
      warnings: [],
      theme: { images: ["dots.svg", "waves.svg?x=1"] },
      shownWidth: 1200,
      measure: async () => {
        measured += 1;
        return null;
      },
    });
    expect(issues).toEqual([]);
    expect(measured).toBe(0);
  });

  test("measures the same background once", async () => {
    let measured = 0;
    await themeAudit({
      warnings: [],
      theme: { images: ["bg.png", "bg.png"] },
      shownWidth: 1200,
      measure: async () => {
        measured += 1;
        return { width: 1200, height: 800 };
      },
    });
    expect(measured).toBe(1);
  });

  test("the off switch skips contrast and images", async () => {
    let measured = 0;
    const issues = await themeAudit({
      enabled: false,
      warnings: [LOW_CONTRAST],
      theme: { images: ["gone.png"] },
      shownWidth: 1200,
      measure: async () => {
        measured += 1;
        return "missing";
      },
    });
    expect(issues).toEqual([]);
    expect(measured).toBe(0);
  });
});
