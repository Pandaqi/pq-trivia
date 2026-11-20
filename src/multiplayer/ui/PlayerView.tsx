/** The phone. One question, big buttons, then the truth. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { QuestionType } from "../../core/model/question";
import { pluralKey } from "../../core/values/marks";
import type { Translate } from "../../i18n/types";
import { useT } from "../../renderers/preact/i18n";
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
import { Leaderboard, LiveBadge, RevealPanel, signed } from "./parts";
import { PlayerAnswer } from "./PlayerAnswer";

function usePlayer(player: PlayerRoom): number {
  const [version, setVersion] = useState(0);
  useEffect(
    () => player.subscribe(() => setVersion((value) => value + 1)),
    [player],
  );
  return version;
}

/** Where this question sits, in the page's language. */
function questionMeta(
  t: Translate,
  question: LiveQuestion,
  answers: boolean,
): string {
  if (question.type === QuestionType.Section) {
    return question.roundName ?? t("roundWord");
  }
  const base = answers
    ? t("liveAnswersOf", { index: question.index + 1, total: question.total })
    : t("questionOf", { index: question.index + 1, total: question.total });
  const round = question.roundName === null ? "" : ` · ${question.roundName}`;
  const unit = t(pluralKey(question.points, "point_one", "point_other"));
  return `${base}${round} · ${question.points} ${unit}`;
}

/**
 * Out of the room, back to the quiz. A phone that is done should not sit there
 * until the tab is closed by hand.
 */
function leaveRoom(player: PlayerRoom): void {
  player.leave();
  if (typeof location === "undefined") {
    return;
  }
  const url = new URL(location.href);
  for (const key of ["pq-live", "name", "team", "watch"]) {
    url.searchParams.delete(key);
  }
  location.assign(url.toString());
}

function QuestionBody({
  question,
  meta,
}: {
  readonly question: LiveQuestion;
  readonly meta: string;
}): JSX.Element {
  return (
    <section class="pq-live-question">
      {meta.length === 0 ? null : <p class="pq-live-meta">{meta}</p>}
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
  const t = useT();
  if (buzz !== null) {
    return (
      <p class="pq-live-hint pq-live-buzz" role="status">
        {buzz.playerId === selfId
          ? t("liveYouBuzzed")
          : t("liveBuzzedFirst", { name: buzz.name })}
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
      {t("liveBuzz")}
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
  const t = useT();
  return (
    <>
      <QuestionBody
        question={question}
        meta={questionMeta(t, question, true)}
      />
      {reveal === null ? (
        <p class="pq-live-hint" role="status">
          {t("liveShowingAnswers")}
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
  const t = useT();
  if (max <= 0) {
    return null;
  }
  const unit = t(pluralKey(max, "point_one", "point_other"));
  return (
    <label class="pq-live-stake">
      <span>{t("liveWagerUpTo", { max, unit })}</span>
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
  const t = useT();
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
          {t("liveRoom", { code: state.code })}
        </h1>
        <p class="pq-body">
          {state.error === null ? t("liveConnecting") : t(state.error)}
        </p>
      </main>
    );
  }

  if (state.phase === RoomPhase.Ended) {
    return (
      <main class="pq-screen pq-live-screen pq-live-end">
        <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
          {t("liveThatIsQuiz")}
        </h1>
        <Leaderboard rows={state.leaderboard} selfId={state.id} />
        {state.history.length === 0 ? null : (
          <section class="pq-live-history" aria-label={t("liveYourAnswers")}>
            <h2 class="pq-live-title">{t("liveYourAnswers")}</h2>
            <ol>
              {state.history.map((row) => (
                <li
                  key={row.questionId}
                  data-pq-correct={String(row.answeredCorrectly)}
                >
                  <span class="pq-live-history-mark" aria-hidden="true">
                    {row.answeredCorrectly ? "✓" : "✗"}
                  </span>
                  <span class="pq-live-history-title">{row.title}</span>
                  <span class="pq-live-score">{signed(row.points)}</span>
                  <span class="pq-live-history-given">
                    {row.given.length === 0 ? t("liveNoAnswer") : row.given}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
        <button
          type="button"
          class="pq-primary pq-live-leave"
          onClick={() => leaveRoom(player)}
        >
          {t("liveBackToQuiz")}
        </button>
      </main>
    );
  }

  if (question === null) {
    return (
      <main class="pq-screen pq-live-screen">
        <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
          {t("liveYouAreIn")}
        </h1>
        <p class="pq-body">{t("liveWaitingHost")}</p>
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
  const badge = (
    <LiveBadge code={state.code} team={state.team} colours={colours} />
  );
  const sentNote =
    stake > 0
      ? t("liveSentStake", {
          points: stake,
          unit: t(pluralKey(stake, "point_one", "point_other")),
        })
      : t("liveSent");

  if (section) {
    return (
      <main class="pq-screen pq-live-screen">
        {badge}
        {/* A round card has no count and no points. Its name is the heading,
            so the meta line would only say it twice. The card does carry the
            round's size, its worth and its theme, the way the big screen does. */}
        <QuestionBody question={question} meta="" />
        {question.roundQuestions === 0 ? null : (
          <p class="pq-live-round">
            {question.roundQuestions}{" "}
            {t(
              pluralKey(
                question.roundQuestions,
                "question_one",
                "question_other",
              ),
            )}
            {" · "}
            {question.roundPoints}{" "}
            {t(pluralKey(question.roundPoints, "point_one", "point_other"))}
          </p>
        )}
        {question.roundSecret === null ? null : (
          <p class="pq-live-secret">
            {t("liveTheme", { theme: question.roundSecret })}
          </p>
        )}
        <p class="pq-live-hint" role="status">
          {t("liveNextSoon")}
        </p>
      </main>
    );
  }

  if (reveal !== null) {
    return (
      <main class="pq-screen pq-live-screen">
        {badge}
        <QuestionBody
          question={question}
          meta={questionMeta(t, question, false)}
        />
        <RevealPanel
          reveal={reveal}
          players={state.players}
          selfId={state.id}
          showEveryone={state.revealMode === RevealMode.Pass}
        />
      </main>
    );
  }

  if (state.watching) {
    return (
      <main class="pq-screen pq-live-screen">
        {badge}
        <QuestionBody
          question={question}
          meta={questionMeta(t, question, false)}
        />
        <p class="pq-live-hint" role="status">
          {t("liveWatching")}
        </p>
      </main>
    );
  }

  return (
    <main
      class="pq-screen pq-live-screen"
      data-pq-locked={state.submitted || state.closed ? "true" : undefined}
    >
      {badge}
      <QuestionBody
        question={question}
        meta={questionMeta(t, question, false)}
      />

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
          {sentNote}
        </p>
      ) : null}
      {state.closed && !state.submitted ? (
        <p class="pq-live-hint" role="status">
          {t("liveAnswersClosed")}
        </p>
      ) : null}
    </main>
  );
}
