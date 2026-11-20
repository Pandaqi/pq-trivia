/** Diagnostics, deduplicated, dismissible. A quiz should never nag twice. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { Diagnostic } from "../../../core/syntax/diagnostics";
import {
  diagnosticMessage,
  diagnosticSuggestion,
} from "../../../i18n/diagnostics";
import { useT } from "../i18n";

/** One localized line, with the reference for the full explanation. */
export function ProblemRow({
  diagnostic,
}: {
  readonly diagnostic: Diagnostic;
}): JSX.Element {
  const t = useT();
  const suggestion = diagnosticSuggestion(t, diagnostic);
  return (
    <li>
      <strong>{diagnostic.code}</strong> {diagnosticMessage(t, diagnostic)}
      {suggestion === null ? null : (
        <span class="pq-suggestion"> {suggestion}</span>
      )}
      {diagnostic.docsUrl === undefined ? null : (
        <a
          class="pq-suggestion"
          href={diagnostic.docsUrl}
          target="_blank"
          rel="noreferrer"
        >
          {" "}
          {t("diagOpenReference")}
        </a>
      )}
    </li>
  );
}

function uniqueProblems(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  const out: Diagnostic[] = [];
  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.code}:${diagnostic.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(diagnostic);
  }
  return out;
}

export function Problems({
  diagnostics,
  limit = 6,
}: {
  readonly diagnostics: readonly Diagnostic[];
  readonly limit?: number;
}): JSX.Element | null {
  const t = useT();
  const [open, setOpen] = useState(true);
  const problems = uniqueProblems(diagnostics);

  // The panel steps aside after a while; the count stays, so nothing is lost.
  useEffect(() => {
    const timer = setTimeout(() => setOpen(false), 20_000);
    return () => clearTimeout(timer);
  }, []);

  if (problems.length === 0) {
    return null;
  }
  if (!open) {
    return (
      <button
        type="button"
        class="pq-problems-reopen"
        onClick={() => setOpen(true)}
      >
        {t(problems.length === 1 ? "problemsReopen" : "problemsReopenPlural", {
          count: problems.length,
        })}
      </button>
    );
  }

  return (
    <aside class="pq-problems-panel" aria-label={t("problemsWithQuiz")}>
      <p class="pq-problems-title">
        {t(problems.length === 1 ? "problemsFound" : "problemsFoundPlural", {
          count: problems.length,
        })}
        <button
          type="button"
          class="pq-problems-close"
          aria-label={t("problemsDismiss")}
          onClick={() => setOpen(false)}
        >
          ×
        </button>
      </p>
      <ul class="pq-problems">
        {problems.slice(0, limit).map((problem, index) => (
          <ProblemRow key={index} diagnostic={problem} />
        ))}
      </ul>
      {problems.length > limit ? (
        <p class="pq-suggestion">
          {t("problemsMore", { count: problems.length - limit })}
        </p>
      ) : null}
    </aside>
  );
}
