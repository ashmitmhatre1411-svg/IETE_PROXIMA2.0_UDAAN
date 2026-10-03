import { Leaderboard } from '@/components/Leaderboard';
import { fetchBoard } from '@/lib/leaderboard/fetch';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  // If the database is unreachable the page still renders and keeps retrying in the browser.
  const board = await fetchBoard().catch(() => null);
  return <Leaderboard initial={board} />;
}
