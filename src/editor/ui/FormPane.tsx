/**
 * The form pane. Fields come from the attribute registry, so a new attribute
 * shows up here without touching this file.
 *
 * Two things get their own widget, because they are the two places an author
 * edits ten times a minute: answers and media. A round or a start screen has
 * neither, so those rows disappear with the type.
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
  removeSlide,
  setAnswerAt,
  setFieldValue,
  setMediaAt,
  setValuesField,
  toggleCorrect,
  valuesFor,
} from "../commands";
import { FIELD_GROUPS, fieldsInGroup, HEADER_FIELDS } from "../fields";
import type { EditorOptions } from "../mount";
import { HEADER_INDEX, SLIDE_KIND_LABELS, slideAt } from "../slides";
import type { EditorSnapshot, EditorStore } from "../store";
import type { SlideInfo } from "../slides";
import { DraftText, FieldRow, FieldShell, Select } from "./Field";
import { ListEditor } from "./ListEditor";

export interface FormPaneProps {
  readonly store: EditorStore;
  readonly snapshot: EditorSnapshot;
  readonly options: EditorOptions;
}

/** Types that never take answers: they are pages, not questions. */
const SCREENS: ReadonlySet<string> = new Set([
  QuestionType.Section,
  QuestionType.Start,
  QuestionType.End,
]);

/** Types where `Correct` means nothing. */
const NO_CORRECT: ReadonlySet<string> = new Set([
  ...SCREENS,
  QuestionType.Custom,
]);

/** The default type has no line of its own, so the list leaves it out. */
const TYPE_OPTIONS = QUESTION_TYPES.filter(
  (type) => type !== QuestionType.Open,
);

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

function textLabel(type: string): string {
  if (type === QuestionType.Section) {
    return "Round name";
  }
  if (SCREENS.has(type)) {
    return "Screen text";
  }
  return "Question text";
}

function textHint(type: string): string {
  if (type === QuestionType.Section) {
    return "The heading on its own screen at the start of the round.";
  }
  if (SCREENS.has(type)) {
    return "The big line. Inline formatting works here.";
  }
  return "Inline formatting works here. [blank] is a cloze gap.";
}

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
  const empty = snapshot.slides.length === 1;
  return (
    <section class="pq-editor-panel" aria-label="Quiz settings">
      <h2>Quiz settings</h2>
      <p class="pq-editor-hint">
        The title sits in the toolbar. These lines go above the first question;
        leave a field empty to remove its line.
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
      {empty ? (
        <p class="pq-editor-hint">
          No slides yet. Use <strong>+ Question</strong> in the toolbar.
        </p>
      ) : null}
    </section>
  );
}

function BlockForm({
  store,
  snapshot,
  options,
  index,
}: FormPaneProps & { readonly index: number }): JSX.Element {
  const slide: SlideInfo | undefined = slideAt(snapshot.slides, index);
  const type =
    valuesFor(snapshot, index, "Type")[0]?.toLowerCase() ?? QuestionType.Open;
  const question = valuesFor(snapshot, index, "Question")[0] ?? "";
  const answers = valuesFor(snapshot, index, "Answers");
  const correct = valuesFor(snapshot, index, "Correct");
  const media = valuesFor(snapshot, index, "Media");
  const isScreen = SCREENS.has(type);
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
      <div class="pq-editor-panel-head">
        <h2>
          <span class="pq-editor-kind">
            {slide === undefined ? "Slide" : SLIDE_KIND_LABELS[slide.kind]}
          </span>
          {slide?.label ?? "Slide"}
        </h2>
        <div class="pq-editor-actions">
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => moveSlide(store, index, -1)}
            disabled={index === 0}
            title="Alt+↑"
          >
            ↑
          </button>
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => moveSlide(store, index, 1)}
            disabled={index >= snapshot.slides.length - 2}
            title="Alt+↓"
          >
            ↓
          </button>
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => duplicateSlide(store, index)}
          >
            Duplicate
          </button>
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => removeSlide(store, index)}
          >
            Remove
          </button>
        </div>
      </div>

      <FieldShell
        id="pq-editor-question"
        label={textLabel(type)}
        description={textHint(type)}
      >
        <DraftText
          id="pq-editor-question"
          value={question}
          multiline
          rows={3}
          onCommit={(value) => setFieldValue(store, index, "Question", value)}
        />
      </FieldShell>

      <FieldShell
        id="pq-editor-type"
        label="Type"
        description="What this block is. Open asks for typed text; the rest show answers."
      >
        <Select
          id="pq-editor-type"
          value={type === QuestionType.Open ? "" : type}
          options={TYPE_OPTIONS}
          emptyLabel="open (default)"
          onChange={(value) => setFieldValue(store, index, "Type", value)}
        />
      </FieldShell>

      {isScreen ? null : (
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
      )}

      <FieldShell
        id="pq-editor-media"
        label="Media"
        description="Pick a file to copy it into media/, or add any path you like."
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
            <button
              type="button"
              class="pq-editor-button"
              onClick={() => addMedia(store, index, "")}
            >
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
          <details class="pq-editor-more" key={group}>
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
