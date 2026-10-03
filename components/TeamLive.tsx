'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useLiveBoard } from '@/lib/hooks/useLiveBoard';
import { rankTeams } from '@/lib/leaderboard/rank';
import type { BoardData } from '@/lib/types';
import { LiveStatus } from './LiveStatus';
import { TeamCard } from './TeamCard';

/** Public single-team view: read-only, updates live. */
export function TeamLive({ initial, number }: { initial: BoardData | null; number: number }) {
  const { board, connection, lastUpdated, failed } = useLiveBoard(initial, '/api/leaderboard');
  const ranked = useMemo(() => rankTeams(board?.teams ?? []), [board]);
  const team = ranked.find((t) => t.teamNumber === number);

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/leaderboard" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          ← Back to leaderboard
        </Link>
        <LiveStatus connection={connection} lastUpdated={lastUpdated} failed={failed} />
      </div>
      <h1 className="mt-6 font-display text-2xl font-semibold">PROXIMA 2.0 — UDAAN UNLOCKED</h1>

      <div className="mt-5">
        {!board ? (
          <p className="panel px-5 py-8 text-center text-muted">{failed ? 'Could not load this team. Retrying…' : 'Loading…'}</p>
        ) : !team ? (
          <p className="panel px-5 py-8 text-center text-muted">Team {number} does not exist yet.</p>
        ) : (
          <TeamCard team={team} eventStatus={board.status} detail />
        )}
      </div>
    </main>
  );
}
