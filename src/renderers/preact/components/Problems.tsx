/** Diagnostics, deduplicated, dismissible. A quiz should never nag twice. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { Diagnostic } from "../../../core/syntax/diagnostics";
import { pluralKey } from "../../../core/values/marks";
import {
  diagnosticMessage,
  diagnosticSuggestion,
} from "../../../i18n/diagnostics";
import { useT } from "../i18n";
import { getTheme, themeAudit } from "../../../platform/browser/theme";
import type { ThemeIssue } from "../../../platform/browser/theme";
import type { Quiz } from "../../../core/session/quiz";

/**
 * A theme can look fine to its author and vanish for everyone else. This box
 * floats over the page with colours of its own, so the warning about low
 * contrast never suffers from low contrast. It fades, and a click dismisses it.
 */
export function ThemeAudit({
  revision,
  enabled,
}: {
  readonly revision: string;
  readonly enabled: boolean;
}): JSX.Element | null {
  const t = useT();
  const [issues, setIssues] = useState<readonly ThemeIssue[]>([]);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setIssues([]);
    if (!enabled) {
      return;
    }
    const theme = getTheme();
    if (theme === null) {
      return;
    }
    let cancelled = false;
    // The stylesheet may still be loading. Judge it once it lands.
    void theme.ready
      .then(() => themeAudit({ enabled }))
      .then((found) => {
        if (!cancelled) {
          setIssues(found);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [revision, enabled]);
  if (!enabled || dismissed || issues.length === 0) {
    return null;
  }
  const dismiss = (): void => setDismissed(true);
  return (
    <div class="pq-audit" role="alert" onClick={dismiss}>
      <div class="pq-audit-copy">
        {issues.map((issue, index) => (
          <p key={index}>
            {issue.kind === "contrast"
              ? t("themeLowContrast", {
                  ratio: issue.ratio.toFixed(1),
                  pair: `${issue.foreground} / ${issue.background}`,
                })
              : issue.kind === "image"
                ? t("themeImageSmall", {
                    file: issue.file,
                    width: issue.width,
                    height: issue.height,
                  })
                : t("themeImageMissing", { file: issue.file })}
          </p>
        ))}
      </div>
      <button
        type="button"
        class="pq-audit-close"
        aria-label={t("close")}
        onClick={(event) => {
          event.stopPropagation();
          dismiss();
        }}
      >
        ×
      </button>
    </div>
  );
}

/** The switch for the audit, in Settings. */
export function ThemeAuditToggle({
  quiz,
}: {
  readonly quiz: Quiz;
}): JSX.Element {
  const t = useT();
  const [on, setOn] = useState(quiz.config.themeAudit !== false);
  return (
    <label class="pq-check">
      <input
        type="checkbox"
        checked={on}
        onChange={(event) => {
          const next = event.currentTarget.checked;
          setOn(next);
          quiz.configure({ themeAudit: next });
        }}
      />
      {t("themeAuditLabel")}
    </label>
  );
}

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
        {t(pluralKey(problems.length, "problemsReopen"), {
          count: problems.length,
        })}
      </button>
    );
  }

  return (
    <aside class="pq-problems-panel" aria-label={t("problemsWithQuiz")}>
      <p class="pq-problems-title">
        {t(pluralKey(problems.length, "problemsFound"), {
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
