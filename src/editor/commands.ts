/**
 * Every wizard action, expressed as a change to the text.
 *
 * Nothing here holds state. Each command reads the snapshot, builds new text
 * and hands it to the store. One path for the toolbar, the forms and the
 * keyboard.
 */

import type { AstAttribute } from "../core/syntax/ast";
import type { EditorSnapshot, EditorStore } from "./store";
import { HEADER_INDEX } from "./slides";
import {
  blockAttributes,
  blockTextAt,
  blockTexts,
  formatBlock,
  formatHeader,
  setHeaderValues,
  setValues,
  valuesOf,
  withBlockText,
  withBlocks,
  withHeaderText,
} from "./text";

export enum SlideTemplate {
  Question = "question",
  Choice = "choice",
  Round = "round",
  Start = "start",
  End = "end",
}

export const TEMPLATES: Readonly<Record<SlideTemplate, string>> = {
  [SlideTemplate.Question]: "Question => New question\nAnswers => One | Two",
  [SlideTemplate.Choice]:
    "Question => New question\nType => Choice\nAnswers => One | Two\nCorrect => One",
  [SlideTemplate.Round]: "Type => Section\nQuestion => New round",
  [SlideTemplate.Start]: "Type => Start\nQuestion => Welcome",
  [SlideTemplate.End]: "Type => End\nQuestion => That's all, folks!",
};

const NEW_ANSWER = "New answer";
const NEW_MEDIA = "media/";
const NO_SPACE = [HEADER_INDEX];

/** First free name: "New answer", then "New answer 2", and so on. */
function uniqueValue(values: readonly string[], base: string): string {
  if (!values.includes(base)) {
    return base;
  }
  let counter = 2;
  while (values.includes(`${base} ${counter}`)) {
    counter += 1;
  }
  return `${base} ${counter}`;
}

function attributesOf(
  snapshot: EditorSnapshot,
  index: number,
): readonly AstAttribute[] {
  if (index === HEADER_INDEX) {
    return snapshot.doc.document.header;
  }
  return blockAttributes(snapshot.doc, index);
}

export function valuesFor(
  snapshot: EditorSnapshot,
  index: number,
  key: string,
): string[] {
  return valuesOf(attributesOf(snapshot, index), key);
}

/** Set a list attribute. An empty list removes the line. */
export function setValuesField(
  store: EditorStore,
  index: number,
  key: string,
  values: readonly string[],
): void {
  const snapshot = store.snapshot();
  if (index === HEADER_INDEX) {
    const header = setHeaderValues(snapshot.doc.document.header, key, values);
    store.update(withHeaderText(snapshot.text, formatHeader(header)));
    return;
  }
  const question = snapshot.doc.document.questions[index];
  if (question === undefined) {
    return;
  }
  const attributes = setValues(question.attributes, key, values);
  store.update(
    withBlockText(
      snapshot.text,
      index,
      formatBlock(attributes, question.location),
    ),
  );
}

export function setFieldValue(
  store: EditorStore,
  index: number,
  key: string,
  value: string,
): void {
  const trimmed = value.trim();
  setValuesField(store, index, key, trimmed.length === 0 ? [] : [trimmed]);
}

/* ---------------------------------------------------------------- structure */

function insert(store: EditorStore, body: string, at: number): void {
  const snapshot = store.snapshot();
  const bodies = blockTexts(snapshot.text, snapshot.doc);
  const position = Math.min(Math.max(at, 0), bodies.length);
  bodies.splice(position, 0, body);
  store.update(withBlocks(snapshot.text, bodies), position);
}

export function addSlide(store: EditorStore, template: SlideTemplate): void {
  const snapshot = store.snapshot();
  insert(store, TEMPLATES[template], snapshot.selected + 1);
}

export function removeSlide(store: EditorStore, index: number): void {
  if (NO_SPACE.includes(index)) {
    return;
  }
  const snapshot = store.snapshot();
  const bodies = blockTexts(snapshot.text, snapshot.doc);
  if (bodies[index] === undefined) {
    return;
  }
  bodies.splice(index, 1);
  store.update(withBlocks(snapshot.text, bodies), index - 1);
}

export function duplicateSlide(store: EditorStore, index: number): void {
  if (NO_SPACE.includes(index)) {
    return;
  }
  const snapshot = store.snapshot();
  const body = blockTextAt(snapshot.text, snapshot.doc, index);
  if (body.length === 0) {
    return;
  }
  insert(store, body, index + 1);
}

export function moveSlide(
  store: EditorStore,
  index: number,
  delta: number,
): void {
  if (NO_SPACE.includes(index)) {
    return;
  }
  const snapshot = store.snapshot();
  const bodies = blockTexts(snapshot.text, snapshot.doc);
  const target = index + delta;
  const moving = bodies[index];
  const swapped = bodies[target];
  if (moving === undefined || swapped === undefined) {
    return;
  }
  bodies[index] = swapped;
  bodies[target] = moving;
  store.update(withBlocks(snapshot.text, bodies), target);
}

