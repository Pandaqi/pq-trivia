/** The wizard in a real DOM: it draws, it adds a slide, it edits the text. */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { mountEditor, type MountedEditor } from "../../src/editor/mount";
import { installDom, type TestDom } from "../ui/dom";

let dom: TestDom;
let host: HTMLElement;
let mounted: MountedEditor;

/** Preact flushes on its own schedule, so give it a couple of frames. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 60));
}

/** Wait for the page, not for a guessed number of milliseconds. */
async function waitFor(check: () => boolean, label: string): Promise<void> {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > 2000) {
      throw new Error(`Timed out waiting for ${label}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function button(label: string): HTMLButtonElement | undefined {
  return [...host.querySelectorAll("button")].find(
    (element) => element.textContent === label,
  );
}

function questionField(): HTMLTextAreaElement {
  const field = host.querySelector("#pq-editor-question");
  if (!(field instanceof HTMLTextAreaElement)) {
    throw new Error("No question field.");
  }
  return field;
}

beforeAll(() => {
  dom = installDom();
});

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  mounted = mountEditor(host, {});
});

afterEach(async () => {
  mounted.destroy();
  await tick();
  host.remove();
});

afterAll(async () => {
  await tick();
  dom.uninstall();
});

describe("the wizard", () => {
  test("draws the header, both blocks and the panes", () => {
    const slides = host.querySelectorAll(".pq-editor-slide");
    expect(slides.length).toBe(3);
    expect(slides[0]?.textContent).toContain("Untitled quiz");
    expect(host.querySelector("#pq-editor-title")).not.toBeNull();
    // No preview hook here, so the wizard opens on slides and details.
    expect(host.querySelector("#pq-editor-question")).not.toBeNull();
    expect(host.querySelector("#pq-editor-syntax")).toBeNull();
  });

  test("a pane toggle puts the Syntax pane up and takes it down", async () => {
    button("Syntax")?.click();
    await waitFor(
      () => host.querySelector("#pq-editor-syntax") !== null,
      "the syntax pane",
    );
    button("Syntax")?.click();
    await waitFor(
      () => host.querySelector("#pq-editor-syntax") === null,
      "the syntax pane to close",
    );
  });

  test("the form follows the selection", async () => {
    const question = host.querySelectorAll(".pq-editor-slide")[2];
    if (question instanceof HTMLElement) {
      question.click();
    }
    await waitFor(
      () => questionField().value.includes("flamingos"),
      "the question form",
    );
    expect(questionField().value).toContain("flamingos");
  });

  test("adding a question writes a new block", async () => {
    button("+ Question")?.click();
    await waitFor(
      () => host.querySelectorAll(".pq-editor-slide").length === 4,
      "the fourth slide",
    );
    await waitFor(
      () => mounted.text().includes("New question"),
      "the new question text",
    );
    expect(host.querySelectorAll(".pq-editor-slide").length).toBe(4);
  });

  test("editing the question text rewrites the buffer", async () => {
    button("+ Question")?.click();
    await waitFor(
      () => questionField().value === "New question",
      "the new question form",
    );
    // The field's mount effect syncs the draft from its value. Let it run
    // before typing, or it lands after the keystroke and undoes it.
    await tick();
    const field = questionField();
    field.value = "What do you call a quiz?";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    // A keystroke and a blur are separate tasks, so the draft lands in state
    // before the commit reads it.
    await tick();
    field.dispatchEvent(new Event("blur", { bubbles: true }));
    await waitFor(
      () => mounted.text().includes("What do you call a quiz?"),
      "the edited question in the buffer",
    );
    expect(mounted.text()).toContain("What do you call a quiz?");
  });
});
