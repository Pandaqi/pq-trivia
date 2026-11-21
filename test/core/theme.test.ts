import { describe, expect, test } from "bun:test";
import {
  backgroundFor,
  fontOptions,
  parseThemeSettings,
} from "../../src/core/quiz/theme";

describe("theme settings", () => {
  const text = [
    "Label => Forest",
    "Stylesheet => forest.css",
    "Font => body | Lora | regular | Lora-Regular.woff2",
    "Font => heading | Lora | bold | Lora-Bold.woff2",
    "BackgroundAlpha => 0.4",
    "BoldHeadings => true",
    "--pq-accent => #2f6b4f",
    "--pq-paper => #f3efe2",
    "",
    "### Background",
    "bg-dots.svg",
    "bg-waves.svg",
  ].join("\n");

  test("reads folders, fonts, backgrounds and tokens", () => {
    const settings = parseThemeSettings(text);
    expect(settings.label).toBe("Forest");
    expect(settings.stylesheet).toBe("forest.css");
    expect(settings.fonts.map((font) => font.variant)).toEqual([
      "regular",
      "bold",
    ]);
    expect(settings.fonts[0]?.family).toBe("Lora");
    expect(settings.backgrounds).toEqual(["bg-dots.svg", "bg-waves.svg"]);
    expect(settings.backgroundAlpha).toBe(0.4);
    expect(settings.boldHeadings).toBe(true);
    expect(settings.tokens["--pq-accent"]).toBe("#2f6b4f");
    expect(settings.issues).toHaveLength(0);
  });

  test("colour schemes read a named block", () => {
    const settings = parseThemeSettings(
      [
        "Label => Schemes",
        "### ColorScheme night",
        "Light => #eeeeee",
        "Dark => #111111",
        "Background => #000000",
        "Text => #ffffff",
      ].join("\n"),
    );
    expect(settings.schemes["night"]).toEqual({
      light: "#eeeeee",
      dark: "#111111",
      bg: "#000000",
      text: "#ffffff",
    });
  });

  test("inline lists work for backgrounds too", () => {
    const settings = parseThemeSettings("Background => a.jpg | b.jpg");
    expect(settings.backgrounds).toEqual(["a.jpg", "b.jpg"]);
  });

  test("a background is stable per question", () => {
    const settings = parseThemeSettings(text);
    const first = backgroundFor(settings, "question-7");
    expect(backgroundFor(settings, "question-7")).toBe(first);
    expect(["bg-dots.svg", "bg-waves.svg"]).toContain(first ?? "");
    expect(backgroundFor(parseThemeSettings("Label => Blank"), "x")).toBeNull();
  });

  test("font variants become weight and style", () => {
    const settings = parseThemeSettings(text);
    const [regular, bold] = settings.fonts;
    if (regular === undefined || bold === undefined) {
      throw new Error("fixture lost its fonts");
    }
    expect(fontOptions(regular)).toEqual({ weight: "400", style: "normal" });
    expect(fontOptions(bold)).toEqual({ weight: "700", style: "normal" });
  });

  test("a theme can pin its colour scheme", () => {
    expect(parseThemeSettings("ColorScheme => light").colorScheme).toBe(
      "light",
    );
    expect(parseThemeSettings("color-scheme => dark").colorScheme).toBe("dark");
    expect(parseThemeSettings("ColorScheme => auto").colorScheme).toBe(
      "light dark",
    );
    expect(parseThemeSettings("Label => Plain").colorScheme).toBeNull();
    const wrong = parseThemeSettings("ColorScheme => neon");
    expect(wrong.colorScheme).toBeNull();
    expect(wrong.issues).toHaveLength(1);
  });

  test("unknown settings are reported, not fatal", () => {
    const settings = parseThemeSettings("Colour => red");
    expect(settings.issues).toHaveLength(1);
    expect(settings.stylesheet).toBe("style.css");
  });
});
