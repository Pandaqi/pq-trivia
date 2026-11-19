/** Diagnostics, deduplicated, dismissible. A quiz should never nag twice. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { Diagnostic } from "../../../core/syntax/diagnostics";

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
        {problems.length} problem{problems.length === 1 ? "" : "s"}
      </button>
    );
  }

  return (
    <aside class="pq-problems-panel" aria-label="Problems with this quiz">
      <p class="pq-problems-title">
        {problems.length} problem{problems.length === 1 ? "" : "s"} found
        <button
          type="button"
          class="pq-problems-close"
          aria-label="Dismiss problems"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
      </p>
      <ul class="pq-problems">
        {problems.slice(0, limit).map((problem, index) => (
          <li key={index}>
            <strong>{problem.code}</strong> {problem.message}
            {problem.suggestion === undefined ? null : (
              <span class="pq-suggestion"> {problem.suggestion}</span>
            )}
          </li>
        ))}
      </ul>
      {problems.length > limit ? (
        <p class="pq-suggestion">
          …and {problems.length - limit} more. Fix the first ones, then reload.
        </p>
      ) : null}
    </aside>
  );
}
