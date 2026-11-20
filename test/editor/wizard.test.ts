/** The wizard in a real DOM: it draws, it adds a slide, it edits the text. */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mountEditor, type MountedEditor } from "../../src/editor/mount";
import { installDom, type TestDom } from "../ui/dom";

let dom: TestDom;
let host: HTMLElement;
let mounted: MountedEditor;

/** Preact flushes on its own schedule, so give it a couple of frames. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 60));
}

function button(label: string): HTMLButtonElement | undefined {
  return [...host.querySelectorAll("button")].find(
    (element) => element.textContent === label,
  );
}

beforeAll(() => {
  dom = installDom();
  host = document.createElement("div");
  document.body.append(host);
  mounted = mountEditor(host, {});
});

afterAll(async () => {
  mounted.destroy();
  // Preact runs effect cleanup after unmount. Let it finish before the window
  // goes away, or a later test file meets a half-torn-down tree.
  await tick();
  dom.uninstall();
});

describe("the wizard", () => {
  test("draws the header, both blocks and the panes", () => {
    const slides = host.querySelectorAll(".pq-editor-slide");
    expect(slides.length).toBe(3);
    expect(slides[0]?.textContent).toContain("Untitled quiz");
    expect(host.querySelector("#pq-editor-syntax")).not.toBeNull();
    expect(host.querySelector("#pq-editor-title")).not.toBeNull();
  });

  test("the form follows the selection", async () => {
    const question = host.querySelectorAll(".pq-editor-slide")[2];
    if (question instanceof HTMLElement) {
      question.click();
    }
    await tick();
    const field = host.querySelector("#pq-editor-question");
    expect(field).toBeInstanceOf(HTMLTextAreaElement);
    if (!(field instanceof HTMLTextAreaElement)) {
      return;
    }
    expect(field.value).toContain("flamingos");
  });

  test("adding a question writes a new block", async () => {
    button("+ Question")?.click();
    await tick();
    expect(host.querySelectorAll(".pq-editor-slide").length).toBe(4);
    expect(mounted.text()).toContain("New question");
  });

  test("editing the question text rewrites the buffer", async () => {
    const field = host.querySelector("#pq-editor-question");
    if (!(field instanceof HTMLTextAreaElement)) {
      throw new Error("No question field.");
    }
    field.focus();
    field.value = "What do you call a quiz?";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    // A real keystroke and a real blur are separate tasks, so the draft lands
    // in state before the commit reads it.
    await tick();
    field.dispatchEvent(new Event("blur"));
    await tick();
    expect(mounted.text()).toContain("What do you call a quiz?");
  });
});
