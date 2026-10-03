import { ok, route } from '@/lib/api';
import { fetchBoard } from '@/lib/leaderboard/fetch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Public, read-only. Never includes who cleared a stage.
export const GET = route(async () => ok(await fetchBoard()));
