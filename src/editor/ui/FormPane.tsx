/**
 * The form pane. Fields come from the attribute registry, so a new attribute
 * shows up here without touching this file.
 *
 * Answers and media get their own widgets: those are the two places an author
 * edits ten times a minute.
 */

import type { JSX } from "preact";
import { QuestionType } from "../../core/model/question";
import { QUESTION_TYPES } from "../../core/syntax/attributes";
import {
  addAnswer,
  addMedia,
  duplicateSlide,
  moveAnswer,
  moveMedia,
  moveSlide,
  removeAnswer,
  removeMedia,
  setMediaAt,
  removeSlide,
  setAnswerAt,
  setFieldValue,
  setValuesField,
  toggleCorrect,
  valuesFor,
} from "../commands";
import { FIELD_GROUPS, fieldsInGroup, HEADER_FIELDS } from "../fields";
import type { EditorOptions } from "../mount";
import { HEADER_INDEX, slideAt } from "../slides";
import type { EditorSnapshot, EditorStore } from "../store";
import { DraftText, FieldRow, FieldShell, Select } from "./Field";
import { ListEditor } from "./ListEditor";

export interface FormPaneProps {
  readonly store: EditorStore;
  readonly snapshot: EditorSnapshot;
  readonly options: EditorOptions;
}

/** Types where `Correct` means nothing, or is set by the player instead. */
const NO_CORRECT: ReadonlySet<string> = new Set([
  QuestionType.Section,
  QuestionType.Start,
  QuestionType.End,
  QuestionType.Custom,
]);

const ANSWER_HINTS: Readonly<Record<string, string>> = {
  [QuestionType.Open]:
    "One accepted answer per row. AlsoAccept adds alternatives.",
  [QuestionType.Choice]: "Tick every option that counts as correct.",
  [QuestionType.List]: "Tick the answers a player must give, in any order.",
  [QuestionType.Sort]: "Write them in the right order. The player sorts them.",
  [QuestionType.Range]: "The expected number. Range adds the margin.",
  [QuestionType.Match]: "Write each pair as Left ~ Right.",
  [QuestionType.Cloze]: "One answer per [blank], or groups split by ||.",
};

export function FormPane({
  store,
  snapshot,
  options,
}: FormPaneProps): JSX.Element {
  if (snapshot.selected === HEADER_INDEX) {
    return <HeaderForm store={store} snapshot={snapshot} />;
  }
  return (
    <BlockForm
      // A new slide gets fresh inputs. Reusing them lets an uncommitted draft
      // from the last slide land on this one.
      key={snapshot.selected}
      store={store}
      snapshot={snapshot}
      options={options}
      index={snapshot.selected}
    />
  );
}

function HeaderForm({
  store,
  snapshot,
}: {
  readonly store: EditorStore;
  readonly snapshot: EditorSnapshot;
}): JSX.Element {
  return (
    <section class="pq-editor-panel" aria-label="Quiz settings">
      <h2>Quiz settings</h2>
      <p class="pq-editor-hint">
        These lines sit above the first question. Leave a field empty to remove
        its line.
      </p>
      {HEADER_FIELDS.map((field) => (
        <FieldRow
          key={field.key}
          field={field}
          values={valuesFor(snapshot, HEADER_INDEX, field.key)}
          onChange={(values) =>
            setValuesField(store, HEADER_INDEX, field.key, values)
          }
        />
      ))}
    </section>
  );
}

