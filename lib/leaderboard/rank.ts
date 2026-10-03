import type { RankedTeam, TeamView } from '../types';
import { STAGE_COUNT } from '../constants';

function ts(iso: string | null): number {
  return iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY;
}

/**
 * Leaderboard order:
 *   1. more stages cleared first
 *   2. equal progress → whoever reached that progress EARLIER (timestamp of the latest cleared stage)
 *   3. still equal (e.g. nobody has started) → team number
 * Teams that cleared all five stages therefore appear in the order they finished.
 */
export function rankTeams(teams: TeamView[]): RankedTeam[] {
  const enriched = teams.map((t) => {
    const done = t.stages.filter((s) => s.completed).sort((a, b) => a.stage - b.stage);
    const last = done[done.length - 1];
    return {
      ...t,
      rank: null as number | null,
      completedCount: done.length,
      progressAt: last?.completedAt ?? null,
      currentStage: done.length >= STAGE_COUNT ? null : done.length + 1,
      finishOrder: null as number | null,
    };
  });

  enriched.sort((a, b) => {
    if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
    if (a.completedCount > 0) {
      const d = ts(a.progressAt) - ts(b.progressAt);
      if (d !== 0) return d;
    }
    return a.teamNumber - b.teamNumber;
  });

  let finishers = 0;
  enriched.forEach((t, i) => {
    if (t.completedCount > 0) t.rank = i + 1;
    if (t.completedCount >= STAGE_COUNT) t.finishOrder = ++finishers;
  });
  return enriched;
}

export function boardStats(teams: RankedTeam[], status: string) {
  const completed = teams.filter((t) => t.completedCount >= STAGE_COUNT).length;
  const started = teams.filter((t) => t.completedCount > 0 && t.completedCount < STAGE_COUNT).length;
  const playing = status === 'running' ? teams.length - completed : 0;
  const winners = teams.filter((t) => t.winner).length;
  const cleared = [1, 2, 3, 4, 5].map(
    (n) => teams.filter((t) => t.stages.some((s) => s.stage === n && s.completed)).length,
  );
  return { completed, started, playing, winners, cleared, notStarted: teams.filter((t) => t.completedCount === 0).length };
}
