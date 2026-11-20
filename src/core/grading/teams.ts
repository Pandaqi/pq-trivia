/**
 * Teams. A name on the front of a scoreboard, nothing more.
 *
 * A team scores with the same grading, the same plan and its own responses.
 * Solo play is a quiz with no teams, which is still the default.
 */

import { gradeAttempt, type GradeReport, type ReportOptions } from "./report";
import type { QuizPlan } from "../plan/plan";
import type { ResponseMap } from "../session/responses";

/** More than this and the scoreboard stops fitting on a projector. */
export const MAX_TEAMS = 12;
/** Someone typed a comma and pressed go. The name still has to exist. */
export const DEFAULT_TEAM_NAME = "Team";

export interface TeamEntry {
  readonly name: string;
  readonly responses: ResponseMap;
  /** Lifelines this team spent. Missing means the shared sheet. */
  readonly lifelines?: Readonly<Record<string, readonly string[]>>;
}

export interface Standing {
  readonly name: string;
  readonly points: number;
  readonly maxPoints: number;
  readonly percent: number;
  readonly correct: number;
  readonly answered: number;
  readonly total: number;
  /** Per round, in plan order, for the scoreboard between rounds. */
  readonly rounds: readonly {
    readonly name: string;
    readonly points: number;
    readonly maxPoints: number;
  }[];
}

/**
 * Trim, drop blanks, cut past the limit and make every name unique. `2` after
 * a repeated name beats two identical rows on the board.
 */
export function cleanTeamNames(
  names: readonly string[],
  limit = MAX_TEAMS,
): string[] {
  const seen = new Map<string, number>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (name.length === 0) {
      continue;
    }
    const count = seen.get(name.toLowerCase()) ?? 0;
    seen.set(name.toLowerCase(), count + 1);
    out.push(count === 0 ? name : `${name} ${count + 1}`);
    if (out.length >= limit) {
      break;
    }
  }
  return out.length > 0
    ? out
    : Array.from(
        { length: 2 },
        (_, index) => `${DEFAULT_TEAM_NAME} ${index + 1}`,
      );
}

function standingOf(name: string, report: GradeReport): Standing {
  return {
    name,
    points: report.points,
    maxPoints: report.maxPoints,
    percent: report.percent,
    correct: report.correct,
    answered: report.answered,
    total: report.total,
    rounds: report.rounds.map((round) => ({
      name: round.name,
      points: round.points,
      maxPoints: round.maxPoints,
    })),
  };
}

/** One standing per team, in the order the teams were given. */
export function teamStandings(
  plan: QuizPlan,
  teams: readonly TeamEntry[],
  options: ReportOptions = {},
): Standing[] {
  return teams.map((team) =>
    standingOf(
      team.name,
      gradeAttempt(plan, team.responses, {
        ...options,
        ...(team.lifelines === undefined ? {} : { lifelines: team.lifelines }),
      }),
    ),
  );
}

/** Highest first. Ties keep their original order, which is the team order. */
export function leaderboard(
  standings: readonly Standing[],
): readonly Standing[] {
  return [...standings].sort((a, b) => b.points - a.points);
}

/** The team at the top, or null when the scores mean nothing yet. */
export function leaderOf(standings: readonly Standing[]): Standing | null {
  const first = leaderboard(standings)[0];
  if (first === undefined || first.points <= 0) {
    return null;
  }
  // A tie is not a leader. Say nothing rather than pick a favourite.
  const tied = standings.some(
    (team) => team !== first && team.points === first.points,
  );
  return tied ? null : first;
}