function BlockForm({
  store,
  snapshot,
  options,
  index,
}: FormPaneProps & { readonly index: number }): JSX.Element {
  const slide = slideAt(snapshot.slides, index);
  const type =
    valuesFor(snapshot, index, "Type")[0]?.toLowerCase() ?? QuestionType.Open;
  const question = valuesFor(snapshot, index, "Question")[0] ?? "";
  const answers = valuesFor(snapshot, index, "Answers");
  const correct = valuesFor(snapshot, index, "Correct");
  const media = valuesFor(snapshot, index, "Media");
  const showCorrect = !NO_CORRECT.has(type);

  const addMediaClick = (): void => {
    const pick = options.onPickMedia;
    if (pick === undefined) {
      addMedia(store, index, "");
      return;
    }
    void pick().then((picked) => {
      if (picked === null) {
        return;
      }
      addMedia(store, index, picked.name);
      store.say(
        picked.copied
          ? `Copied ${picked.name} into media/.`
          : `${picked.name} is only a path. Put the file next to the quiz.`,
      );
    });
  };

  return (
    <section class="pq-editor-panel" aria-label="Slide editor">
      <h2>{slide?.label ?? "Slide"}</h2>

      <div class="pq-editor-actions">
        <button
          type="button"
          onClick={() => moveSlide(store, index, -1)}
          disabled={index === 0}
        >
          Move up
        </button>
        <button
          type="button"
          onClick={() => moveSlide(store, index, 1)}
          disabled={index >= snapshot.slides.length - 2}
        >
          Move down
        </button>
        <button type="button" onClick={() => duplicateSlide(store, index)}>
          Duplicate
        </button>
        <button type="button" onClick={() => removeSlide(store, index)}>
          Remove
        </button>
      </div>

      <FieldShell
        id="pq-editor-question"
        label="Question text"
        description="Inline formatting works here. [blank] is a cloze gap."
      >
        <DraftText
          id="pq-editor-question"
          value={question}
          multiline
          rows={3}
          onCommit={(value) => setFieldValue(store, index, "Question", value)}
        />
      </FieldShell>

      <FieldShell id="pq-editor-type" label="Type">
        <Select
          id="pq-editor-type"
          value={type === QuestionType.Open ? "" : type}
          options={QUESTION_TYPES}
          emptyLabel="(open)"
          onChange={(value) => setFieldValue(store, index, "Type", value)}
        />
      </FieldShell>

      <FieldShell
        id="pq-editor-answers"
        label="Answers"
        description={ANSWER_HINTS[type] ?? ""}
      >
        <ListEditor
          id="pq-editor-answers"
          values={answers}
          {...(showCorrect
            ? {
                correct,
                onToggleCorrect: (value: string) =>
                  toggleCorrect(store, index, value),
              }
            : {})}
          onChange={(at, value) => setAnswerAt(store, index, at, value)}
          onAdd={() => addAnswer(store, index)}
          onRemove={(at) => removeAnswer(store, index, at)}
          onMove={(at, delta) => moveAnswer(store, index, at, delta)}
          addLabel="Add answer"
          emptyText="No answers yet. Open questions can skip this."
        />
      </FieldShell>

      <FieldShell
        id="pq-editor-media"
        label="Media"
        description="A file copied into media/, or any path you like."
      >
        <ListEditor
          id="pq-editor-media"
          values={media}
          onChange={(at, value) => setMediaAt(store, index, at, value)}
          onAdd={addMediaClick}
          onRemove={(at) => removeMedia(store, index, at)}
          onMove={(at, delta) => moveMedia(store, index, at, delta)}
          addLabel="Add file"
          emptyText="No media on this slide."
          extra={
            <button type="button" onClick={() => addMedia(store, index, "")}>
              Add path
            </button>
          }
        />
      </FieldShell>

      {FIELD_GROUPS.map(({ group, label }) => {
        const fields = fieldsInGroup(group);
        if (fields.length === 0) {
          return null;
        }
        return (
          <details key={group}>
            <summary>{label}</summary>
            {fields.map((field) => (
              <FieldRow
                key={field.key}
                field={field}
                values={valuesFor(snapshot, index, field.key)}
                onChange={(values) =>
                  setValuesField(store, index, field.key, values)
                }
              />
            ))}
          </details>
        );
      })}
    </section>
  );
}
