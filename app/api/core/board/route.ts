import { ok, route } from '@/lib/api';
import { requireCore } from '@/lib/auth/guard';
import { fetchBoard } from '@/lib/leaderboard/fetch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (request: Request) => {
  await requireCore(request);
  return ok(await fetchBoard({ includeAudit: true }));
});
