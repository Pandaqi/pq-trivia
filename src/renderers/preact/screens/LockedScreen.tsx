/** The passphrase box. Shown only when a loaded file is encrypted. */

import type { JSX } from "preact";
import { useState } from "preact/hooks";
import type { Quiz } from "../../../core/session/quiz";

export function LockedScreen({ quiz }: { readonly quiz: Quiz }): JSX.Element {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (): Promise<void> => {
    if (passphrase.length === 0 || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const opened = await quiz.unlock(passphrase);
    setBusy(false);
    if (!opened) {
      setError("That passphrase did not open the file.");
    }
  };

  return (
    <main class="pq-screen pq-screen-message">
      <h1 class="pq-title">Locked quiz</h1>
      <p class="pq-body">
        This quiz is encrypted. Enter its passphrase to load the questions.
      </p>
      <form
        class="pq-settings-body"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label class="pq-field">
          <span class="pq-field-label">Passphrase</span>
          <input
            class="pq-input"
            type="password"
            value={passphrase}
            autocomplete="current-password"
            onInput={(event) => setPassphrase(event.currentTarget.value)}
          />
        </label>
        {error === null ? null : (
          <p class="pq-issue" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          class="pq-primary"
          disabled={busy || passphrase.length === 0}
        >
          {busy ? "Opening…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
