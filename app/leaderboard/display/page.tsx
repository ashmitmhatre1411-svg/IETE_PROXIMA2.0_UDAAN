import type { Metadata } from 'next';
import { DisplayBoard } from '@/components/DisplayBoard';
import { fetchBoard } from '@/lib/leaderboard/fetch';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'PROXIMA 2.0 — Display' };

export default async function DisplayPage() {
  const board = await fetchBoard().catch(() => null);
  return <DisplayBoard initial={board} />;
}
