'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatTime, teamLabel } from '@/lib/format';
import { useChangeFlash, useLiveBoard } from '@/lib/hooks/useLiveBoard';
import { rankTeams } from '@/lib/leaderboard/rank';
import { teamStatus } from '@/lib/leaderboard/status';
import type { BoardData } from '@/lib/types';
import { LiveStatus } from './LiveStatus';
import { StageTrack } from './StageProgress';
import { WinnerBanner } from './WinnerBanner';

/**
 * Projector view. Everything is sized relative to the screen height (the container's
 * font-size) so all 15 teams fit in one screen and stay readable from the back of the hall.
 */
export function DisplayBoard({ initial }: { initial: BoardData | null }) {
  const { board, connection, lastUpdated, failed } = useLiveBoard(initial, '/api/leaderboard');
  const ranked = useMemo(() => rankTeams(board?.teams ?? []), [board]);
  const flash = useChangeFlash(ranked);
  const finishers = useMemo(() => ranked.filter((t) => t.finishOrder !== null), [ranked]);
  const status = board?.status ?? 'setup';
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  return (
    <div className="flex min-h-screen flex-col px-[2vw] py-[1.6vh]" style={{ fontSize: 'clamp(11px, 2.2vh, 30px)' }}>
      <header className="flex items-center justify-between gap-[1em] pb-[0.8em]">
        <div>
          <h1 className="font-display text-[2.1em] font-bold leading-none text-ink [text-shadow:0_0_40px_rgba(139,108,255,0.5)]">PROXIMA 2.0</h1>
          <p className="mt-[0.3em] font-display text-[1em] tracking-[0.14em] text-violet-soft">UDAAN UNLOCKED · LIVE LEADERBOARD</p>
        </div>
        <div className="flex items-center gap-[0.8em]">
          <LiveStatus connection={connection} lastUpdated={lastUpdated} failed={failed} large />
          <button
            onClick={toggleFullscreen}
            className="rounded-[0.5em] border border-line px-[0.8em] py-[0.35em] text-[0.7em] text-muted opacity-60 transition hover:opacity-100"
          >
            {fullscreen ? 'Exit full screen' : 'Full screen'}
          </button>
          <Link href="/leaderboard" className="text-[0.7em] text-muted opacity-60 hover:opacity-100">
            Leaderboard
          </Link>
        </div>
      </header>

      {finishers.length > 0 && (
        <div className="mb-[0.6em]">
          <WinnerBanner finishers={finishers} large />
        </div>
      )}

      {!board || ranked.length === 0 ? (
        <div className="grid flex-1 place-items-center text-center">
          <p className="font-display text-[1.6em] text-muted">
            {!board ? 'Loading the leaderboard…' : 'Teams will appear here once the hunt is set up.'}
          </p>
        </div>
      ) : (
        <ol className="grid flex-1 gap-[0.35em]" style={{ gridTemplateRows: `repeat(${ranked.length}, minmax(2.6em, 1fr))` }}>
          {ranked.map((t) => {
            const st = teamStatus(t, status);
            const winner = st.kind === 'winner';
            return (
              <li
                key={t.id}
                className={[
                  'grid grid-cols-[2.2em_6.2em_minmax(0,1fr)_auto_3.4em_9.5em] items-center gap-[0.9em] rounded-[0.6em] border px-[0.9em]',
                  winner ? 'border-gold/50 bg-gold/10' : 'border-line bg-panel/80',
                  flash.has(t.teamNumber) ? 'row-flash' : '',
                ].join(' ')}
              >
                <span className={`font-display text-[1.25em] font-semibold tabular-nums ${winner ? 'text-gold' : 'text-muted'}`}>{t.rank ?? '–'}</span>
                <span className="font-display text-[1.25em] font-bold">{teamLabel(t.teamNumber)}</span>
                <span className="hidden truncate text-[0.72em] text-muted xl:block">{t.members.map((m) => m.name).join(' · ')}</span>
                <span className="col-start-4 xl:col-start-auto">
                  <StageTrack stages={t.stages} size="fluid" currentStage={status === 'running' ? t.currentStage : null} />
                </span>
                <span className="text-right font-display text-[1.25em] font-semibold tabular-nums">
                  {t.completedCount}
                  <span className="text-dim">/5</span>
                </span>
                <span className={`truncate text-[0.78em] font-semibold ${winner ? 'text-gold' : st.kind === 'playing' ? 'text-azure-soft' : 'text-muted'}`}>
                  {st.text}
                  {winner && <span className="block text-[0.8em] font-normal tabular-nums text-gold/80">{formatTime(t.finishedAt)}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
