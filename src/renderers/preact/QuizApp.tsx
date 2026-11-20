/** The default view. One screen at a time, focus follows the heading. */

import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { getTheme, subscribeTheme } from "../../platform/browser/theme";
import type { ViewRenderer } from "../../core/session/registry";
import { SessionStatus, type SessionState } from "../../core/session/session";
import type { TimerSound } from "../../core/session/timers";
import type { Quiz } from "../../core/session/quiz";
import {
  ScreenKind,
  type QuestionViewModel,
  type ScreenViewModel,
} from "../../core/session/viewModel";
import { CodeHighlightContext } from "./components/CodeBlock";
import { UiContext } from "./i18n";
import { preloadNextQuestion } from "../../platform/browser/preload";
import { storedLayoutMode } from "../../platform/browser/storage/layoutMode";
import { EndScreen } from "./screens/EndScreen";
import { LockedScreen } from "./screens/LockedScreen";
import { MessageScreen } from "./screens/MessageScreen";
import { QuestionScreen } from "./screens/QuestionScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { actionFor, isTyping, keyMap } from "./keys";
import { changeFontScale, showsButton } from "./toolbar";
import { SettingsOverlay, SettingsToggle } from "./screens/SettingsPanel";
import { StartScreen } from "./screens/StartScreen";
import { QuestionType } from "../../core/model/question";

/** A host view: whatever DOM they return lands in a plain host element. */
function CustomView({
  quiz,
  screen,
  renderer,
}: {
  readonly quiz: Quiz;
  readonly screen: ScreenViewModel;
  readonly renderer: ViewRenderer;
}): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (element === null) {
      return;
    }
    element.replaceChildren();
    const node = renderer(screen, quiz);
    if (node instanceof Node) {
      element.append(node);
    }
  }, [quiz, screen, renderer]);
  return <div class="pq-custom-view" ref={host} />;
}

function ScreenView({
  quiz,
  screen,
  state,
  timerSound,
  settings = null,
}: {
  readonly quiz: Quiz;
  readonly screen: ScreenViewModel;
  readonly state: SessionState;
  readonly timerSound?: TimerSound | undefined;
  readonly settings?: JSX.Element | null;
}): JSX.Element {
  const override = quiz.views.get(screen.kind);
  if (override !== undefined) {
    return <CustomView quiz={quiz} screen={screen} renderer={override} />;
  }
  switch (screen.kind) {
    case ScreenKind.Start:
      return <StartScreen quiz={quiz} screen={screen} />;
    case ScreenKind.Question:
      return (
        <QuestionScreen
          quiz={quiz}
          screen={screen}
          state={state}
          timerSound={timerSound}
          settings={settings}
        />
      );
    case ScreenKind.End:
      return <EndScreen quiz={quiz} screen={screen} />;
    case ScreenKind.Results:
      return <ResultsScreen quiz={quiz} screen={screen} />;
  }
}

