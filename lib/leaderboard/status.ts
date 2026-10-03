import type { EventStatus, RankedTeam } from '../types';

export type StatusKind = 'winner' | 'playing' | 'waiting';

export function teamStatus(team: RankedTeam, eventStatus: EventStatus): { kind: StatusKind; text: string } {
  if (team.completedCount >= 5) return { kind: 'winner', text: '🏆 WINNER' };
  if (eventStatus !== 'running') return { kind: 'waiting', text: 'Waiting to start' };
  return { kind: 'playing', text: `Playing · Stage ${team.currentStage}` };
}
