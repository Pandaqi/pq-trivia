/** The host screen. Code, roster, one question, then whatever the mode says. */

import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { QuestionType } from "../../core/model/question";
import { pluralKey } from "../../core/values/marks";
import type { HostRoom } from "../host";
import { RevealMode, RoomPhase, type LivePlayer } from "../types";
import { teamStyle } from "../../shared/teamColours";
import { Celebration } from "../../shared/celebration";
import { winnersOf } from "../board";
import { useT } from "../../renderers/preact/i18n";
import type { Translate } from "../../i18n/types";
import {
  CodeCard,
  Leaderboard,
  playerGroups,
  RevealPanel,
  Roster,
} from "./parts";

type HostState = ReturnType<HostRoom["state"]>;

function useHost(host: HostRoom): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const off = host.subscribe(() => setVersion((value) => value + 1));
    // A player can join between this render and the subscription. Read the
    // current room once more so the first roster is not the stale one.
    setVersion((value) => value + 1);
    return off;
  }, [host]);
  return version;
}

/** The one loud button says what the next click will do, in every mode. */
function nextLabel(
  mode: RevealMode,
  inAnswers: boolean,
  last: boolean,
  t: Translate,
): string {
  if (inAnswers) {
    return last ? t("liveFinish") : t("liveNextAnswer");
  }
  if (last) {
    return mode === RevealMode.Pass ? t("liveAnswerPass") : t("liveFinish");
  }
  return t("liveNextQuestion");
}

function revealLabel(
  mode: RevealMode,
  inAnswers: boolean,
  t: Translate,
): string {
  if (inAnswers) {
    return t("liveShowAnswers");
  }
  return mode === RevealMode.Round
    ? t("liveRevealRoundAction")
    : t("liveRevealAction");
}

/** The room's phase in three words. */
function phaseKicker(lobby: boolean, inAnswers: boolean, t: Translate): string {
  if (lobby) {
    return t("liveLiveQuiz");
  }
  return inAnswers ? t("liveTheAnswers") : t("liveLiveQuestion");
}

/** Where the room is, and which round it is in. */
function metaLine(
  state: HostState,
  section: boolean,
  inAnswers: boolean,
  roundName: string | null | undefined,
  t: Translate,
): string {
  if (section) {
    return roundName ?? t("roundWord");
  }
  if (state.index < 0) {
    const unit = pluralKey(state.total, "question");
    return `${state.total} ${t(unit)}`;
  }
  const base = inAnswers
    ? t("liveAnswersOf", { index: state.index + 1, total: state.total })
    : t("questionOf", { index: state.index + 1, total: state.total });
  return roundName == null ? base : `${base} · ${roundName}`;
}

/** Lobby: the code, the roster, and the two settings that matter now. */
function LobbyPanel({
  host,
  state,
  mode,
}: {
  readonly host: HostRoom;
  readonly state: HostState;
  readonly mode: RevealMode;
}): JSX.Element {
  const t = useT();
  return (
    <>
      <Roster players={state.players} />
      <section class="pq-live-settings" aria-label={t("liveSettings")}>
        <label class="pq-field">
          <span class="pq-field-label">{t("liveReveal")}</span>
          <select
            class="pq-input"
            value={mode}
            onChange={(event) =>
              host.setRevealMode(event.currentTarget.value as RevealMode)
            }
          >
            <option value={RevealMode.Question}>
              {t("liveRevealQuestion")}
            </option>
            <option value={RevealMode.Round}>{t("liveRevealRound")}</option>
            <option value={RevealMode.End}>{t("liveRevealEnd")}</option>
            <option value={RevealMode.Pass}>{t("liveRevealPass")}</option>
          </select>
        </label>
        <label class="pq-check">
          <input
            type="checkbox"
            checked={state.sections}
            onChange={(event) => host.setSections(event.currentTarget.checked)}
          />
          {t("liveRoundCards")}
        </label>
      </section>
    </>
  );
}

