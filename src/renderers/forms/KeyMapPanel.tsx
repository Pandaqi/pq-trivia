/** The opt-in key map. Click an action, press a key, it is live. */

import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Quiz } from "../../core/session/quiz";
import { effectiveKeys, HOTKEY_ACTIONS } from "../preact/keys";
import {
  setStoredHotkeys,
  storedHotkeys,
} from "../../platform/browser/storage/hotkeys";
import { useT } from "../preact/i18n";
import { GroupHead } from "../preact/screens/Info";

function currentBindings(quiz: Quiz): Record<string, readonly string[]> {
  const saved = quiz.config.allowHotkeyMapping === true ? storedHotkeys() : {};
  const map = effectiveKeys({
    ...quiz.config,
    hotkeys: { ...quiz.config.hotkeys, ...saved },
  });
  const out: Record<string, readonly string[]> = {};
  for (const [action, keys] of map) {
    out[action] = keys;
  }
  return out;
}

export function KeyMapPanel({
  quiz,
}: {
  readonly quiz: Quiz;
}): JSX.Element | null {
  const t = useT();
  const [bindings, setBindings] = useState(() => currentBindings(quiz));
  const [recording, setRecording] = useState<string | null>(null);
  const capture = useRef<HTMLInputElement>(null);
  const mappable = HOTKEY_ACTIONS.filter(
    (action) => bindings[action.id] !== undefined,
  );

  useEffect(() => {
    if (recording !== null) {
      capture.current?.focus();
    }
  }, [recording]);

  if (quiz.config.allowHotkeyMapping !== true || mappable.length === 0) {
    return null;
  }

  const keyLabel = (key: string): string => (key === " " ? t("keySpace") : key);

  const applyKey = (event: KeyboardEvent): void => {
    if (recording === null) {
      return;
    }
    // Tab belongs to navigation, not to a key binding. Modifier-only presses
    // are not a key yet.
    if (event.key === "Tab") {
      setRecording(null);
      return;
    }
    if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(event.key)) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const key = event.key;
    const next: Record<string, readonly string[]> = { ...bindings };
    // One key, one action. Taking a key from another action makes the panel
    // readable and keeps the key map deterministic.
    for (const action of Object.keys(next)) {
      next[action] = (next[action] ?? []).filter((entry) => entry !== key);
    }
    next[recording] = [key];
    setBindings(next);
    quiz.configure({ hotkeys: next });
    setStoredHotkeys(next);
    setRecording(null);
  };

  return (
    <fieldset class="pq-settings-group" aria-label={t("keysTitle")}>
      <GroupHead label={t("keysTitle")} note={t("keysNote")} />
      {mappable.map((action) => {
        const keys = bindings[action.id] ?? [];
        const isRecording = recording === action.id;
        return (
          <div class="pq-key-row" key={action.id}>
            <strong>{t(action.labelKey)}</strong>
            <span class="pq-key-capture-row">
              {isRecording ? (
                <>
                  <input
                    ref={capture}
                    class="pq-input pq-key-capture"
                    type="text"
                    readOnly
                    value={t("pressKey")}
                    aria-label={t("pressKey")}
                    onKeyDown={applyKey}
                    onBlur={() => {
                      if (recording === action.id) {
                        setRecording(null);
                      }
                    }}
                  />
                  <button
                    type="button"
                    class="pq-link"
                    onClick={() => setRecording(null)}
                  >
                    {t("cancelKey")}
                  </button>
                </>
              ) : (
                <>
                  <span class="pq-keys pq-key-current">
                    {keys.length === 0
                      ? t("none")
                      : keys.map((key) => <kbd key={key}>{keyLabel(key)}</kbd>)}
                  </span>
                  <button
                    type="button"
                    class="pq-link"
                    data-pq-key-action={action.id}
                    aria-label={t("changeKey", {
                      label: t(action.labelKey),
                    })}
                    onClick={() => setRecording(action.id)}
                  >
                    {t("changeKeyShort")}
                  </button>
                </>
              )}
            </span>
          </div>
        );
      })}
    </fieldset>
  );
}
