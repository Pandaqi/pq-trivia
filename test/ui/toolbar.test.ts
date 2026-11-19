import { describe, expect, test } from "bun:test";
import { showsButton } from "../../src/renderers/preact/toolbar";

describe("Buttons gate", () => {
  test("an empty list shows the default buttons", () => {
    expect(showsButton([], "settings")).toBe(true);
  });

  test("a whitelist hides what it omits", () => {
    expect(showsButton(["settings"], "settings")).toBe(true);
    expect(showsButton(["play"], "settings")).toBe(false);
  });
});
