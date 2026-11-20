/** The phone. One question, big buttons, then the truth. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { QuestionType } from "../../core/model/question";
import type { Response } from "../../core/session/responses";
import type { PlayerRoom } from "../player";
import {
  RevealMode,
  RoomPhase,
  type BuzzState,
  type LivePlayer,
  type LiveQuestion,
  type RevealPayload,
} from "../types";
import { assignTeamColours } from "../../shared/teamColours";
import { Leaderboard, LiveBadge, RevealPanel } from "./parts";
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

/**
 * The buzzer. One press, and the host decides who was first. The button stays
 * a button: no timers, no local "I won". That would be a game of ping.
 */
function BuzzBar({
  player,
  buzz,
  selfId,
  closed,
}: {
  readonly player: PlayerRoom;
  readonly buzz: BuzzState | null;
  readonly selfId: string | null;
  readonly closed: boolean;
}): JSX.Element {
  if (buzz !== null) {
    return (
      <p class="pq-live-hint pq-live-buzz" role="status">
        {buzz.playerId === selfId
          ? "You buzzed first. Answer out loud."
          : `${buzz.name} buzzed first.`}
      </p>
    );
  }
  return (
    <button
      type="button"
      class="pq-primary pq-live-buzz"
      disabled={closed}
      onClick={() => player.buzz()}
    >
      Buzz
    </button>
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

/**
 * `Wager => true` on the phone: the same bet the solo screen offers. It goes
 * out with the answer, so the host can only pay what it also graded.
 */
function StakePicker({
  max,
  value,
  disabled,
  onChange,
}: {
  readonly max: number;
  readonly value: number;
  readonly disabled: boolean;
  readonly onChange: (value: number) => void;
}): JSX.Element | null {
  if (max <= 0) {
    return null;
  }
  return (
    <label class="pq-live-stake">
      <span>
        Wager up to {max} {max === 1 ? "point" : "points"}
      </span>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onInput={(event) => onChange(Number(event.currentTarget.value))}
      />
      <output>{value}</output>
    </label>
  );
}

export function PlayerView({
  player,
}: {
  readonly player: PlayerRoom;
}): JSX.Element {
  usePlayer(player);
  const state = player.state();
  // Every team in the room, so this phone's badge matches the big screen.
  const colours = assignTeamColours(
    state.players.map((entry) => entry.team ?? ""),
  );
  const question = state.question;
  const reveal = state.reveal;
  const [stake, setStake] = useState(0);
  // You can only stake what you hold. The host clamps again, in case this
  // screen is out of date.
  const myScore =
    state.players.find((item) => item.id === state.id)?.score ?? 0;

  // Each question starts with nothing on the line.
  useEffect(() => setStake(0), [question?.id]);

  const submit = (response: Response): void => player.submit(response, stake);

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
        <LiveBadge code={state.code} team={state.team} colours={colours} />
      </main>
    );
  }

  if (state.phase === RoomPhase.Answers) {
    return (
      <main class="pq-screen pq-live-screen">
        <LiveBadge code={state.code} team={state.team} colours={colours} />
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
      <LiveBadge code={state.code} team={state.team} colours={colours} />
      <QuestionBody
        question={question}
        kicker={section ? "Round" : "Question"}
      />

      {section ? (
        <p class="pq-live-hint" role="status">
          The next question is coming. Keep an eye on the big screen.
        </p>
      ) : reveal === null ? (
        state.watching ? (
          <p class="pq-live-hint" role="status">
            Watching. Nothing to answer from this screen.
          </p>
        ) : (
          <>
            {question.buzzer ? (
              <BuzzBar
                player={player}
                buzz={state.buzz}
                selfId={state.id}
                closed={state.closed}
              />
            ) : null}
            {question.wager ? (
              <StakePicker
                max={Math.min(question.wagerMax, Math.floor(myScore))}
                value={Math.min(stake, question.wagerMax, Math.floor(myScore))}
                disabled={state.submitted || state.closed}
                onChange={setStake}
              />
            ) : null}
            <PlayerAnswer
              question={question}
              disabled={state.submitted || state.closed}
              onSubmit={submit}
            />
            {state.submitted ? (
              <p class="pq-live-hint" role="status">
                {stake > 0
                  ? `Sent with ${stake} on the line. Wait for the reveal.`
                  : "Sent. Wait for the reveal."}
              </p>
            ) : null}
            {state.closed && !state.submitted ? (
              <p class="pq-live-hint" role="status">
                Answers are closed.
              </p>
            ) : null}
          </>
        )
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
