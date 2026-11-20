import { describe, expect, test } from "bun:test";
import {
  DiagnosticCodes,
  DiagnosticSeverity,
} from "../../src/core/syntax/diagnostics";
import {
  CODE_KEYS,
  diagnosticCopy,
  diagnosticMessage,
  diagnosticSuggestion,
} from "../../src/i18n/diagnostics";
import { translator } from "../../src/i18n/dictionary";
import { ALL_LOCALES } from "../../src/i18n/locales/all";
import type { TranslationTable } from "../../src/i18n/types";

function table(code: string): TranslationTable {
  const value = ALL_LOCALES[code];
  if (value === undefined) {
    throw new Error(`Missing locale table: ${code}`);
  }
  return value;
}

const languages = Object.keys(ALL_LOCALES).sort();
const localeTables = Object.fromEntries(
  languages.map((language) => [language, table(language)]),
);
const reference = table(languages[0] ?? "");

const keys = (table: Readonly<Record<string, string>>): string[] =>
  Object.keys(table).sort();

describe("locale tables", () => {
  test("every language has the same keys", () => {
    for (const language of languages) {
      expect(keys(table(language))).toEqual(keys(reference));
    }
  });

  test("every translation has text", () => {
    const empty = languages
      .flatMap((language) => Object.entries(table(language)))
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  test("every diagnostic code has copy in every language", () => {
    for (const code of Object.values(DiagnosticCodes)) {
      const key = CODE_KEYS[code];
      expect(key).toBeString();
      for (const language of languages) {
        expect(table(language)[key ?? ""]).toBeString();
      }
    }
  });

  test("diagnostic copy keeps the detail and the suggestion", () => {
    const diagnostic = {
      code: DiagnosticCodes.UnknownAttribute,
      severity: DiagnosticSeverity.Warning,
      message: 'Unknown attribute "Foo".',
      suggestion: "Did you mean Question?",
    };
    for (const language of languages) {
      const t = translator(language, localeTables);
      expect(diagnosticMessage(t, diagnostic)).toContain("Foo");
      expect(diagnosticSuggestion(t, diagnostic)).toContain("Question");
    }
  });

  test("dynamic diagnostic templates have copy too", () => {
    const samples = [
      'Row 3: "a", "b" is not a column this importer knows.',
      "Parts: a, b or all. Transitions: c, d.",
      "Pair: x / y.",
    ];
    for (const sample of samples) {
      const key = `diag:${diagnosticCopy(sample).key}`;
      for (const language of languages) {
        expect(table(language)[key]).toBeString();
      }
    }
  });
});
