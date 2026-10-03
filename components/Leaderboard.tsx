'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatTime, teamLabel } from '@/lib/format';
import { useChangeFlash, useLiveBoard } from '@/lib/hooks/useLiveBoard';
import { boardStats, rankTeams } from '@/lib/leaderboard/rank';
import { teamStatus } from '@/lib/leaderboard/status';
import type { BoardData, EventStatus, RankedTeam } from '@/lib/types';
import { Hero } from './Hero';
import { LiveStatus } from './LiveStatus';
import { StageBadge } from './StageProgress';
import { StageFunnel } from './StageFunnel';
import { TeamCard } from './TeamCard';
import { WinnerBanner } from './WinnerBanner';

export function Leaderboard({ initial }: { initial: BoardData | null }) {
  const { board, connection, lastUpdated, failed, refresh } = useLiveBoard(initial, '/api/leaderboard');
  const [query, setQuery] = useState('');

  const ranked = useMemo(() => rankTeams(board?.teams ?? []), [board]);
  const stats = useMemo(() => boardStats(ranked, board?.status ?? 'setup'), [ranked, board]);
  const flash = useChangeFlash(ranked);
  const finishers = useMemo(() => ranked.filter((t) => t.finishOrder !== null), [ranked]);

  const q = query.trim().toLowerCase();
  const visible = q
    ? ranked.filter(
        (t) =>
          teamLabel(t.teamNumber).toLowerCase().includes(q) ||
          String(t.teamNumber) === q.replace(/^team\s*0*/, '') ||
          t.members.some((m) => m.name.toLowerCase().includes(q)),
      )
    : ranked;

  const status: EventStatus = board?.status ?? 'setup';

  return (
    <div className="pb-16">
      <Hero>
        <StageFunnel cleared={stats.cleared} teamCount={ranked.length || 15} />
      </Hero>

      <main className="mx-auto mt-12 max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold tracking-wide sm:text-3xl">LIVE LEADERBOARD</h2>
          <LiveStatus connection={connection} lastUpdated={lastUpdated} failed={failed} />
        </div>

        {finishers.length > 0 && (
          <div className="mt-6">
            <WinnerBanner finishers={finishers} />
          </div>
        )}

        {!board ? (
          <Notice
            title={failed ? 'The leaderboard could not be loaded' : 'Loading the leaderboard…'}
            body={failed ? 'Check your connection. We keep retrying automatically.' : undefined}
            action={failed ? <button className="btn-ghost mt-4" onClick={() => void refresh()}>Try again</button> : undefined}
          />
        ) : ranked.length === 0 ? (
          <Notice title="Teams have not been announced yet" body="The leaderboard appears here as soon as the core team publishes the teams." />
        ) : (
          <>
            <div className="mt-6">
              <label className="sr-only" htmlFor="find">Find a team or a participant</label>
              <input
                id="find"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find your team or name"
                className="field max-w-sm"
                autoComplete="off"
              />
            </div>

            {visible.length === 0 ? (
              <Notice title="No team matches that search" body="Try a team number like 7, or part of a name." />
            ) : (
              <>
                {/* Tablet / laptop / projector: table */}
                <div className="panel mt-4 hidden overflow-hidden lg:block">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-line text-xs font-semibold text-muted">
                        <th className="w-16 px-4 py-3">Rank</th>
                        <th className="px-3 py-3">Team</th>
                        <th className="px-3 py-3">Members</th>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <th key={n} className="px-1.5 py-3 text-center xl:px-2">Stage {n}</th>
                        ))}
                        <th className="px-3 py-3 text-center">Progress</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((t) => (
                        <Row key={t.id} team={t} eventStatus={status} flash={flash.has(t.teamNumber)} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Phone / small tablet: cards */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:hidden">
                  {visible.map((t) => (
                    <TeamCard key={t.id} team={t} eventStatus={status} flash={flash.has(t.teamNumber)} href={`/leaderboard/team/${t.teamNumber}`} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm text-muted">
          <span>PROXIMA 2.0 — UDAAN UNLOCKED · IETE SPIT</span>
          <Link href="/leaderboard/display" className="underline-offset-4 hover:text-ink hover:underline">
            Open display mode for projectors
          </Link>
        </footer>
      </main>
    </div>
  );
}

function Row({ team, eventStatus, flash }: { team: RankedTeam; eventStatus: EventStatus; flash: boolean }) {
  const st = teamStatus(team, eventStatus);
  const winner = st.kind === 'winner';
  const first = team.finishOrder === 1;
  return (
    <tr className={`border-b border-line/60 last:border-0 ${winner ? (first ? 'bg-gold/[0.12]' : 'bg-gold/[0.06]') : 'hover:bg-panel2/40'} ${flash ? 'row-flash' : ''}`}>
      <td className={`px-4 py-3.5 font-display text-lg font-semibold tabular-nums ${winner ? 'text-gold' : 'text-ink'}`}>{team.rank ?? <span className="text-dim">–</span>}</td>
      <td className="px-3 py-3.5">
        <Link href={`/leaderboard/team/${team.teamNumber}`} className="font-display text-base font-semibold hover:text-violet-soft">
          {teamLabel(team.teamNumber)}
        </Link>
      </td>
      <td className="max-w-[16rem] px-3 py-3.5 text-sm text-muted">
        <span className="line-clamp-3">{team.members.map((m) => m.name).join(', ')}</span>
      </td>
      {team.stages.map((s) => (
        <td key={s.stage} className="px-1.5 py-3.5 text-center xl:px-2">
          <StageBadge cleared={s.completed} stage={s.stage} />
        </td>
      ))}
      <td className="px-3 py-3.5 text-center font-display text-lg font-semibold tabular-nums">
        {team.completedCount}
        <span className="text-dim">/5</span>
      </td>
      <td className="px-4 py-3.5 text-sm">
        <span className={`font-semibold ${winner ? 'text-gold' : st.kind === 'playing' ? 'text-azure-soft' : 'text-muted'}`}>{st.text}</span>
        {winner && (
          <span className="mt-0.5 block text-xs tabular-nums text-gold/80">
            {first ? 'First to finish · ' : `#${team.finishOrder} · `}
            {formatTime(team.finishedAt)}
          </span>
        )}
      </td>
    </tr>
  );
}

function Notice({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="panel mt-6 px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-md text-muted">{body}</p>}
      {action}
    </div>
  );
}
