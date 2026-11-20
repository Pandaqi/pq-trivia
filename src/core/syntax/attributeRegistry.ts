/**
 * The attribute table and its lookups.
 *
 * One row per attribute, in formatter order. Adding a row teaches the parser,
 * the formatter and the docs command about it. Descriptions stay in
 * `attributeDocs.ts`, out of the player bundle.
 */

import {
  AttributeGroup,
  AttributeType,
  type AttributeSpec,
} from "./attributes";
import { CONFIG_HEADER_NAMES } from "./configAttributes";

type Row = readonly [
  key: string,
  aliases: readonly string[],
  type: AttributeType,
  group: AttributeGroup,
];

const ROWS: readonly Row[] = [
  ["Question", ["Q"], AttributeType.List, AttributeGroup.Core],
  ["Type", [], AttributeType.Enum, AttributeGroup.Core],
  ["Answers", ["Answer", "A"], AttributeType.List, AttributeGroup.Core],
  ["Correct", ["CorrectAnswer"], AttributeType.List, AttributeGroup.Core],
  ["Range", ["Margin"], AttributeType.Number, AttributeGroup.Core],
  ["Tolerance", [], AttributeType.Number, AttributeGroup.Core],
  ["Unit", [], AttributeType.Text, AttributeGroup.Core],
  ["Slider", [], AttributeType.Text, AttributeGroup.Core],
  ["HitRadius", [], AttributeType.Number, AttributeGroup.Core],
  ["Negate", [], AttributeType.Boolean, AttributeGroup.Core],
  ["Feedback", [], AttributeType.List, AttributeGroup.Content],
  ["Suggest", [], AttributeType.List, AttributeGroup.Content],
  ["Rows", [], AttributeType.List, AttributeGroup.Content],
  ["Scale", [], AttributeType.List, AttributeGroup.Content],
  ["Multiple", [], AttributeType.Boolean, AttributeGroup.Content],
  ["Parts", [], AttributeType.List, AttributeGroup.Content],
  ["Buckets", [], AttributeType.List, AttributeGroup.Content],
  ["Targets", [], AttributeType.List, AttributeGroup.Content],
  ["PlayLimit", [], AttributeType.Number, AttributeGroup.Content],
  ["Pool", [], AttributeType.Number, AttributeGroup.Content],
  ["Difficulty", [], AttributeType.Number, AttributeGroup.Content],
  ["Variants", [], AttributeType.List, AttributeGroup.Content],
  ["RoundTimer", [], AttributeType.Duration, AttributeGroup.Content],
  ["Notes", ["PresenterNotes"], AttributeType.List, AttributeGroup.Content],
  ["Wager", [], AttributeType.Boolean, AttributeGroup.Content],
  ["Buzzer", [], AttributeType.Boolean, AttributeGroup.Content],
  ["ID", ["Id"], AttributeType.Text, AttributeGroup.Core],
  ["Section", ["Round"], AttributeType.Text, AttributeGroup.Core],
  ["PlaceAt", [], AttributeType.Number, AttributeGroup.Core],
  ["PlaceBefore", [], AttributeType.List, AttributeGroup.Core],
  ["PlaceAfter", [], AttributeType.List, AttributeGroup.Core],
  ["AnswersOrder", [], AttributeType.Enum, AttributeGroup.Core],
  ["MediaOrder", [], AttributeType.Enum, AttributeGroup.Core],
  ["Buttons", [], AttributeType.List, AttributeGroup.Core],
  ["Timer", ["Time"], AttributeType.Duration, AttributeGroup.Core],
  [
    "Media",
    ["Image", "Audio", "Video"],
    AttributeType.Media,
    AttributeGroup.Content,
  ],
  [
    "Category",
    ["Categories", "Tag", "Tags"],
    AttributeType.List,
    AttributeGroup.Content,
  ],
  ["Author", ["Authors", "By"], AttributeType.List, AttributeGroup.Content],
  ["Score", ["Points"], AttributeType.Number, AttributeGroup.Content],
  ["Scoring", ["ScoreMethod"], AttributeType.Enum, AttributeGroup.Content],
  ["Grading", [], AttributeType.Enum, AttributeGroup.Content],
  ["FuzzyDistance", [], AttributeType.Number, AttributeGroup.Content],
  [
    "AlsoAccept",
    ["Aliases", "Accept"],
    AttributeType.List,
    AttributeGroup.Content,
  ],
  ["Reject", [], AttributeType.List, AttributeGroup.Content],
  ["Explanation", ["Explain"], AttributeType.Text, AttributeGroup.Content],
  ["Comment", ["Comments", "Note"], AttributeType.List, AttributeGroup.Content],
  ["Hints", ["Hint"], AttributeType.List, AttributeGroup.Content],
  ["Sources", ["Source"], AttributeType.List, AttributeGroup.Content],
  ["Description", [], AttributeType.Text, AttributeGroup.Content],
  ["Alt", [], AttributeType.List, AttributeGroup.Content],
  ["Variant", [], AttributeType.Text, AttributeGroup.Content],
  ["SyncAll", [], AttributeType.Boolean, AttributeGroup.Content],
  ["Secret", ["Theme"], AttributeType.Text, AttributeGroup.Display],
  ["FormatText", [], AttributeType.Boolean, AttributeGroup.Display],
  ["HiddenAtPlay", ["Hide"], AttributeType.Boolean, AttributeGroup.Display],
  ["HiddenAtExport", [], AttributeType.Boolean, AttributeGroup.Display],
  ["Class", ["Classes"], AttributeType.List, AttributeGroup.Display],
  ["Layout", [], AttributeType.Enum, AttributeGroup.Display],
  ["Background", [], AttributeType.Text, AttributeGroup.Display],
  ["ColorScheme", [], AttributeType.Text, AttributeGroup.Display],
  ["Transition", ["Animation"], AttributeType.Text, AttributeGroup.Display],
  ["Reveal", [], AttributeType.Text, AttributeGroup.Display],
  ["Steps", [], AttributeType.List, AttributeGroup.Display],
  ["StepTransition", [], AttributeType.Text, AttributeGroup.Display],
  ["Print", [], AttributeType.List, AttributeGroup.Display],
  ["Direction", ["Dir"], AttributeType.Enum, AttributeGroup.Display],
  ["Height", [], AttributeType.Text, AttributeGroup.Display],
  ["PrintFallback", [], AttributeType.Text, AttributeGroup.Display],
  ["Credits", [], AttributeType.List, AttributeGroup.Meta],
  ["Language", ["Lang"], AttributeType.Text, AttributeGroup.Meta],
  ["Translation", ["TranslationOf"], AttributeType.Text, AttributeGroup.Meta],
  ["Unlock", [], AttributeType.Text, AttributeGroup.Flow],
  ["When", [], AttributeType.Text, AttributeGroup.Flow],
  ["Continue", [], AttributeType.Enum, AttributeGroup.Flow],
  ["Include", ["Import"], AttributeType.List, AttributeGroup.Flow],
  ["Script", [], AttributeType.Text, AttributeGroup.Flow],
];

