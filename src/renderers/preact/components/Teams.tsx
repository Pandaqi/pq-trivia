/**
 * Teams, in three pieces.
 *
 * `TeamSetup` is the name box on the start screen. `TeamsBadge` says who is at
 * the table. `Scoreboard` is the thing you put up between rounds, and never
 * during a question: a score halfway through an answer is a spoiler.
 */

import type { JSX } from "preact";
import { useState } from "preact/hooks";
import type { Quiz } from "../../../core/session/quiz";
import {
  assignTeamColours,
  colourFor,
  teamStyle,
} from "../../../shared/teamColours";
import { useT } from "../i18n";

/** The box a host fills in. No code, no config file, just names. */
export function TeamSetup({
  quiz,
  onStart,
}: {
  readonly quiz: Quiz;
  readonly onStart: () => void;
}): JSX.Element | null {
  const t = useT();
  const [names, setNames] = useState((quiz.config.teams ?? []).join(", "));
  const configured = (quiz.config.teams ?? []).length > 0;
  if (quiz.config.disableUI === true) {
    return null;
  }
  // Off unless the quiz asks for teams. No box on a pub quiz that has none.
  if (!configured && quiz.state.teams.length === 0) {
    return null;
  }
  if (quiz.state.teams.length > 0) {
    const playing = quiz.state.teams.map((team) => team.name).join(" · ");
    return (
      <section class="pq-team-setup" aria-label={t("teams")}>
        <p class="pq-teams-playing">{t("teamsPlaying", { teams: playing })}</p>
        <button
          type="button"
          class="pq-team-setup-stop"
          onClick={() => quiz.stopTeams()}
        >
          {t("stopTeams")}
        </button>
      </section>
    );
  }
  return (
    <details class="pq-team-setup">
      <summary class="pq-link">{t("playTeams")}</summary>
      <label class="pq-field">
        <span class="pq-field-label">{t("teamNames")}</span>
        <input
          class="pq-input"
          type="text"
          value={names}
          placeholder={t("teamNamesHint")}
          onInput={(event) => setNames(event.currentTarget.value)}
        />
      </label>
      <button
        type="button"
        class="pq-primary"
        disabled={names.trim().length === 0}
        onClick={() => {
          quiz.setTeams(names.split(","));
          onStart();
        }}
      >
        {t("startTeams")}
      </button>
    </details>
  );
}

/**
 * Whose sheet is open, as a badge you can press.
 *
 * One screen, two teams: type Red's answer, press the badge, type Blue's. The
 * colour says which team without reading the word, and pressing it moves on.
 */
export function TeamsBadge({
  quiz,
}: {
  readonly quiz: Quiz;
}): JSX.Element | null {
  const t = useT();
  const teams = quiz.state.teams;
  const index = Math.max(quiz.state.team, 0);
  const active = teams[index];
  if (active === undefined) {
    return null;
  }
  const colours = assignTeamColours(teams.map((team) => team.name));
  return (
    <button
      type="button"
      class="pq-badge pq-badge-teams"
      style={teamStyle(colourFor(colours, active.name))}
      title={t("switchTeam")}
      onClick={() => quiz.setActiveTeam((index + 1) % teams.length)}
    >
      {t("teamsPlaying", { teams: active.name })}
      {teams.length > 1 ? (
        <span class="pq-badge-turn">
          {" "}
          {index + 1}/{teams.length}
        </span>
      ) : null}
    </button>
  );
}

/** Between rounds: nothing while everybody is still on zero. */
export function Scoreboard({
  quiz,
}: {
  readonly quiz: Quiz;
}): JSX.Element | null {
  const t = useT();
  // A hidden score is hidden everywhere, the team board included.
  const standings = quiz.config.hideScore === true ? [] : quiz.standings();
  if (standings.length === 0 || standings.every((row) => row.points === 0)) {
    return null;
  }
  const colours = assignTeamColours(standings.map((row) => row.name));
  return (
    <section class="pq-scoreboard" aria-label={t("scoreboard")}>
      <h2 class="pq-scoreboard-title">{t("scoreboard")}</h2>
      <ol class="pq-scoreboard-list">
        {standings.map((row) => (
          <li key={row.name} class="pq-scoreboard-row">
            <span class="pq-scoreboard-name">
              <span
                class="pq-scoreboard-dot"
                style={teamStyle(colourFor(colours, row.name))}
                aria-hidden="true"
              />
              {row.name}
            </span>
            <span class="pq-scoreboard-points">{row.points}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
