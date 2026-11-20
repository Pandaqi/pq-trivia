/**
 * Forms, generated from the attribute registry.
 *
 * Add a row to `attributeRegistry.ts` and the wizard grows a field for it.
 * There is no hand-written field list to forget, which is the whole reason
 * §10.5 of the roadmap says this stays cheap.
 */

import {
  AttributeGroup,
  AttributeType,
  QUESTION_TYPES,
} from "../core/syntax/attributes";
import {
  attributeOrder,
  listAttributes,
} from "../core/syntax/attributeRegistry";
import { ATTRIBUTE_DESCRIPTIONS } from "../core/syntax/attributeDocs";

export enum FieldKind {
  Text = "text",
  Number = "number",
  Duration = "duration",
  Boolean = "boolean",
  Enum = "enum",
  List = "list",
  Media = "media",
}

export interface FieldSpec {
  readonly key: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly group: AttributeGroup;
  readonly description: string;
  readonly options: readonly string[];
}

/** Attribute kinds that get a text input, a select, or a list of rows. */
const KIND_BY_TYPE: Readonly<Record<AttributeType, FieldKind>> = {
  [AttributeType.Text]: FieldKind.Text,
  [AttributeType.List]: FieldKind.List,
  [AttributeType.Number]: FieldKind.Number,
  [AttributeType.Boolean]: FieldKind.Boolean,
  [AttributeType.Enum]: FieldKind.Enum,
  [AttributeType.Duration]: FieldKind.Duration,
  [AttributeType.Media]: FieldKind.Media,
};

/** Values a select offers. Keys without a list get a free text field instead. */
const ENUM_OPTIONS: Readonly<Record<string, readonly string[]>> = {
  Type: QUESTION_TYPES,
  Scoring: ["all-or-nothing", "partial", "per-correct"],
  Grading: ["exact", "normalized", "fuzzy"],
  AnswersOrder: ["keep", "shuffle"],
  MediaOrder: ["keep", "shuffle"],
  Layout: ["viewport", "inline", "center", "compact", "quote", "full-bleed"],
  Direction: ["auto", "ltr", "rtl"],
  Continue: ["always", "onCorrect", "onWrong"],
};

/** Fields the wizard edits with its own widgets instead of a plain row. */
const OWN_EDITORS: ReadonlySet<string> = new Set([
  "Question",
  "Type",
  "Answers",
  "Correct",
  "Media",
]);

export const FIELD_GROUPS: readonly {
  readonly group: AttributeGroup;
  readonly label: string;
}[] = [
  { group: AttributeGroup.Content, label: "Content" },
  { group: AttributeGroup.Display, label: "Display" },
  { group: AttributeGroup.Meta, label: "Meta" },
  { group: AttributeGroup.Flow, label: "Flow" },
];

export const BLOCK_FIELDS: readonly FieldSpec[] = listAttributes()
  .filter((attribute) => !OWN_EDITORS.has(attribute.key))
  .map((attribute) => ({
    key: attribute.key,
    label: attribute.key,
    kind: KIND_BY_TYPE[attribute.type],
    group: attribute.group,
    description: ATTRIBUTE_DESCRIPTIONS[attribute.key] ?? "",
    options: ENUM_OPTIONS[attribute.key] ?? [],
  }))
  .sort((a, b) => attributeOrder(a.key) - attributeOrder(b.key));

export function fieldsInGroup(group: AttributeGroup): readonly FieldSpec[] {
  return BLOCK_FIELDS.filter((field) => field.group === group);
}

/** The header is its own namespace, so it gets its own short list. */
export interface HeaderFieldSpec {
  readonly key: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly description: string;
}

/** Title is not here: it lives in the toolbar, where you name the file. */
export const HEADER_FIELDS: readonly HeaderFieldSpec[] = [
  {
    key: "Description",
    label: "Description",
    kind: FieldKind.Text,
    description: "One line about the quiz.",
  },
  {
    key: "Author",
    label: "Author",
    kind: FieldKind.List,
    description: "Who wrote it.",
  },
  {
    key: "Theme",
    label: "Theme",
    kind: FieldKind.Text,
    description: "A theme folder name, or a path to one.",
  },
  {
    key: "Language",
    label: "Language",
    kind: FieldKind.Text,
    description: "Two-letter code for the content language.",
  },
  {
    key: "Languages",
    label: "Languages",
    kind: FieldKind.Text,
    description: "Every language the quiz ships in, separated by a bar.",
  },
  {
    key: "Date",
    label: "Date",
    kind: FieldKind.Text,
    description: "When the quiz is for.",
  },
  {
    key: "Seed",
    label: "Seed",
    kind: FieldKind.Text,
    description: "Same seed, same shuffle, every time.",
  },
];
