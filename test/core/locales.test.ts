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
import { pluralKey } from "../../src/core/values/marks";
import { translate, translator } from "../../src/i18n/dictionary";
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

/** `{points}` and `{unit}` are contract, not decoration. */
const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? "").sort();

describe("locale tables", () => {
  test("every language has the same keys", () => {
    for (const language of languages) {
      expect(keys(table(language))).toEqual(keys(reference));
    }
  });

  test("every translation keeps the placeholders of its English key", () => {
    const english = table("en");
    const problems: string[] = [];
    for (const language of languages) {
      if (language === "en") {
        continue;
      }
      const copy = table(language);
      for (const [key, source] of Object.entries(english)) {
        const wanted = placeholders(source).join(",");
        const given = placeholders(copy[key] ?? "").join(",");
        if (wanted !== given) {
          problems.push(
            `${language} ${key}: expected {${wanted}}, got {${given}}`,
          );
        }
      }
    }
    expect(problems).toEqual([]);
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

  test("counts take one, few or other", () => {
    const word = (language: string, count: number): string =>
      translate(language, pluralKey(count, "point"));
    expect(word("en", 1)).toBe("point");
    expect(word("en", 3)).toBe("points");
    expect(word("en", 5)).toBe("points");
    expect(word("de", 3)).toBe("Punkte");
    expect(word("de", 5)).toBe("Punkte");
    expect(translate("en", pluralKey(3, "problemsFound"), { count: 3 })).toBe(
      "3 problems found",
    );
  });

  test("Polish counts agree above four", () => {
    const word = (count: number): string =>
      translate("pl", pluralKey(count, "point"));
    expect(word(1)).toBe("punkt");
    expect(word(2)).toBe("punkty");
    expect(word(4)).toBe("punkty");
    expect(word(5)).toBe("punktów");
    expect(word(12)).toBe("punktów");
    expect(word(21)).toBe("punktów");
    expect(word(22)).toBe("punkty");
    expect(word(25)).toBe("punktów");
    expect(translate("pl", pluralKey(3, "question"))).toBe("pytania");
    expect(translate("pl", pluralKey(8, "question"))).toBe("pytań");
    expect(translate("pl", pluralKey(8, "round"))).toBe("rund");
    expect(translate("pl", pluralKey(3, "problemsFound"), { count: 3 })).toBe(
      "Znaleziono 3 problemy",
    );
    expect(translate("pl", pluralKey(5, "problemsFound"), { count: 5 })).toBe(
      "Znaleziono 5 problemów",
    );
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
