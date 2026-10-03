'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { RESET_PHRASE, STAGE_COUNT, TEAM_COUNT, TOTAL_STUDENTS } from '@/lib/constants';
import { ClientError, postJson } from '@/lib/client/api';
import { teamLabel } from '@/lib/format';
import { useLiveBoard } from '@/lib/hooks/useLiveBoard';
import { boardStats, rankTeams } from '@/lib/leaderboard/rank';
import type { BoardData, RankedTeam } from '@/lib/types';
import { ConfirmDialog } from './ConfirmDialog';
import { CoreTeamCard } from './CoreTeamCard';
import { LiveStatus } from './LiveStatus';
import { LogoutButton } from './LogoutButton';
import { Toast, useToast } from './Toast';

type Pending = { kind: 'complete' | 'reset'; team: RankedTeam; stage: number };

export function CoreDashboard({ initial, operator }: { initial: BoardData; operator: string }) {
  const { board, connection, lastUpdated, failed, refresh } = useLiveBoard(initial, '/api/core/board');
  const { toast, show } = useToast();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'progress' | 'all'>('progress');

  const status = board?.status ?? 'setup';
  // Core view is ordered by team number so cards never jump around under a moving finger.
  const teams = useMemo(() => rankTeams(board?.teams ?? []).sort((a, b) => a.teamNumber - b.teamNumber), [board]);
  const stats = useMemo(() => boardStats(teams, status), [teams, status]);

  const q = query.trim().toLowerCase();
  const visible = teams.filter((t) => {
    if (filter === 'finished' && t.completedCount < STAGE_COUNT) return false;
    if (/^[1-5]$/.test(filter) && t.currentStage !== Number(filter)) return false;
    if (!q) return true;
    return (
      teamLabel(t.teamNumber).toLowerCase().includes(q) ||
      String(t.teamNumber) === q.replace(/^team\s*0*/, '') ||
      t.members.some((m) => m.name.toLowerCase().includes(q))
    );
  });

  async function confirmStageAction() {
    if (!pending) return;
    setBusy(true);
    setDialogError(null);
    try {
      await postJson('/api/core/stage', { teamId: pending.team.id, stage: pending.stage, action: pending.kind });
      await refresh();
      show(
        pending.kind === 'complete'
          ? `${teamLabel(pending.team.teamNumber)} cleared Stage ${pending.stage}.`
          : `Stage ${pending.stage} reset for ${teamLabel(pending.team.teamNumber)}.`,
      );
      setPending(null);
    } catch (e) {
      setDialogError(e instanceof ClientError ? e.message : 'Could not complete that action.');
      void refresh(); // the board may have changed under us (another core member)
    } finally {
      setBusy(false);
    }
  }

  async function confirmEventReset(phrase: string) {
    setBusy(true);
    setDialogError(null);
    try {
      await postJson('/api/core/event', { action: 'reset', mode: resetMode, phrase });
      await refresh();
      setResetOpen(false);
      show(resetMode === 'all' ? 'Event reset. Upload a CSV to start again.' : 'All stage progress was cleared. Teams were kept.');
    } catch (e) {
      setDialogError(e instanceof ClientError ? e.message : 'Could not reset the event.');
    } finally {
      setBusy(false);
    }
  }

  const laterCleared = pending ? pending.team.stages.filter((s) => s.completed && s.stage > pending.stage).length : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">PROXIMA 2.0</h1>
          <p className="mt-1 font-display text-lg tracking-[0.1em] text-violet-soft">CORE CONTROL PANEL</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted">Signed in as <span className="font-semibold text-ink">{operator}</span></span>
          <Link href="/core/setup" className="btn-ghost">Setup</Link>
          <Link href="/leaderboard" target="_blank" className="btn-ghost">Public leaderboard</Link>
          <Link href="/leaderboard/display" target="_blank" className="btn-ghost">Display mode</Link>
          <LogoutButton />
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Event statistics">
        <Stat value={teams.length * 3 || TOTAL_STUDENTS} label="Students" />
        <Stat value={teams.length || TEAM_COUNT} label="Teams" />
        <Stat value={STAGE_COUNT} label="Stages" />
        <Stat value={stats.completed} label="Teams Completed" />
        <Stat value={stats.playing} label="Teams Currently Playing" />
        <Stat value={stats.winners} label="Winners" accent />
      </section>

      {status !== 'running' && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-5 py-4">
          <p className="text-sm text-gold">
            {status === 'setup'
              ? 'No teams yet. Upload the student CSV and generate teams to begin.'
              : status === 'generated'
                ? 'Teams are generated but not confirmed. Stage controls unlock after you confirm and start the hunt.'
                : 'Teams are confirmed. Start the hunt to unlock the stage controls.'}
          </p>
          <Link href="/core/setup" className="btn-primary">Go to setup</Link>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="core-search">Search teams</label>
        <input id="core-search" type="search" className="field max-w-xs" placeholder="Search team or member" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
        <label className="sr-only" htmlFor="core-filter">Filter by stage</label>
        <select id="core-filter" className="field w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All teams</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={String(n)}>Currently on Stage {n}</option>
          ))}
          <option value="finished">Finished all stages</option>
        </select>
        <span className="text-sm text-muted">{visible.length} of {teams.length} teams</span>
        <span className="ml-auto"><LiveStatus connection={connection} lastUpdated={lastUpdated} failed={failed} /></span>
      </div>

      {teams.length === 0 ? (
        <p className="panel mt-6 px-6 py-12 text-center text-muted">There are no teams yet.</p>
      ) : visible.length === 0 ? (
        <p className="panel mt-6 px-6 py-12 text-center text-muted">No team matches that search or filter.</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((t) => (
            <CoreTeamCard
              key={t.id}
              team={t}
              eventStatus={status}
              onComplete={(team, stage) => { setDialogError(null); setPending({ kind: 'complete', team, stage }); }}
              onReset={(team, stage) => { setDialogError(null); setPending({ kind: 'reset', team, stage }); }}
            />
          ))}
        </div>
      )}

      <section className="mt-14 rounded-2xl border border-danger/30 bg-danger/5 p-5">
        <h2 className="font-display text-lg font-semibold text-danger">Reset event</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Use this only for a fresh start or a dry run. You will be asked to type {RESET_PHRASE} before anything is changed.
        </p>
        <button className="btn-danger mt-4" onClick={() => { setDialogError(null); setResetOpen(true); }} disabled={teams.length === 0}>
          Reset event…
        </button>
      </section>

      <ConfirmDialog
        open={!!pending}
        title={pending?.kind === 'complete' ? `Complete Stage ${pending.stage}?` : 'Reset stage?'}
        description={
          pending?.kind === 'complete' ? (
            <>Mark Stage {pending.stage} as cleared for {teamLabel(pending.team.teamNumber)}. The time is recorded by the server along with your name.</>
          ) : pending ? (
            <>
              <p>Are you sure you want to reset Stage {pending.stage} for {teamLabel(pending.team.teamNumber)}?</p>
              {pending.stage < STAGE_COUNT && (
                <p className="mt-2">
                  Stage {pending.stage + 1}{pending.stage + 1 < STAGE_COUNT ? ` to Stage ${STAGE_COUNT}` : ''} will also be reset
                  {laterCleared > 0 ? ` (${laterCleared} cleared stage${laterCleared > 1 ? 's' : ''}).` : '.'}
                </p>
              )}
            </>
          ) : null
        }
        confirmLabel={pending?.kind === 'complete' ? `Complete Stage ${pending.stage}` : 'Reset stage'}
        tone={pending?.kind === 'reset' ? 'danger' : 'primary'}
        busy={busy}
        error={dialogError}
        onConfirm={confirmStageAction}
        onCancel={() => setPending(null)}
      />

      <ConfirmDialog
        open={resetOpen}
        title="Reset event"
        description="This cannot be undone. Choose what to reset:"
        confirmLabel="Reset event"
        tone="danger"
        requireText={RESET_PHRASE}
        busy={busy}
        error={dialogError}
        onConfirm={() => confirmEventReset(RESET_PHRASE)}
        onCancel={() => setResetOpen(false)}
      >
        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">Reset scope</legend>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-violet">
            <input type="radio" name="reset-mode" checked={resetMode === 'progress'} onChange={() => setResetMode('progress')} className="mt-1 accent-violet" />
            <span><span className="font-semibold text-ink">Clear progress only</span><br /><span className="text-muted">Keep the 15 teams. Every stage becomes not cleared and winners are removed.</span></span>
          </label>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-danger">
            <input type="radio" name="reset-mode" checked={resetMode === 'all'} onChange={() => setResetMode('all')} className="mt-1 accent-danger" />
            <span><span className="font-semibold text-ink">Delete everything</span><br /><span className="text-muted">Remove teams, students and progress. You will upload the CSV again.</span></span>
          </label>
        </fieldset>
      </ConfirmDialog>

      <Toast toast={toast} />
    </div>
  );
}

function Stat({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${accent ? 'border-gold/40 bg-gold/10' : 'border-line bg-panel/80'}`}>
      <p className={`font-display text-2xl font-semibold tabular-nums ${accent ? 'text-gold' : 'text-ink'}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