/** Who is in, who is quiet, and what they put on the line. */
function ProgressPanel({
  seated,
  answered,
}: {
  readonly seated: readonly LivePlayer[];
  readonly answered: number;
}): JSX.Element {
  const t = useT();
  return (
    <section class="pq-live-progress" aria-label={t("liveAnswersIn")}>
      <p class="pq-live-count">
        {t("liveAnsweredOf", { answered, total: seated.length })}
      </p>
      <div class="pq-live-groups">
        {playerGroups(seated).map((group) => (
          <div class="pq-live-group" key={group.name ?? "solo"}>
            {group.name === null ? null : (
              <p class="pq-live-team-head" style={teamStyle(group.colour)}>
                {group.name}
              </p>
            )}
            <ul class="pq-live-players">
              {group.rows.map((player) => (
                <li
                  key={player.id}
                  data-pq-ready={player.answered ? "true" : "false"}
                >
                  <span>{player.name}</span>
                  <span class="pq-live-score">
                    {player.answered ? t("liveIn") : "…"}
                    {player.stake === null
                      ? ""
                      : ` · ${t("liveStaked", { points: player.stake })}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/** The buttons that move a live room forward. One per possible next step. */
function HostControls({
  host,
  phase,
  section,
  canReveal,
  mode,
  inAnswers,
  last,
}: {
  readonly host: HostRoom;
  readonly phase: RoomPhase;
  readonly section: boolean;
  readonly canReveal: boolean;
  readonly mode: RevealMode;
  readonly inAnswers: boolean;
  readonly last: boolean;
}): JSX.Element {
  const t = useT();
  return (
    <>
      {phase === RoomPhase.Question && !section ? (
        <button type="button" onClick={() => host.close()}>
          {t("liveCloseAnswers")}
        </button>
      ) : null}
      {canReveal ? (
        <button type="button" class="pq-primary" onClick={() => host.reveal()}>
          {revealLabel(mode, inAnswers, t)}
        </button>
      ) : null}
      <button
        type="button"
        class={canReveal ? "" : "pq-primary"}
        onClick={() => host.next()}
      >
        {nextLabel(mode, inAnswers, last, t)}
      </button>
      <button type="button" onClick={() => host.end()}>
        {t("liveEndQuiz")}
      </button>
    </>
  );
}

export function HostView({
  host,
  joinLink,
  celebration,
}: {
  readonly host: HostRoom;
  readonly joinLink: string;
  readonly celebration: boolean;
}): JSX.Element {
  useHost(host);
  const t = useT();
  const state = host.state();
  const question = host.question();
  const reveal = host.lastReveal();
  const phase = state.phase;
  const mode = state.revealMode;
  const lobby = phase === RoomPhase.Lobby;
  const inAnswers = phase === RoomPhase.Answers;
  // Watchers are in the room but not on the sheet. They never answer.
  const seated = state.players.filter((player) => player.watching !== true);
  const answered = seated.filter((player) => player.answered).length;
  const last = state.index + 1 >= state.total;
  const section = question?.type === QuestionType.Section;
  const canReveal =
    !section &&
    mode !== RevealMode.End &&
    ((phase === RoomPhase.Question && mode !== RevealMode.Pass) ||
      (inAnswers && mode === RevealMode.Pass));

  const standings = [...state.players]
    .sort((a, b) => b.score - a.score)
    .map((player) => ({
      id: player.id,
      name: player.team ?? player.name,
      score: player.score,
    }));
  const winners = winnersOf(standings);
  const championNames = standings
    .filter((row) => winners.has(row.id))
    .map((row) => row.name);

  // The quiz is over. The last question does not get to keep the board at its
  // feet: the board is the slide, and it gets the whole screen.
  if (phase === RoomPhase.Ended) {
    const champion =
      celebration && championNames.length > 0
        ? `${t(championNames.length === 1 ? "liveChampion" : "liveChampions")}: ${championNames.join(" & ")}`
        : null;
    return (
      <main class="pq-screen pq-live-screen pq-live-end">
        <p class="pq-live-kicker">{t("liveLiveQuiz")}</p>
        <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
          {t("liveThatIsQuiz")}
        </h1>
        {champion === null ? null : <Celebration message={champion} />}
        <Leaderboard rows={standings} />
      </main>
    );
  }

  const body = (): JSX.Element => {
    if (lobby) {
      return <LobbyPanel host={host} state={state} mode={mode} />;
    }
    if (section) {
      return (
        <p class="pq-live-hint" role="status">
          {t("liveRoundScreen")}
        </p>
      );
    }
    return <ProgressPanel seated={seated} answered={answered} />;
  };

  return (
    <main class="pq-screen pq-live-screen">
      <header class="pq-live-head">
        <p class="pq-live-kicker">{phaseKicker(lobby, inAnswers, t)}</p>
        <h1 class="pq-live-heading" data-pq-heading tabIndex={-1}>
          {lobby ? t("liveWaiting") : (question?.title ?? t("liveLiveQuiz"))}
        </h1>
        {lobby ? <CodeCard code={state.code} link={joinLink} /> : null}
        <p class="pq-live-meta">
          {metaLine(state, section, inAnswers, question?.roundName, t)}
        </p>
      </header>

      {body()}

      {state.buzz === null || phase !== RoomPhase.Question ? null : (
        <p class="pq-live-hint pq-live-buzz" role="status">
          {t("liveBuzzedFirst", { name: state.buzz.name })}
        </p>
      )}

      {reveal === null ? null : (
        <RevealPanel
          reveal={reveal}
          players={state.players}
          showEveryone={mode === RevealMode.Pass}
        />
      )}

      <footer class="pq-toolbar">
        {lobby ? (
          <button
            type="button"
            class="pq-primary"
            disabled={state.players.length === 0}
            onClick={() => host.start()}
          >
            {t("liveStartQuiz")}
          </button>
        ) : null}
        {lobby ? null : (
          <HostControls
            host={host}
            phase={phase}
            section={section}
            canReveal={canReveal}
            mode={mode}
            inAnswers={inAnswers}
            last={last}
          />
        )}
      </footer>
    </main>
  );
}
