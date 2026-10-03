export type EventStatus = 'setup' | 'generated' | 'confirmed' | 'running';

export interface MemberView {
  name: string;
  branch: string;
}

export interface StageView {
  stage: number;
  completed: boolean;
  completedAt: string | null;
  /** Only present in the authenticated /api/core/board response. */
  completedBy?: string | null;
}

export interface TeamView {
  id: string;
  teamNumber: number;
  members: MemberView[];
  stages: StageView[];
  winner: boolean;
  finishedAt: string | null;
}

export interface BoardData {
  status: EventStatus;
  startedAt: string | null;
  teams: TeamView[];
}

export interface RankedTeam extends TeamView {
  /** null for teams that have not cleared anything yet. */
  rank: number | null;
  completedCount: number;
  /** Time the team reached its current progress (latest cleared stage). */
  progressAt: string | null;
  /** Next stage to clear, or null when all five are cleared. */
  currentStage: number | null;
  /** 1 = first team to clear all five stages. */
  finishOrder: number | null;
}

export interface StudentInput {
  name: string;
  branch: string;
}
