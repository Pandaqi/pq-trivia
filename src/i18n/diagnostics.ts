/** A diagnostic sentence in the interface language. */

import type { Diagnostic } from "../core/syntax/diagnostics";
import type { Translate } from "./types";

export const COPY_PREFIX = "diag:";

export const CODE_KEYS: Readonly<Record<string, string>> = {
  PQ101: "diagUnknownAttribute",
  PQ102: "diagInvalidLine",
  PQ103: "diagEmptyList",
  PQ104: "diagInvalidBoolean",
  PQ105: "diagInvalidNumber",
  PQ106: "diagInvalidDuration",
  PQ107: "diagInvalidValue",
  PQ108: "diagMissingQuestion",
  PQ109: "diagMissingAnswers",
  PQ110: "diagDuplicateId",
  PQ111: "diagUnclosedComment",
  PQ112: "diagUnknownType",
  PQ113: "diagCorrectNotInAnswers",
  PQ201: "diagInvalidInline",
  PQ202: "diagUnsafeLink",
  PQ203: "diagInvalidStyle",
  PQ301: "diagUnknownRound",
  PQ302: "diagDuplicateQuestion",
  PQ303: "diagNearDuplicate",
  PQ401: "diagPlanConflict",
  PQ402: "diagUnknownPlacement",
};

export interface DiagnosticCopy {
  readonly key: string;
  readonly params: Readonly<Record<string, string>>;
}

/**
 * Turn a diagnostic into a stable template plus values. Quotes and backticks
 * hold names, values and code; numbers hold counts. The normalized sentence
 * stays the key, so no second list of names can drift.
 */
export function diagnosticCopy(text: string): DiagnosticCopy {
  const values: string[] = [];
  const take = (value: string): string => {
    values.push(value);
    return `\u0000${values.length - 1}\u0000`;
  };
  const direct = (key: string, params: readonly string[]): DiagnosticCopy => ({
    key,
    params: Object.fromEntries(
      params.map((value, index) => [String(index), value]),
    ),
  });

  const event = /^An event handler for "([^"]+)" threw: (.*)$/.exec(text);
  if (event !== null) {
    return direct('An event handler for "{0}" threw: {1}', [
      event[1] ?? "",
      event[2] ?? "",
    ]);
  }
  const load = /^Could not load the quiz: (.*)$/.exec(text);
  if (load !== null) {
    return direct("Could not load the quiz: {0}", [load[1] ?? ""]);
  }
  const flow = /^Flow condition: (.*)$/.exec(text);
  if (flow !== null) {
    return direct("Flow condition: {0}", [flow[1] ?? ""]);
  }
  const marker = /^Formatting marker (.) was never closed\.$/.exec(text);
  if (marker !== null) {
    return direct("Formatting marker {0} was never closed.", [marker[1] ?? ""]);
  }
  const mean = /^Did you mean (.*)\?$/.exec(text);
  if (mean !== null) {
    return direct("Did you mean {0}?", [mean[1] ?? ""]);
  }
  const fallingBack = /^Allowed: (.*)\. Falling back to open\.$/.exec(text);
  if (fallingBack !== null) {
    return direct("Allowed: {0}. Falling back to open.", [
      fallingBack[1] ?? "",
    ]);
  }
  const allowed = /^Allowed: (.*)\.$/.exec(text);
  if (allowed !== null) {
    return direct("Allowed: {0}.", [allowed[1] ?? ""]);
  }
  const rowColumn =
    /^Row (\d+): "(.*)" is not a column this importer knows\.$/.exec(text);
  if (rowColumn !== null) {
    return direct('Row {0}: "{1}" is not a column this importer knows.', [
      rowColumn[1] ?? "",
      rowColumn[2] ?? "",
    ]);
  }
  const partsAll = /^Parts: (.*) or all\. Transitions: (.*)\.$/.exec(text);
  if (partsAll !== null) {
    return direct("Parts: {0} or all. Transitions: {1}.", [
      partsAll[1] ?? "",
      partsAll[2] ?? "",
    ]);
  }
  const parts = /^Parts: (.*)\. Transitions: (.*)\.$/.exec(text);
  if (parts !== null) {
    return direct("Parts: {0}. Transitions: {1}.", [
      parts[1] ?? "",
      parts[2] ?? "",
    ]);
  }
  const pair = /^Pair: (.*)\.$/.exec(text);
  if (pair !== null) {
    return direct("Pair: {0}.", [pair[1] ?? ""]);
  }
  if (text === "Try 90, 1:30 or 1m30s.") {
    return direct("Try 90, 1:30 or 1m30s.", []);
  }
  if (text === "Try 3, or easy, medium, hard.") {
    return direct("Try 3, or easy, medium, hard.", []);
  }
  const attempt = /^Try (.*)\.$/.exec(text);
  if (attempt !== null) {
    return direct("Try {0}.", [attempt[1] ?? ""]);
  }
  const literal = /^Close it, or write (.*) for literal text\.$/.exec(text);
  if (literal !== null) {
    return direct("Close it, or write {0} for literal text.", [
      literal[1] ?? "",
    ]);
  }
  if (text === "Close it with ```.") {
    return direct("Close it with ```.", []);
  }
  const typing = /^A (\w[\w-]*) question needs at least two answers\.$/.exec(
    text,
  );
  if (typing !== null) {
    return direct("A {0} question needs at least two answers.", [
      typing[1] ?? "",
    ]);
  }
  const duplicatePair =
    /^If they are, keep one\. If not, change the wording a little\. Pair: (.*)\.$/.exec(
      text,
    );
  if (duplicatePair !== null) {
    return direct(
      "If they are, keep one. If not, change the wording a little. Pair: {0}.",
      [duplicatePair[1] ?? ""],
    );
  }

  const key = text
    .replace(
      /"([^"]*)"|`([^`]*)`|\b\d+(?:[.,]\d+)?\b/g,
      (_match, quoted, code, number) => {
        if (quoted !== undefined) {
          return `"${take(quoted)}"`;
        }
        if (code !== undefined) {
          return `\`${take(code)}\``;
        }
        return take(number ?? "");
      },
    )
    .replace(/\u0000(\d+)\u0000/g, (_match, index: string) => `{${index}}`);
  return direct(key, values);
}

function fallbackCopy(diagnostic: Diagnostic): DiagnosticCopy {
  return {
    key: CODE_KEYS[diagnostic.code] ?? "diagUnknown",
    params: { code: diagnostic.code },
  };
}

function translatedCopy(t: Translate, copy: DiagnosticCopy): string | null {
  const key = `${COPY_PREFIX}${copy.key}`;
  if (t(key) === key) {
    return null;
  }
  return t(key, copy.params);
}

export function diagnosticMessage(
  t: Translate,
  diagnostic: Diagnostic,
): string {
  const translated = translatedCopy(t, diagnosticCopy(diagnostic.message));
  if (translated !== null) {
    return translated;
  }
  const fallback = fallbackCopy(diagnostic);
  return t(fallback.key, fallback.params);
}

export function diagnosticSuggestion(
  t: Translate,
  diagnostic: Diagnostic,
): string | null {
  if (diagnostic.suggestion === undefined) {
    return null;
  }
  return translatedCopy(t, diagnosticCopy(diagnostic.suggestion));
}
