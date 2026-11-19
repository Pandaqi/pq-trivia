/** The passphrase box. Shown only when a loaded file is encrypted. */

import type { JSX } from "preact";
import { useState } from "preact/hooks";
import type { Quiz } from "../../../core/session/quiz";
import { useT } from "../i18n";

export function LockedScreen({ quiz }: { readonly quiz: Quiz }): JSX.Element {
  const t = useT();
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
      setError(t("passphraseError"));
    }
  };

  return (
    <main class="pq-screen pq-screen-message">
      <h1 class="pq-title">{t("lockedTitle")}</h1>
      <p class="pq-body">{t("lockedBody")}</p>
      <form
        class="pq-settings-body"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label class="pq-field">
          <span class="pq-field-label">{t("passphrase")}</span>
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
          {busy ? t("opening") : t("unlock")}
        </button>
      </form>
    </main>
  );
}
