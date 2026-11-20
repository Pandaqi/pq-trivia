/** The phone. One question, big buttons, then the truth. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { QuestionType } from "../../core/model/question";
import type { Response } from "../../core/session/responses";
import type { PlayerRoom } from "../player";
import {
  RevealMode,
  RoomPhase,
  type LivePlayer,
  type LiveQuestion,
  type RevealPayload,
} from "../types";
import { Leaderboard, RevealPanel } from "./parts";
import { PlayerAnswer } from "./PlayerAnswer";

function usePlayer(player: PlayerRoom): number {
  const [version, setVersion] = useState(0);
  useEffect(
    () => player.subscribe(() => setVersion((value) => value + 1)),
    [player],
  );
  return version;
}

function QuestionBody({
  question,
  kicker,
}: {
  readonly question: LiveQuestion;
  readonly kicker: string;
}): JSX.Element {
  const section = question.type === QuestionType.Section;
  const round = question.roundName === null ? "" : ` · ${question.roundName}`;
  const points = ` · ${question.points} ${
    question.points === 1 ? "point" : "points"
  }`;
  return (
    <section class="pq-live-question">
      <p class="pq-live-meta">
        {section
          ? (question.roundName ?? "Round")
          : `${kicker} ${question.index + 1} of ${question.total}${round}${points}`}
      </p>
      <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
        {question.title}
      </h1>
      {question.body.map((line, index) => (
        <p key={index} class="pq-body">
          {line}
        </p>
      ))}
      {question.media.map((item) => (
        <figure key={item.path} class="pq-media">
          <img src={item.path} alt={item.alt ?? ""} loading="lazy" />
        </figure>
      ))}
    </section>
  );
}

/** Answer mode on the phone: the question, then the host's answers. */
function AnswerPass({
  question,
  reveal,
  players,
  self,
}: {
  readonly question: LiveQuestion;
  readonly reveal: RevealPayload | null;
  readonly players: readonly LivePlayer[];
  readonly self: string | null;
}): JSX.Element {
  return (
    <>
      <QuestionBody question={question} kicker="Answers" />
      {reveal === null ? (
        <p class="pq-live-hint" role="status">
          The host is showing the answers.
        </p>
      ) : (
        <RevealPanel
          reveal={reveal}
          players={players}
          selfId={self}
          showEveryone
        />
      )}
    </>
  );
}

export function PlayerView({
  player,
}: {
  readonly player: PlayerRoom;
}): JSX.Element {
  usePlayer(player);
  const state = player.state();
  const question = state.question;
  const reveal = state.reveal;

  const submit = (response: Response): void => player.submit(response);

  if (!state.joined) {
    return (
      <main class="pq-screen pq-live-screen">
        <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
          Room {state.code}
        </h1>
        <p class="pq-body">{state.error ?? "Connecting to the host…"}</p>
      </main>
    );
  }

  if (state.phase === RoomPhase.Ended) {
    return (
      <main class="pq-screen pq-live-screen">
        <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
          That is the quiz
        </h1>
        <Leaderboard rows={state.leaderboard} selfId={state.id} />
      </main>
    );
  }

  if (question === null) {
    return (
      <main class="pq-screen pq-live-screen">
        <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
          You are in
        </h1>
        <p class="pq-body">Waiting for the host to show a question.</p>
        <p class="pq-live-meta">Room {state.code}</p>
      </main>
    );
  }

  if (state.phase === RoomPhase.Answers) {
    return (
      <main class="pq-screen pq-live-screen">
        <p class="pq-live-kicker">Room {state.code}</p>
        <AnswerPass
          question={question}
          reveal={reveal}
          players={state.players}
          self={state.id}
        />
      </main>
    );
  }

  const section = question.type === QuestionType.Section;
  return (
    <main class="pq-screen pq-live-screen">
      <p class="pq-live-kicker">Room {state.code}</p>
      <QuestionBody
        question={question}
        kicker={section ? "Round" : "Question"}
      />

      {section ? (
        <p class="pq-live-hint" role="status">
          The next question is coming. Keep an eye on the big screen.
        </p>
      ) : reveal === null ? (
        <>
          <PlayerAnswer
            question={question}
            disabled={state.submitted || state.closed}
            onSubmit={submit}
          />
          {state.submitted ? (
            <p class="pq-live-hint" role="status">
              Sent. Wait for the reveal.
            </p>
          ) : null}
          {state.closed && !state.submitted ? (
            <p class="pq-live-hint" role="status">
              Answers are closed.
            </p>
          ) : null}
        </>
      ) : (
        <RevealPanel
          reveal={reveal}
          players={state.players}
          selfId={state.id}
          showEveryone={state.revealMode === RevealMode.Pass}
        />
      )}
    </main>
  );
}