export const ATTRIBUTES: readonly AttributeSpec[] = ROWS.map(
  ([key, aliases, type, group]) => ({ key, aliases, type, group }),
);

const META_HEADER_KEYS: readonly string[] = [
  "Quiz",
  "Syntax",
  "Language",
  "Languages",
  "Title",
  "Theme",
  "Description",
  "Date",
  "Seed",
  "Author",
  "Version",
  "License",
  "Homepage",
  "Image",
];

/**
 * Header keys, plus every global setting a file may set for itself. The config
 * names are registered here so a `Grading =>` or `Include =>` line at the top
 * stays a setting instead of opening a question block.
 */
export const HEADER_KEYS: readonly string[] = [
  ...META_HEADER_KEYS,
  ...CONFIG_HEADER_NAMES.filter((name) => !META_HEADER_KEYS.includes(name)),
];

const BY_NAME = new Map<string, AttributeSpec>();
for (const attribute of ATTRIBUTES) {
  BY_NAME.set(attribute.key.toLowerCase(), attribute);
  for (const alias of attribute.aliases) {
    BY_NAME.set(alias.toLowerCase(), attribute);
  }
}

const ORDER = new Map<string, number>();
ATTRIBUTES.forEach((attribute, index) => {
  ORDER.set(attribute.key, index);
});

export function findAttribute(rawKey: string): AttributeSpec | undefined {
  return BY_NAME.get(rawKey.trim().toLowerCase());
}

/** Header attributes live in their own namespace: `Theme` means the theme there. */
export function findHeaderKey(rawKey: string): string | undefined {
  const key = rawKey.trim().toLowerCase();
  return HEADER_KEYS.find((candidate) => candidate.toLowerCase() === key);
}

export function attributeOrder(key: string): number {
  return ORDER.get(key) ?? ATTRIBUTES.length;
}

export function listAttributes(): readonly AttributeSpec[] {
  return ATTRIBUTES;
}

export function isListAttribute(key: string): boolean {
  const attribute = findAttribute(key);
  if (!attribute) {
    return false;
  }
  return (
    attribute.type === AttributeType.List ||
    attribute.type === AttributeType.Media
  );
}

function editDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a.length === 0 || b.length === 0) {
    return Math.max(a.length, b.length);
  }
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const insert = (current[j - 1] ?? 0) + 1;
      const del = (previous[j] ?? 0) + 1;
      const swap =
        (previous[j - 1] ?? 0) + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1);
      current[j] = Math.min(insert, del, swap);
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/** `Quesiton` should suggest `Question`, not shrug. */
export function nearestAttributeName(rawKey: string): string | undefined {
  const key = rawKey.trim().toLowerCase();
  let best: string | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  const candidates = [
    ...ATTRIBUTES.flatMap((attribute) => [attribute.key, ...attribute.aliases]),
    ...HEADER_KEYS,
  ];
  for (const candidate of candidates) {
    const distance = editDistance(key, candidate.toLowerCase());
    if (distance < bestScore) {
      bestScore = distance;
      best = candidate;
    }
  }
  const limit = key.length <= 4 ? 1 : 3;
  return bestScore <= limit ? best : undefined;
}
