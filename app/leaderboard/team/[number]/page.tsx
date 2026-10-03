import { notFound } from 'next/navigation';
import { TeamLive } from '@/components/TeamLive';
import { TEAM_COUNT } from '@/lib/constants';
import { fetchBoard } from '@/lib/leaderboard/fetch';

export const dynamic = 'force-dynamic';

export default async function TeamPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1 || n > TEAM_COUNT) notFound();
  const board = await fetchBoard().catch(() => null);
  return <TeamLive initial={board} number={n} />;
}
