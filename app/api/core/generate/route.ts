import { z } from 'zod';
import { ApiError, mapDbError, ok, readJson, route } from '@/lib/api';
import { requireCore } from '@/lib/auth/guard';
import { validateStudents } from '@/lib/csv/validate';
import { getServiceClient } from '@/lib/supabase/server';
import { generateTeams } from '@/lib/teamGeneration/generate';
import type { StudentInput } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.object({
  // Omit `students` to reshuffle the roster that is already saved.
  students: z.array(z.object({ name: z.unknown(), branch: z.unknown().optional() })).max(500).optional(),
  confirmRegenerate: z.boolean().optional(),
});

export const POST = route(async (request: Request) => {
  const session = await requireCore(request, { mutating: true });
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) throw new ApiError('BAD_REQUEST', 400, 'The student list was not in the expected format.');

  const db = getServiceClient();
  const { data: state, error: stateErr } = await db.from('event_state').select('status').eq('id', 1).maybeSingle();
  if (stateErr) throw mapDbError(stateErr);
  const status = state?.status ?? 'setup';

  if (status === 'running') {
    throw new ApiError('EVENT_LOCKED', 409, 'The hunt is running, so teams are locked. Reset the event to change them.');
  }
  if (status !== 'setup' && !parsed.data.confirmRegenerate) {
    throw new ApiError(
      'CONFIRM_REQUIRED',
      409,
      'Teams already exist. Confirm that you want to replace them with a new random allocation.',
    );
  }

  let students: StudentInput[];
  if (parsed.data.students) {
    // The server re-validates everything; the browser preview is only a convenience.
    const result = validateStudents(parsed.data.students);
    if (!result.ok) {
      throw new ApiError('INVALID_CSV', 422, result.issues[0]?.message ?? 'The student list is not valid.', result.issues);
    }
    students = result.students;
  } else {
    const { data, error } = await db.from('students').select('name, branch');
    if (error) throw mapDbError(error);
    const result = validateStudents(data ?? []);
    if (!result.ok) throw new ApiError('NO_ROSTER', 422, 'There is no saved student list to reshuffle. Upload the CSV again.');
    students = result.students;
  }

  const teams = generateTeams(students);
  const { error } = await db.rpc('save_teams', { p_teams: teams, p_performed_by: session.name });
  if (error) throw mapDbError(error);

  return ok({ teams: teams.length, students: students.length });
});
