/** The default view. One screen at a time, focus follows the heading. */

import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { ViewRenderer } from "../../core/session/registry";
import { SessionStatus, type SessionState } from "../../core/session/session";
import type { Quiz } from "../../core/session/quiz";
import {
  ScreenKind,
  type QuestionViewModel,
  type ScreenViewModel,
} from "../../core/session/viewModel";
import { EndScreen } from "./screens/EndScreen";
import { MessageScreen } from "./screens/MessageScreen";
import { QuestionScreen } from "./screens/QuestionScreen";
import { StartScreen } from "./screens/StartScreen";

const TYPING_TAGS: ReadonlySet<string> = new Set([
  "INPUT",
  "TEXTAREA",
  "SELECT",
]);

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return (
    element !== null &&
    (TYPING_TAGS.has(element.tagName) || element.isContentEditable)
  );
}

const KEY_ACTIONS: Readonly<Record<string, (quiz: Quiz) => void>> = {
  ArrowRight: (quiz) => quiz.next(),
  ArrowLeft: (quiz) => quiz.prev(),
  r: (quiz) => quiz.reveal(),
  h: (quiz) => quiz.revealHint(),
};

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
}: {
  readonly quiz: Quiz;
  readonly screen: ScreenViewModel;
  readonly state: SessionState;
}): JSX.Element {
  const override = quiz.views.get(screen.kind);
  if (override !== undefined) {
    return <CustomView quiz={quiz} screen={screen} renderer={override} />;
  }
  switch (screen.kind) {
    case ScreenKind.Start:
      return <StartScreen quiz={quiz} screen={screen} />;
    case ScreenKind.Question:
      return <QuestionScreen quiz={quiz} screen={screen} state={state} />;
    case ScreenKind.End:
      return <EndScreen quiz={quiz} screen={screen} />;
  }
}

export function QuizApp({ quiz }: { readonly quiz: Quiz }): JSX.Element {
  const [snapshot, setSnapshot] = useState(() => ({
    state: quiz.state,
    screen: quiz.currentScreen(),
  }));
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () =>
      setSnapshot({ state: quiz.state, screen: quiz.currentScreen() });
    // A quiz that finished loading before this effect ran still needs one push.
    sync();
    return quiz.subscribe(sync);
  }, [quiz]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTyping(event.target)) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const action = KEY_ACTIONS[event.key];
      if (action === undefined) {
        return;
      }
      event.preventDefault();
      action(quiz);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [quiz]);

  useEffect(() => {
    root.current?.querySelector<HTMLElement>("[data-pq-heading]")?.focus();
  }, [snapshot.screen]);

  const screen = snapshot.screen;
  if (screen === null) {
    const title =
      snapshot.state.status === SessionStatus.Error
        ? "This quiz could not be loaded"
        : "No quiz yet";
    return (
      <div class="pq-quiz" ref={root}>
        <MessageScreen title={title} messages={quiz.diagnostics()} />
      </div>
    );
  }

  const label =
    screen.kind === ScreenKind.Question
      ? screen.heading
      : screen.kind === ScreenKind.Start
        ? screen.title
        : "End of quiz";

  return (
    <div class="pq-quiz" ref={root} data-pq-screen={screen.kind}>
      <p class="pq-live" aria-live="polite">
        {label}
      </p>
      <ScreenView quiz={quiz} screen={screen} state={snapshot.state} />
    </div>
  );
}

export type { QuestionViewModel };
