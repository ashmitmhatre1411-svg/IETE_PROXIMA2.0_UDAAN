import 'server-only';
import { ApiError } from '../api';
import { getServiceClient } from '../supabase/server';
import type { BoardData, EventStatus, MemberView, StageView, TeamView } from '../types';

interface TeamRow {
  id: string;
  team_number: number;
  winner: boolean;
  finished_at: string | null;
  team_members: Array<{ position: number; student: MemberView | MemberView[] | null }>;
  stage_progress: Array<{
    stage_number: number;
    completed: boolean;
    completed_at: string | null;
    completed_by: string | null;
  }>;
}

/**
 * Reads the whole board in two queries. `includeAudit` adds "who cleared it" and is only
 * ever passed from authenticated core code — the public endpoint never sets it.
 */
export async function fetchBoard(opts: { includeAudit?: boolean } = {}): Promise<BoardData> {
  const db = getServiceClient();
  const [teamsRes, stateRes] = await Promise.all([
    db
      .from('teams')
      .select(
        'id, team_number, winner, finished_at, team_members(position, student:students(name, branch)), stage_progress(stage_number, completed, completed_at, completed_by)',
      )
      .order('team_number', { ascending: true }),
    db.from('event_state').select('status, started_at').eq('id', 1).maybeSingle(),
  ]);

  if (teamsRes.error || stateRes.error) {
    console.error('[fetchBoard]', teamsRes.error ?? stateRes.error);
    throw new ApiError('DATABASE_ERROR', 503, 'The leaderboard is temporarily unavailable.');
  }

  const rows = (teamsRes.data ?? []) as unknown as TeamRow[];
  const teams: TeamView[] = rows.map((t) => {
    const members = [...t.team_members]
      .sort((a, b) => a.position - b.position)
      .map((m) => (Array.isArray(m.student) ? m.student[0] : m.student))
      .filter((m): m is MemberView => !!m)
      .map((m) => ({ name: m.name, branch: m.branch }));

    const stages: StageView[] = [1, 2, 3, 4, 5].map((n) => {
      const p = t.stage_progress.find((s) => s.stage_number === n);
      const view: StageView = {
        stage: n,
        completed: p?.completed ?? false,
        completedAt: p?.completed_at ?? null,
      };
      if (opts.includeAudit) view.completedBy = p?.completed_by ?? null;
      return view;
    });

    return {
      id: t.id,
      teamNumber: t.team_number,
      members,
      stages,
      winner: t.winner,
      finishedAt: t.finished_at,
    };
  });

  return {
    status: (stateRes.data?.status ?? 'setup') as EventStatus,
    startedAt: stateRes.data?.started_at ?? null,
    teams,
  };
}
