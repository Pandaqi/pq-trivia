/**
 * Every problem the engine can report has a code, a place, a sentence and a
 * suggestion. No silent drops.
 */

export enum DiagnosticSeverity {
  Debug = "debug",
  Info = "info",
  Warning = "warning",
  Error = "error",
}

/** PQ1xx syntax, PQ2xx values, PQ3xx model, PQ4xx plan, PQ5xx session, PQ6xx export. */
export const DiagnosticCodes = {
  UnknownAttribute: "PQ101",
  InvalidLine: "PQ102",
  EmptyList: "PQ103",
  InvalidBoolean: "PQ104",
  InvalidNumber: "PQ105",
  InvalidDuration: "PQ106",
  InvalidValue: "PQ107",
  MissingQuestion: "PQ108",
  MissingAnswers: "PQ109",
  DuplicateId: "PQ110",
  UnclosedComment: "PQ111",
  UnknownType: "PQ112",
  CorrectNotInAnswers: "PQ113",
  InvalidInline: "PQ201",
  UnsafeLink: "PQ202",
  InvalidStyle: "PQ203",
  UnknownRound: "PQ301",
  DuplicateQuestion: "PQ302",
  NearDuplicate: "PQ303",
  PlanConflict: "PQ401",
  UnknownPlacement: "PQ402",
} as const;

export type DiagnosticCode =
  (typeof DiagnosticCodes)[keyof typeof DiagnosticCodes];

export const DOCS_BASE =
  "https://pandaqi.github.io/pq-trivia/syntax/reference.html";

export interface SourceLocation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
}

export interface Diagnostic {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly location?: SourceLocation;
  readonly suggestion?: string;
  readonly docsUrl?: string;
}

export interface DiagnosticInput {
  readonly location?: SourceLocation;
  readonly suggestion?: string;
}

interface MutableDiagnostic {
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  location?: SourceLocation;
  suggestion?: string;
  docsUrl: string;
}

export function createDiagnostic(
  code: string,
  severity: DiagnosticSeverity,
  message: string,
  input: DiagnosticInput = {},
): Diagnostic {
  const diagnostic: MutableDiagnostic = {
    code,
    severity,
    message,
    docsUrl: `${DOCS_BASE}#${code}`,
  };
  if (input.location) {
    diagnostic.location = input.location;
  }
  if (input.suggestion) {
    diagnostic.suggestion = input.suggestion;
  }
  return diagnostic;
}

export const syntaxError = (
  code: string,
  message: string,
  input?: DiagnosticInput,
): Diagnostic =>
  createDiagnostic(code, DiagnosticSeverity.Error, message, input);

export const syntaxWarning = (
  code: string,
  message: string,
  input?: DiagnosticInput,
): Diagnostic =>
  createDiagnostic(code, DiagnosticSeverity.Warning, message, input);

export const syntaxInfo = (
  code: string,
  message: string,
  input?: DiagnosticInput,
): Diagnostic =>
  createDiagnostic(code, DiagnosticSeverity.Info, message, input);

export function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some(
    (diagnostic) => diagnostic.severity === DiagnosticSeverity.Error,
  );
}

export function countBySeverity(
  diagnostics: readonly Diagnostic[],
  severity: DiagnosticSeverity,
): number {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity)
    .length;
}

/** One line, the way a terminal or a diagnostics panel shows it. */
export function formatDiagnostic(diagnostic: Diagnostic): string {
  const place = diagnostic.location
    ? `${diagnostic.location.file}:${diagnostic.location.line}:${diagnostic.location.column}`
    : "";
  const head = place.length > 0 ? `${place} ` : "";
  const tail = diagnostic.suggestion ? ` ${diagnostic.suggestion}` : "";
  return `${head}${diagnostic.code} ${diagnostic.message}${tail}`.trim();
}