/** Lift a block and put it down at `to`, keeping the rest in order. */
export function moveSlideTo(
  store: EditorStore,
  from: number,
  to: number,
): void {
  if (NO_SPACE.includes(from) || from === to) {
    return;
  }
  const snapshot = store.snapshot();
  const bodies = blockTexts(snapshot.text, snapshot.doc);
  const moving = bodies[from];
  if (moving === undefined || bodies[to] === undefined) {
    return;
  }
  bodies.splice(from, 1);
  bodies.splice(to, 0, moving);
  store.update(withBlocks(snapshot.text, bodies), to);
}

/* -------------------------------------------------------------- text panes */

export function setSlideText(
  store: EditorStore,
  index: number,
  body: string,
): void {
  const snapshot = store.snapshot();
  if (index === HEADER_INDEX) {
    store.update(withHeaderText(snapshot.text, body));
    return;
  }
  const before = snapshot.doc.blocks.length;
  store.update(withBlockText(snapshot.text, index, body));
  const after = store.snapshot().doc.blocks.length;
  if (after !== before) {
    store.say(
      body.trim().length === 0
        ? "Slide removed."
        : "That slide now holds more or fewer blocks. Check the list.",
    );
  }
}

export function setWholeText(store: EditorStore, body: string): void {
  store.update(body);
  store.say("Parsed the whole file.");
}

/* ------------------------------------------------------------------ answers */

export function addAnswer(store: EditorStore, index: number): void {
  const values = valuesFor(store.snapshot(), index, "Answers");
  setValuesField(store, index, "Answers", [
    ...values,
    uniqueValue(values, NEW_ANSWER),
  ]);
}

export function setAnswerAt(
  store: EditorStore,
  index: number,
  at: number,
  value: string,
): void {
  const snapshot = store.snapshot();
  const answers = valuesFor(snapshot, index, "Answers");
  const previous = answers[at];
  if (previous === undefined || previous === value) {
    return;
  }
  answers[at] = value;
  // Correct points at answer text, so a rename has to follow it.
  const correct = valuesFor(snapshot, index, "Correct").map((entry) =>
    entry === previous ? value : entry,
  );
  setValuesField(store, index, "Answers", answers);
  if (correct.length > 0) {
    setValuesField(store, index, "Correct", correct);
  }
}

export function removeAnswer(
  store: EditorStore,
  index: number,
  at: number,
): void {
  const snapshot = store.snapshot();
  const answers = valuesFor(snapshot, index, "Answers");
  const removed = answers[at];
  if (removed === undefined) {
    return;
  }
  answers.splice(at, 1);
  setValuesField(store, index, "Answers", answers);
  const correct = valuesFor(store.snapshot(), index, "Correct").filter(
    (entry) => entry !== removed,
  );
  if (correct.length > 0) {
    setValuesField(store, index, "Correct", correct);
  }
}

export function moveAnswer(
  store: EditorStore,
  index: number,
  at: number,
  delta: number,
): void {
  const answers = valuesFor(store.snapshot(), index, "Answers");
  const target = at + delta;
  const moving = answers[at];
  const swapped = answers[target];
  if (moving === undefined || swapped === undefined) {
    return;
  }
  answers[at] = swapped;
  answers[target] = moving;
  setValuesField(store, index, "Answers", answers);
}

export function toggleCorrect(
  store: EditorStore,
  index: number,
  value: string,
): void {
  const correct = valuesFor(store.snapshot(), index, "Correct");
  const next = correct.includes(value)
    ? correct.filter((entry) => entry !== value)
    : [...correct, value];
  setValuesField(store, index, "Correct", next);
}

/* -------------------------------------------------------------------- media */

export function addMedia(
  store: EditorStore,
  index: number,
  name: string,
): void {
  const values = valuesFor(store.snapshot(), index, "Media");
  setValuesField(store, index, "Media", [
    ...values,
    name.trim().length === 0 ? NEW_MEDIA : name.trim(),
  ]);
}

export function removeMedia(
  store: EditorStore,
  index: number,
  at: number,
): void {
  const values = valuesFor(store.snapshot(), index, "Media");
  if (values[at] === undefined) {
    return;
  }
  values.splice(at, 1);
  setValuesField(store, index, "Media", values);
}

export function setMediaAt(
  store: EditorStore,
  index: number,
  at: number,
  name: string,
): void {
  const values = valuesFor(store.snapshot(), index, "Media");
  if (values[at] === undefined) {
    return;
  }
  values[at] = name;
  setValuesField(store, index, "Media", values);
}

export function moveMedia(
  store: EditorStore,
  index: number,
  at: number,
  delta: number,
): void {
  const values = valuesFor(store.snapshot(), index, "Media");
  const target = at + delta;
  const moving = values[at];
  const swapped = values[target];
  if (moving === undefined || swapped === undefined) {
    return;
  }
  values[at] = swapped;
  values[target] = moving;
  setValuesField(store, index, "Media", values);
}
