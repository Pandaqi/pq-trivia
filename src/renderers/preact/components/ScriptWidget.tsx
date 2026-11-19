/**
 * `Type => Custom` with `Script =>`. The script runs in a sandboxed iframe with
 * its own opaque origin. It cannot touch the page, the quiz or the answers.
 *
 * Policy: off unless the host sets `allowScripts: true`. The widget talks over
 * `postMessage` and every message is checked before it is used.
 */

import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { ResponseKind } from "../../../core/session/responses";
import type { Quiz } from "../../../core/session/quiz";
import type { QuestionViewModel } from "../../../core/session/viewModel";
import { useT } from "../i18n";

export function ScriptWidget({
  quiz,
  screen,
  allowed,
}: {
  readonly quiz: Quiz;
  readonly screen: QuestionViewModel;
  readonly allowed: boolean;
}): JSX.Element | null {
  const t = useT();
  const host = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(screen.script?.height ?? "24em");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const script = screen.script;
    const frame = host.current;
    if (!allowed || script === null || frame === null) {
      return;
    }
    let url: string | null = null;
    let cancelled = false;

    const onMessage = (event: MessageEvent): void => {
      if (event.source !== frame.contentWindow) {
        return;
      }
      const data = event.data as { type?: unknown; payload?: unknown } | null;
      if (data === null || typeof data.type !== "string") {
        return;
      }
      switch (data.type) {
        case "pq:ready":
          frame.contentWindow?.postMessage(
            { type: "pq:init", payload: { questionId: screen.id } },
            "*",
          );
          break;
        case "pq:resize": {
          const value = (data.payload as { height?: unknown } | null)?.height;
          if (typeof value === "number" && value > 0 && value < 2000) {
            setHeight(`${Math.round(value)}px`);
          }
          break;
        }
        case "pq:response":
          quiz.setResponse(screen.id, {
            kind: ResponseKind.Custom,
            value: data.payload ?? null,
          });
          break;
        case "pq:diagnostic": {
          const message = (data.payload as { message?: unknown } | null)
            ?.message;
          setNote(typeof message === "string" ? message : null);
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("message", onMessage);
    void fetch(script.path)
      .then((response) => (response.ok ? response.text() : Promise.reject()))
      .then((text) => {
        if (cancelled) {
          return;
        }
        const blob = new Blob([text], { type: "text/html" });
        url = URL.createObjectURL(blob);
        frame.src = url;
      })
      .catch(() => {
        if (!cancelled) {
          setNote(t("widgetError", { path: script.path }));
        }
      });

    return () => {
      cancelled = true;
      window.removeEventListener("message", onMessage);
      if (url !== null) {
        URL.revokeObjectURL(url);
      }
    };
  }, [allowed, quiz, screen.id, screen.script?.path]);

  if (!allowed || screen.script === null) {
    return null;
  }

  return (
    <div class="pq-widget">
      <iframe
        ref={host}
        class="pq-widget-frame"
        title={t("widgetTitle", { number: screen.index + 1 })}
        // No same-origin, no forms, no popups, no navigation.
        sandbox="allow-scripts"
        style={`height: ${height}`}
      />
      {note === null ? null : (
        <p class="pq-widget-note" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
