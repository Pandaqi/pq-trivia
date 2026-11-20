import { describe, expect, test } from "bun:test";
import {
  addAnswer,
  addSlide,
  duplicateSlide,
  moveSlide,
  removeSlide,
  setAnswerAt,
  setFieldValue,
  toggleCorrect,
  valuesFor,
  SlideTemplate,
} from "../../src/editor/commands";
import { EditorStore } from "../../src/editor/store";
import { blockTextAt, readText, withBlockText } from "../../src/editor/text";

const QUIZ = `# Test quiz

## Round one

### First question

Type => Choice
Answers => One | Two
Correct => One
`;

function store(): EditorStore {
  return new EditorStore(QUIZ);
}

describe("editor text", () => {
  test("reads a header and one span per block", () => {
    const doc = readText(QUIZ);
    expect(doc.header).toEqual({ start: 1, end: 2 });
    expect(doc.blocks.length).toBe(2);
    expect(doc.blocks[0]?.start).toBe(3);
  });

  test("slices a block as written", () => {
    const doc = readText(QUIZ);
    const text = blockTextAt(QUIZ, doc, 1);
    expect(text.startsWith("### First question")).toBe(true);
    expect(text.endsWith("Correct => One")).toBe(true);
  });

  test("replacing one block leaves the other alone", () => {
    const next = withBlockText(QUIZ, 1, "### Second question\nAnswers => Yes");
    expect(next).toContain("## Round one");
    expect(next).toContain("### Second question");
    expect(next).not.toContain("First question");
  });
});

describe("editor commands", () => {
  test("adds, duplicates, moves and removes slides", () => {
    const editor = store();
    addSlide(editor, SlideTemplate.Choice);
    expect(editor.snapshot().doc.blocks.length).toBe(3);

    duplicateSlide(editor, 2);
    expect(editor.snapshot().doc.blocks.length).toBe(4);

    moveSlide(editor, 1, 1);
    const moved = editor.snapshot();
    expect(blockTextAt(moved.text, moved.doc, 2)).toContain("New question");
    expect(moved.selected).toBe(2);

    removeSlide(editor, 2);
    expect(editor.snapshot().doc.blocks.length).toBe(3);
  });

  test("sets and clears a field", () => {
    const editor = store();
    setFieldValue(editor, 1, "ID", "first-question");
    expect(valuesFor(editor.snapshot(), 1, "ID")).toEqual(["first-question"]);

    setFieldValue(editor, 1, "ID", "");
    expect(valuesFor(editor.snapshot(), 1, "ID")).toEqual([]);
    expect(editor.snapshot().text).not.toContain("ID =>");
  });

  test("answers always add a fresh row", () => {
    const editor = store();
    addAnswer(editor, 1);
    addAnswer(editor, 1);
    expect(valuesFor(editor.snapshot(), 1, "Answers")).toEqual([
      "One",
      "Two",
      "New answer",
      "New answer 2",
    ]);
  });

  test("correct follows an answer rename and a removal", () => {
    const editor = store();
    setAnswerAt(editor, 1, 0, "Uno");
    expect(valuesFor(editor.snapshot(), 1, "Correct")).toEqual(["Uno"]);

    toggleCorrect(editor, 1, "Uno");
    expect(valuesFor(editor.snapshot(), 1, "Correct")).toEqual([]);
  });

  test("undo and redo walk the text", () => {
    const editor = store();
    const before = editor.snapshot().text;
    setFieldValue(editor, 1, "Score", "2");
    expect(editor.snapshot().text).not.toBe(before);

    editor.undo();
    expect(editor.snapshot().text).toBe(before);

    editor.redo();
    expect(valuesFor(editor.snapshot(), 1, "Score")).toEqual(["2"]);
  });

  test("a hand edit of the whole file reparse", () => {
    const editor = store();
    const next = `${QUIZ}\n### Third question\nAnswers => Three\n`;
    editor.update(next);
    expect(editor.snapshot().doc.blocks.length).toBe(3);
  });
});
