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
import type { Translate } from "../../i18n/types";
import type { EditorOptions } from "../mount";
import { HEADER_INDEX, slideAt, slideKindLabel, slideLabel } from "../slides";
import type { EditorSnapshot, EditorStore } from "../store";
import type { SlideInfo } from "../slides";
import { DraftText, FieldRow, FieldShell, Select } from "./Field";
import { useEditorT } from "./i18n";
import { NoteHead } from "./NoteHead";
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

const ANSWER_HINT_KEYS: Readonly<Record<string, string>> = {
  [QuestionType.Open]: "editorCorrectHintOpen",
  [QuestionType.Choice]: "editorCorrectHintChoice",
  [QuestionType.List]: "editorCorrectHintList",
  [QuestionType.Sort]: "editorCorrectHintSort",
  [QuestionType.Range]: "editorCorrectHintRange",
  [QuestionType.Match]: "editorCorrectHintMatch",
  [QuestionType.Cloze]: "editorCorrectHintCloze",
};

function textLabel(type: string, t: Translate): string {
  if (type === QuestionType.Section) {
    return t("editorRoundName");
  }
  if (SCREENS.has(type)) {
    return t("editorScreenText");
  }
  return t("editorQuestionText");
}

function textHint(type: string, t: Translate): string {
  if (type === QuestionType.Section) {
    return t("editorTextHintRound");
  }
  if (SCREENS.has(type)) {
    return t("editorTextHintScreen");
  }
  return t("editorTextHintQuestion");
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
  const t = useEditorT();
  const empty = snapshot.slides.length === 1;
  return (
    <section class="pq-editor-panel" aria-label={t("editorQuizSettings")}>
      <NoteHead
        label={t("editorQuizSettings")}
        note={t("editorQuizSettingsNote")}
      />
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
          {t("editorNoSlides", { button: t("editorAddQuestion") })}
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
  const t = useEditorT();
  const slide: SlideInfo | undefined = slideAt(snapshot.slides, index);
  const type =
    valuesFor(snapshot, index, "Type")[0]?.toLowerCase() ?? QuestionType.Open;
  const question = valuesFor(snapshot, index, "Question")[0] ?? "";
  const answers = valuesFor(snapshot, index, "Answers");
  const correct = valuesFor(snapshot, index, "Correct");
  const media = valuesFor(snapshot, index, "Media");
  const isScreen = SCREENS.has(type);
  const showCorrect = !NO_CORRECT.has(type);
  const correctProps = showCorrect
    ? {
        correct,
        onToggleCorrect: (value: string) => toggleCorrect(store, index, value),
      }
    : {};

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
          ? t("editorCopiedMedia", { name: picked.name })
          : t("editorMediaPath", { name: picked.name }),
      );
    });
  };

  return (
    <section class="pq-editor-panel" aria-label={t("editorSlideEditor")}>
      <div class="pq-editor-panel-head">
        <h2>
          <span class="pq-editor-kind">
            {slide === undefined
              ? t("editorSlide")
              : slideKindLabel(t, slide.kind)}
          </span>
          {slide === undefined ? t("editorSlide") : slideLabel(t, slide)}
        </h2>
        <div class="pq-editor-actions">
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => moveSlide(store, index, -1)}
            disabled={index === 0}
            title={t("editorAltUp")}
          >
            ↑
          </button>
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => moveSlide(store, index, 1)}
            disabled={index >= snapshot.slides.length - 2}
            title={t("editorAltDown")}
          >
            ↓
          </button>
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => duplicateSlide(store, index)}
          >
            {t("editorDuplicate")}
          </button>
          <button
            type="button"
            class="pq-editor-button"
            onClick={() => removeSlide(store, index)}
          >
            {t("editorRemove")}
          </button>
        </div>
      </div>

      <FieldShell
        id="pq-editor-question"
        label={textLabel(type, t)}
        description={textHint(type, t)}
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
        label={t("editorType")}
        description={t("editorTypeNote")}
      >
        <Select
          id="pq-editor-type"
          value={type === QuestionType.Open ? "" : type}
          options={TYPE_OPTIONS}
          emptyLabel={t("editorOpenDefault")}
          onChange={(value) => setFieldValue(store, index, "Type", value)}
        />
      </FieldShell>

      {isScreen ? null : (
        <FieldShell
          id="pq-editor-answers"
          label={t("editorAnswers")}
          description={t(ANSWER_HINT_KEYS[type] ?? "")}
        >
          <ListEditor
            id="pq-editor-answers"
            values={answers}
            {...correctProps}
            onChange={(at, value) => setAnswerAt(store, index, at, value)}
            onAdd={() => addAnswer(store, index)}
            onRemove={(at) => removeAnswer(store, index, at)}
            onMove={(at, delta) => moveAnswer(store, index, at, delta)}
            addLabel={t("editorAddAnswer")}
            emptyText={t("editorOpenAnswers")}
          />
        </FieldShell>
      )}

      <FieldShell
        id="pq-editor-media"
        label={t("editorMedia")}
        description={t("editorMediaNote")}
      >
        <ListEditor
          id="pq-editor-media"
          values={media}
          onChange={(at, value) => setMediaAt(store, index, at, value)}
          onAdd={addMediaClick}
          onRemove={(at) => removeMedia(store, index, at)}
          onMove={(at, delta) => moveMedia(store, index, at, delta)}
          addLabel={t("editorAddFile")}
          emptyText={t("editorNoMedia")}
          extra={
            <button
              type="button"
              class="pq-editor-button"
              onClick={() => addMedia(store, index, "")}
            >
              {t("editorAddPath")}
            </button>
          }
        />
      </FieldShell>

      {FIELD_GROUPS.map(({ group, labelKey }) => {
        const fields = fieldsInGroup(group);
        if (fields.length === 0) {
          return null;
        }
        return (
          <details class="pq-editor-more" key={group}>
            <summary>{t(labelKey)}</summary>
            <div class="pq-editor-more-body">
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
            </div>
          </details>
        );
      })}
    </section>
  );
}