export function QuizApp({
  quiz,
  timerSound,
}: {
  readonly quiz: Quiz;
  readonly timerSound?: TimerSound | undefined;
}): JSX.Element {
  const [snapshot, setSnapshot] = useState(() => ({
    state: quiz.state,
    screen: quiz.currentScreen(),
  }));
  const root = useRef<HTMLDivElement>(null);
  const appliedTheme = useRef<ReturnType<typeof getTheme>>(null);
  const [themeVersion, setThemeVersion] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(
    () => subscribeTheme(() => setThemeVersion((value) => value + 1)),
    [],
  );

  // Tokens, fonts and a background per question. The theme is a runtime; this
  // effect only moves its CSS variables onto the current root.
  useEffect(() => {
    const element = root.current;
    if (element === null) {
      return;
    }
    const previous = appliedTheme.current;
    const theme = getTheme();
    // A swap must not leave the old theme's fonts, veil or background behind
    // just because the new theme does not set them.
    const themed = [
      "--pq-theme-image",
      "--pq-theme-fade",
      "--pq-font-body",
      "--pq-font-heading",
      "--pq-heading-weight",
      "--pq-scheme-light",
      "--pq-scheme-dark",
      "--pq-scheme-bg",
      "--pq-scheme-text",
    ];
    for (const name of themed) {
      element.style.removeProperty(name);
    }
    if (previous !== null) {
      for (const name of Object.keys(previous.settings.tokens)) {
        element.style.removeProperty(name);
      }
    }
    if (theme !== null) {
      for (const name of Object.keys(theme.settings.tokens)) {
        element.style.removeProperty(name);
      }
    }
    appliedTheme.current = theme;
    if (theme === null) {
      return;
    }
    const key =
      snapshot.screen?.kind === ScreenKind.Question
        ? snapshot.screen.id
        : (snapshot.screen?.kind ?? "quiz");
    theme.apply(
      element,
      key,
      snapshot.screen?.kind === ScreenKind.Question
        ? snapshot.screen.colorScheme
        : null,
    );
  }, [themeVersion, snapshot.screen]);

  useEffect(() => {
    const sync = () =>
      setSnapshot({ state: quiz.state, screen: quiz.currentScreen() });
    // A quiz that finished loading before this effect ran still needs one push.
    sync();
    return quiz.subscribe(sync);
  }, [quiz]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // The settings panel is modal. Escape has its own handler there.
      if (settingsOpen || event.defaultPrevented || isTyping(event.target)) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const config = quiz.config;
      if (config.disableKeys === true || config.disableUI === true) {
        return;
      }
      // Space on a focused button is that button's click, not a second action.
      if (
        event.key === " " &&
        (event.target as HTMLElement | null)?.closest?.("button, a") !== null
      ) {
        return;
      }
      const name = keyMap(config).get(event.key);
      if (name === undefined) {
        return;
      }
      event.preventDefault();
      if (name === "media") {
        const media =
          root.current?.querySelector<HTMLMediaElement>("audio, video");
        if (media !== null && media !== undefined) {
          if (media.paused) {
            void media.play().catch(() => undefined);
          } else {
            media.pause();
          }
        }
        return;
      }
      if (name === "fullscreen") {
        // V2's `f`: a lightbox for an image, real fullscreen for video. The
        // element API does both, and the browser owns the way back out.
        const media =
          root.current?.querySelector<HTMLElement>("img, video") ?? null;
        if (media === null) {
          return;
        }
        if (document.fullscreenElement !== null) {
          void document.exitFullscreen().catch(() => undefined);
          return;
        }
        void media.requestFullscreen?.().catch(() => undefined);
        return;
      }
      if (name === "fontUp" || name === "fontDown") {
        changeFontScale(root.current, name === "fontUp" ? 0.1 : -0.1);
        return;
      }
      if (config.enableSafety === true && (name === "mode" || name === "end")) {
        const message =
          name === "mode" ? quiz.t("safetyMode") : quiz.t("safetyEnd");
        if (!window.confirm(message)) {
          return;
        }
      }
      const action = actionFor(name);
      action?.(quiz);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [quiz, root, settingsOpen]);

  // V2's edge clicks. Off unless the host asks for them.
  useEffect(() => {
    if (quiz.config.enableMouse !== true) {
      return;
    }
    const onClick = (event: MouseEvent) => {
      if (settingsOpen) {
        return;
      }
      if (
        quiz.config.disableTouch === true &&
        event instanceof PointerEvent &&
        event.pointerType === "touch"
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, video, audio")) {
        return;
      }
      const width = window.innerWidth;
      if (event.clientX < width * 0.15) {
        quiz.prev();
      } else if (event.clientX > width * 0.85) {
        quiz.next();
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [quiz, settingsOpen]);

  useEffect(() => {
    root.current?.querySelector<HTMLElement>("[data-pq-heading]")?.focus();
    preloadNextQuestion(quiz);
  }, [quiz, snapshot.screen]);

  // `screen` is an object, so its identity changes every draw; kind and index
  // are what actually moves the header.
  const screen = snapshot.screen;
  const layoutMode =
    storedLayoutMode() ??
    (quiz.config.layoutMode === "inline" ? "inline" : "viewport");
  if (screen === null) {
    if (quiz.locked()) {
      return (
        <div
          class="pq-quiz"
          ref={root}
          data-pq-screen="locked"
          data-pq-layout={layoutMode}
        >
          <LockedScreen quiz={quiz} />
        </div>
      );
    }
    const title =
      snapshot.state.status === SessionStatus.Error
        ? quiz.t("loadFailed")
        : quiz.t("noQuiz");
    return (
      <div class="pq-quiz" ref={root} data-pq-layout={layoutMode}>
        <MessageScreen title={title} messages={quiz.diagnostics()} />
      </div>
    );
  }

  // The Start block's `Buttons` gates the panel on every screen, like V2.
  const startButtons = quiz.state.plan?.buttons ?? [];
  const settingsAllowed =
    showsButton(startButtons, "settings") &&
    quiz.config.disableUI !== true &&
    quiz.config.hideDefaultSettings !== true;
  const quizIsEmpty =
    screen.kind !== ScreenKind.Results &&
    quiz.state.plan !== null &&
    quiz.state.plan.total === 0;
  // A question slide has a strip of its own, so the button joins it. Every
  // other screen gets the floating copy in the corner, where nothing sits.
  const inStrip =
    settingsAllowed &&
    screen.kind === ScreenKind.Question &&
    screen.type !== QuestionType.Section &&
    quiz.views.get(screen.kind) === undefined;
  const settingsButton = settingsAllowed ? (
    <SettingsToggle
      open={settingsOpen}
      onToggle={() => setSettingsOpen((value) => !value)}
      label={quiz.t("settings")}
    />
  ) : null;

  const label =
    screen.kind === ScreenKind.Question
      ? screen.number > 0
        ? quiz.t("questionOf", {
            index: screen.number,
            total: screen.total,
          })
        : quiz.t("roundWord")
      : screen.kind === ScreenKind.Start
        ? screen.title || quiz.t("untitled")
        : screen.kind === ScreenKind.Results
          ? quiz.t("resultsLabel", { percent: screen.report.percent })
          : quiz.t("endLabel");

  return (
    <div
      class="pq-quiz"
      ref={root}
      data-pq-screen={screen.kind}
      data-pq-layout={layoutMode}
    >
      <p class="pq-live" aria-live="polite">
        {label}
      </p>
      {quizIsEmpty ? (
        <p class="pq-warning" role="status">
          {quiz.t("emptyQuiz")}
        </p>
      ) : null}
      {settingsAllowed && !inStrip ? settingsButton : null}

      <UiContext.Provider value={quiz.t}>
        <CodeHighlightContext.Provider
          value={quiz.config.codeHighlight === true}
        >
          <ScreenView
            quiz={quiz}
            screen={screen}
            state={snapshot.state}
            timerSound={timerSound}
            settings={inStrip ? settingsButton : null}
          />
          {settingsOpen ? (
            <SettingsOverlay
              quiz={quiz}
              seed={quiz.state.plan?.seed ?? ""}
              onClose={() => setSettingsOpen(false)}
            />
          ) : null}
        </CodeHighlightContext.Provider>
      </UiContext.Provider>
    </div>
  );
}

export type { QuestionViewModel };
