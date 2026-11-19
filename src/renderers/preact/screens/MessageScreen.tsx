/** Nothing to show. Say why, kindly. */

import type { JSX } from "preact";
import type { Diagnostic } from "../../../core/syntax/diagnostics";

export function MessageScreen({
  title,
  messages,
}: {
  readonly title: string;
  readonly messages: readonly Diagnostic[];
}): JSX.Element {
  return (
    <main class="pq-screen pq-screen-message">
      <header class="pq-header">
        <h1 class="pq-title" data-pq-heading tabIndex={-1}>
          {title}
        </h1>
      </header>
      {messages.length === 0 ? (
        <p class="pq-description">Pick a quiz file to begin.</p>
      ) : (
        <ul class="pq-problems">
          {messages.slice(0, 8).map((message, index) => (
            <li key={index}>
              <strong>{message.code}</strong> {message.message}
              {message.suggestion === undefined ? null : (
                <span class="pq-suggestion"> {message.suggestion}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
