import { describe, expect, it } from 'vitest';
import { rankTeams } from '../lib/leaderboard/rank';
import type { TeamView } from '../lib/types';

function team(n: number, times: Array<string | null>): TeamView {
  const stages = [1, 2, 3, 4, 5].map((s) => ({
    stage: s,
    completed: !!times[s - 1],
    completedAt: times[s - 1] ?? null,
  }));
  const finishedAt = times[4] ?? null;
  return { id: `id-${n}`, teamNumber: n, members: [], stages, winner: !!finishedAt, finishedAt };
}
const t = (m: number) => `2026-10-03T10:${String(m).padStart(2, '0')}:00Z`;

describe('leaderboard sorting', () => {
  it('sorts by stages cleared, then by who reached that progress first', () => {
    const ranked = rankTeams([
      team(2, [t(1), t(5), t(9), t(20)]), // 4/5 reached at :20
      team(11, [t(1), t(2), t(3), t(4), t(40)]), // 5/5 at :40
      team(4, [t(1), t(2), t(3), t(4), t(30)]), // 5/5 at :30  → first finisher
      team(7, [t(1), t(5), t(9), t(15)]), // 4/5 reached at :15  → ahead of team 2
      team(1, []),
      team(3, [t(8)]),
    ]);
    expect(ranked.map((r) => r.teamNumber)).toEqual([4, 11, 7, 2, 3, 1]);
    expect(ranked.map((r) => r.finishOrder)).toEqual([1, 2, null, null, null, null]);
    expect(ranked.find((r) => r.teamNumber === 4)?.rank).toBe(1);
    expect(ranked.find((r) => r.teamNumber === 1)?.rank).toBeNull();
  });

  it('computes current stage and progress count', () => {
    const [a, b] = rankTeams([team(1, [t(1), t(2)]), team(2, [t(1), t(2), t(3), t(4), t(5)])]);
    expect(a?.completedCount).toBe(5);
    expect(a?.currentStage).toBeNull();
    expect(b?.completedCount).toBe(2);
    expect(b?.currentStage).toBe(3);
  });

  it('orders unstarted teams by team number (scenario 3 baseline: 0/5 → 1/5)', () => {
    const before = rankTeams([team(3, []), team(1, []), team(2, [])]).map((r) => r.teamNumber);
    expect(before).toEqual([1, 2, 3]);
    const after = rankTeams([team(3, [t(1)]), team(1, []), team(2, [])]);
    expect(after[0]?.teamNumber).toBe(3);
    expect(after[0]?.completedCount).toBe(1);
  });
});
