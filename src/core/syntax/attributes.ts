/** Attribute kinds and groups. The table lives in `attributeRegistry.ts`. */

export enum AttributeType {
  Text = "text",
  List = "list",
  Number = "number",
  Boolean = "boolean",
  Enum = "enum",
  Duration = "duration",
  Media = "media",
}

export enum AttributeGroup {
  Core = "core",
  Content = "content",
  Display = "display",
  Meta = "meta",
  Flow = "flow",
}

export interface AttributeSpec {
  /** Canonical name, as the formatter writes it. */
  readonly key: string;
  readonly aliases: readonly string[];
  readonly type: AttributeType;
  readonly group: AttributeGroup;
}

export const QUESTION_TYPES = [
  "open",
  "choice",
  "list",
  "range",
  "sort",
  "match",
  "cloze",
  "section",
  "start",
  "end",
  "custom",
] as const;
