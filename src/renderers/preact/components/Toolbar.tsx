/** One toolbar for every screen. Buttons are pinned in Settings. */

import type { JSX } from "preact";
import { QuestionType } from "../../../core/model/question";
import type { Quiz } from "../../../core/session/quiz";
import { PlayMode } from "../../../core/session/session";
import type { QuestionViewModel } from "../../../core/session/viewModel";
import { useT } from "../i18n";
import {
  changeFontScale,
  pinnedActions,
  TOOLBAR_ACTIONS,
  type ToolbarAction,
} from "../toolbar";

interface ToolbarProps {
  readonly quiz: Quiz;
  readonly screen?: QuestionViewModel | undefined;
  /** The question screen owns `next`, so it can show field errors. */
  readonly onNext?: (() => void) | undefined;
}

export function Toolbar({ quiz, screen, onNext }: ToolbarProps): JSX.Element {
  const t = useT();
  const state = quiz.state;
  const plan = state.plan;
  const total = plan?.questions.length ?? 0;
  const atStart = state.index <= -1;
  const atEnd = state.index >= total;
  const isQuestion =
    screen !== undefined && screen.type !== QuestionType.Section;
  const revealed = screen?.revealed === true;
  // The button toggles, so it stays while the answer is up. Otherwise you show
  // the answer once and can never put it away again.
  const canReveal =
    isQuestion &&
    quiz.config.restricted !== true &&
    (revealed || screen?.revealable === true);
  const hintCount = screen?.hints.revealed.length ?? 0;
  const canHint =
    isQuestion && screen !== undefined && hintCount < screen.hints.total;
  const canMode = quiz.config.restricted !== true;
  const hasRounds = (plan?.rounds.length ?? 0) > 0;

  const run = (action: ToolbarAction, element: HTMLElement): void => {
    const root = element.closest<HTMLElement>(".pq-quiz");
    switch (action.id) {
      case "next":
        if (onNext !== undefined) {
          onNext();
        } else {
          quiz.next();
        }
        break;
      case "prev":
        quiz.prev();
        break;
      case "next-round":
        quiz.nextRound();
        break;
      case "prev-round":
        quiz.prevRound();
        break;
      case "font-plus":
        changeFontScale(root, 0.1);
        break;
      case "font-minus":
        changeFontScale(root, -0.1);
        break;
      case "reveal":
        quiz.toggleReveal();
        break;
      case "hint":
        quiz.revealHint();
        break;
      case "mode":
        quiz.setMode(
          state.mode === PlayMode.Answers
            ? PlayMode.Questions
            : PlayMode.Answers,
        );
        break;
      case "start":
        quiz.goToStart();
        break;
      case "end":
        quiz.goToEnd();
        break;
      default:
        break;
    }
  };

  const hidden = (action: ToolbarAction): boolean => {
    switch (action.id) {
      case "reveal":
        return !canReveal;
      case "hint":
        return !canHint;
      case "mode":
        return !canMode;
      case "next-round":
      case "prev-round":
        return !hasRounds;
      case "prev":
        return atStart;
      case "next":
        return atEnd;
      default:
        return false;
    }
  };

  const pinned = pinnedActions(quiz);
  const shown = pinned
    .map((id) => TOOLBAR_ACTIONS.find((action) => action.id === id))
    .filter((action): action is ToolbarAction => action !== undefined)
    .filter((action) => !hidden(action));

  if (shown.length === 0) {
    return <></>;
  }

  return (
    <div class="pq-toolbar-row">
      {shown.map((action) => {
        // The reveal button says what it will do next, like V2's.
        const labelKey =
          action.id === "reveal" && revealed ? "hideAnswer" : action.labelKey;
        return (
          <button
            key={action.id}
            type="button"
            class={action.id === "next" ? "pq-primary pq-next" : undefined}
            data-pq-action={action.id}
            title={t(labelKey)}
            onClick={(event) => run(action, event.currentTarget)}
          >
            <span class="pq-action-icon" aria-hidden="true">
              {action.icon}
            </span>
            <span class="pq-action-label">{t(labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
