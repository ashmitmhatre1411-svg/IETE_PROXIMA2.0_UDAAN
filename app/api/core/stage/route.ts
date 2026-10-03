import { z } from 'zod';
import { ApiError, mapDbError, ok, readJson, route } from '@/lib/api';
import { requireCore } from '@/lib/auth/guard';
import { getServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.object({
  teamId: z.string().uuid(),
  stage: z.number().int().min(1).max(5),
  action: z.enum(['complete', 'reset']),
});

export const POST = route(async (request: Request) => {
  const session = await requireCore(request, { mutating: true });
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) throw new ApiError('BAD_REQUEST', 400, 'Choose a team and a stage from 1 to 5.');
  const { teamId, stage, action } = parsed.data;
  const db = getServiceClient();

  if (action === 'complete') {
    // Order, duplicates and "event running" are enforced inside the database function.
    const { error } = await db.rpc('complete_stage', {
      p_team_id: teamId,
      p_stage_number: stage,
      p_performed_by: session.name,
    });
    if (error) throw mapDbError(error);
    return ok({ ok: true });
  }

  const { data, error } = await db.rpc('reset_stage', {
    p_team_id: teamId,
    p_stage_number: stage,
    p_performed_by: session.name,
  });
  if (error) throw mapDbError(error);
  return ok({ ok: true, stagesReset: data as number });
});
