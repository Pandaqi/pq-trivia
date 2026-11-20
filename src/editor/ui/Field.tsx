/**
 * One form row.
 *
 * Text inputs commit on blur or Enter. Those are the edits that must not fight
 * the author's cursor: every commit reparses and rewrites the block.
 */

import type { ComponentChildren, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Bubble } from "../../shared/bubble";
import { FieldKind } from "../fields";
import { useEditorT } from "./i18n";
import { ListEditor } from "./ListEditor";

export interface FieldShellProps {
  readonly id: string;
  readonly label: string;
  readonly description?: string | undefined;
  readonly children: ComponentChildren;
}

export function FieldShell({
  id,
  label,
  description,
  children,
}: FieldShellProps): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const hasNote = description !== undefined && description.length > 0;
  return (
    <div
      ref={host}
      class={hasNote ? "pq-editor-field pq-editor-has-note" : "pq-editor-field"}
      onPointerEnter={() => setOpen(hasNote)}
      onPointerLeave={() => setOpen(false)}
      onFocusIn={() => setOpen(hasNote)}
      onFocusOut={() => setOpen(false)}
    >
      <label class="pq-editor-label" for={id}>
        {label}
      </label>
      {children}
      {open && hasNote ? (
        <Bubble
          anchor={host}
          text={description}
          class="pq-editor-bubble"
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

export interface DraftTextProps {
  readonly id: string;
  readonly value: string;
  readonly onCommit: (value: string) => void;
  readonly multiline?: boolean | undefined;
  readonly rows?: number | undefined;
  readonly numeric?: boolean | undefined;
  readonly placeholder?: string | undefined;
}

export function DraftText(props: DraftTextProps): JSX.Element {
  const [draft, setDraft] = useState(props.value);

  useEffect(() => {
    setDraft(props.value);
  }, [props.value]);

  const commit = (): void => {
    if (draft !== props.value) {
      props.onCommit(draft);
    }
  };
  const handleInput = (event: Event): void => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      setDraft(target.value);
    }
  };
  const handleKeys = (event: KeyboardEvent): void => {
    if (event.key !== "Enter") {
      return;
    }
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      target.blur();
    }
  };

  if (props.multiline === true) {
    return (
      <textarea
        id={props.id}
        class="pq-editor-input"
        rows={props.rows ?? 3}
        value={draft}
        placeholder={props.placeholder ?? ""}
        onInput={handleInput}
        onBlur={commit}
      />
    );
  }

  // Preact types input `type` as a discriminated union, so the two kinds of
  // field get their own element instead of one variable.
  const shared = {
    id: props.id,
    class: "pq-editor-input",
    value: draft,
    placeholder: props.placeholder ?? "",
    autocomplete: "off",
    onInput: handleInput,
    onBlur: commit,
    onKeyDown: handleKeys,
  };

  if (props.numeric === true) {
    return <input {...shared} type="number" />;
  }

  return <input {...shared} type="text" />;
}

export interface SelectProps {
  readonly id: string;
  readonly value: string;
  readonly options: readonly string[];
  readonly onChange: (value: string) => void;
  readonly emptyLabel?: string | undefined;
}

export function Select({
  id,
  value,
  options,
  onChange,
  emptyLabel,
}: SelectProps): JSX.Element {
  const t = useEditorT();
  // A value that is not in the list still shows, so a hand edit is not eaten.
  const values =
    value.length === 0 || options.includes(value)
      ? options
      : [value, ...options];
  return (
    <select
      id={id}
      class="pq-editor-input"
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    >
      <option value="">{emptyLabel ?? t("editorDefault")}</option>
      {values.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export interface RowSpec {
  readonly key: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly description: string;
  readonly descriptionKey: string;
  readonly options?: readonly string[] | undefined;
}

export interface FieldRowProps {
  readonly field: RowSpec;
  readonly values: readonly string[];
  readonly onChange: (values: string[]) => void;
}

export function FieldRow({
  field,
  values,
  onChange,
}: FieldRowProps): JSX.Element {
  const t = useEditorT();
  const id = `pq-editor-field-${field.key}`;
  const single = values[0] ?? "";

  const commit = (value: string): void => {
    const trimmed = value.trim();
    onChange(trimmed.length === 0 ? [] : [trimmed]);
  };

  const list = ((): JSX.Element => {
    const remove = (index: number): void => {
      const next = [...values];
      next.splice(index, 1);
      onChange(next);
    };
    const move = (index: number, delta: number): void => {
      const next = [...values];
      const target = index + delta;
      const moved = next[index];
      const swapped = next[target];
      if (moved === undefined || swapped === undefined) {
        return;
      }
      next[index] = swapped;
      next[target] = moved;
      onChange(next);
    };
    return (
      <ListEditor
        id={id}
        values={values}
        onChange={(index, value) => {
          const next = [...values];
          next[index] = value;
          onChange(next);
        }}
        onAdd={() => onChange([...values, ""])}
        onRemove={remove}
        onMove={move}
        addLabel={t("editorAddField", { what: field.label })}
        emptyText={t("editorNothingYet")}
      />
    );
  })();

  const input = ((): JSX.Element => {
    if (field.kind === FieldKind.Boolean) {
      return (
        <Select
          id={id}
          value={single}
          options={["true", "false"]}
          onChange={(value) => commit(value)}
        />
      );
    }
    if (field.kind === FieldKind.Enum && (field.options ?? []).length > 0) {
      return (
        <Select
          id={id}
          value={single}
          options={field.options ?? []}
          onChange={(value) => commit(value)}
        />
      );
    }
    return (
      <DraftText
        id={id}
        value={single}
        numeric={field.kind === FieldKind.Number}
        placeholder={field.kind === FieldKind.Duration ? "90, 1:30, 1m30s" : ""}
        onCommit={commit}
      />
    );
  })();

  return (
    <FieldShell
      id={id}
      label={field.label}
      description={t(field.descriptionKey)}
    >
      {field.kind === FieldKind.List ? list : input}
    </FieldShell>
  );
}
