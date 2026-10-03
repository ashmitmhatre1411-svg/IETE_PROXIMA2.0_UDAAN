import { z } from 'zod';
import { ApiError, mapDbError, ok, readJson, route } from '@/lib/api';
import { requireCore } from '@/lib/auth/guard';
import { RESET_PHRASE } from '@/lib/constants';
import { getServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('confirm') }),
  z.object({ action: z.literal('start') }),
  z.object({
    action: z.literal('reset'),
    mode: z.enum(['progress', 'all']),
    phrase: z.string(),
  }),
]);

export const POST = route(async (request: Request) => {
  const session = await requireCore(request, { mutating: true });
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) throw new ApiError('BAD_REQUEST', 400, 'Unknown event action.');
  const body = parsed.data;
  const db = getServiceClient();

  if (body.action === 'confirm' || body.action === 'start') {
    const { error } = await db.rpc('advance_event', {
      p_to: body.action === 'confirm' ? 'confirmed' : 'running',
      p_performed_by: session.name,
    });
    if (error) throw mapDbError(error);
    return ok({ ok: true });
  }

  // Reset: the server re-checks the typed phrase, the UI check alone is not trusted.
  if (body.phrase.trim() !== RESET_PHRASE) {
    throw new ApiError('PHRASE_MISMATCH', 400, `Type ${RESET_PHRASE} exactly to confirm.`);
  }
  const { error } = await db.rpc('reset_event', { p_mode: body.mode, p_performed_by: session.name });
  if (error) throw mapDbError(error);
  return ok({ ok: true });
});
