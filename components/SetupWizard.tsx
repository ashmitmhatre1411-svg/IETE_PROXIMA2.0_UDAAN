'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { TEAM_COUNT, TOTAL_STUDENTS } from '@/lib/constants';
import { ClientError, postJson } from '@/lib/client/api';
import { validateStudents, type ValidationResult } from '@/lib/csv/validate';
import { teamLabel } from '@/lib/format';
import { useLiveBoard } from '@/lib/hooks/useLiveBoard';
import type { BoardData } from '@/lib/types';
import { ConfirmDialog } from './ConfirmDialog';
import { CsvUploader, type ParsedCsv } from './CsvUploader';
import { LogoutButton } from './LogoutButton';

type StepState = 'done' | 'active' | 'todo';

export function SetupWizard({ initial, operator }: { initial: BoardData; operator: string }) {
  const { board, refresh } = useLiveBoard(initial, '/api/core/board');
  const status = board?.status ?? 'setup';
  const teams = board?.teams ?? [];
  const hasTeams = teams.length > 0;

  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [replacing, setReplacing] = useState(false); // upload a new CSV although teams exist
  const [busy, setBusy] = useState<null | 'generate' | 'confirm' | 'start'>(null);
  const [error, setError] = useState<string | null>(null);
  const [regenDialog, setRegenDialog] = useState<null | 'reshuffle' | 'replace'>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [justGenerated, setJustGenerated] = useState(false);

  const result: ValidationResult | null = useMemo(() => (csv && !csv.problem ? validateStudents(csv.rows) : null), [csv]);
  const badRows = useMemo(() => new Set((result?.issues ?? []).filter((i) => i.row > 0).map((i) => i.row)), [result]);

  const locked = status === 'running';
  const showUpload = !locked && (status === 'setup' || replacing);
  const csvOk = !!result?.ok;

  const step1: StepState = csv && !csv.problem ? 'done' : showUpload ? 'active' : hasTeams ? 'done' : 'todo';
  const step2: StepState = csvOk ? 'done' : csv && !csv.problem ? 'active' : hasTeams && !showUpload ? 'done' : 'todo';
  const step3: StepState = hasTeams && !replacing ? 'done' : csvOk ? 'active' : 'todo';
  const step4: StepState = status === 'confirmed' || locked ? 'done' : status === 'generated' && !replacing ? 'active' : 'todo';
  const step5: StepState = locked ? 'done' : status === 'confirmed' ? 'active' : 'todo';

  async function generate(useCsv: boolean) {
    setBusy('generate');
    setError(null);
    setDialogError(null);
    try {
      await postJson('/api/core/generate', {
        students: useCsv ? csv?.rows : undefined,
        confirmRegenerate: hasTeams ? true : undefined,
      });
      await refresh();
      setReplacing(false);
      setCsv(null);
      setRegenDialog(null);
      setJustGenerated(true);
    } catch (e) {
      const message = e instanceof ClientError ? e.message : 'Could not generate teams.';
      if (regenDialog) setDialogError(message);
      else setError(message);
    } finally {
      setBusy(null);
    }
  }

  async function advance(action: 'confirm' | 'start') {
    setBusy(action);
    setError(null);
    try {
      await postJson('/api/core/event', { action });
      await refresh();
    } catch (e) {
      setError(e instanceof ClientError ? e.message : 'Could not complete that step.');
      void refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">PROXIMA 2.0</h1>
          <p className="mt-1 font-display text-lg tracking-[0.1em] text-violet-soft">EVENT SETUP</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted">Signed in as <span className="font-semibold text-ink">{operator}</span></span>
          <Link href="/core" className="btn-ghost">Control panel</Link>
          <LogoutButton />
        </div>
      </header>

      {locked && (
        <div className="mt-8 rounded-2xl border border-azure/40 bg-azure/10 px-5 py-4">
          <p className="font-semibold text-azure-soft">The hunt is live. Team allocation is locked.</p>
          <p className="mt-1 text-sm text-muted">To change teams, reset the event from the control panel. That clears all progress.</p>
          <Link href="/core" className="btn-primary mt-4">Open control panel</Link>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <ol className="mt-8 space-y-4">
        <Step n={1} title="Upload student CSV" state={step1} open={showUpload} summary={csv && !csv.problem ? csv.fileName : hasTeams ? 'Roster saved' : undefined}>
          {csv?.problem && <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{csv.problem}</p>}
          <CsvUploader onParsed={setCsv} disabled={!showUpload} />
          {replacing && (
            <button className="btn-ghost mt-4" onClick={() => { setReplacing(false); setCsv(null); }}>Keep the current teams</button>
          )}
        </Step>

        <Step n={2} title={`Verify ${TOTAL_STUDENTS} students`} state={step2} open={!!result} summary={csvOk ? `${result!.count} students look good` : hasTeams ? `${TOTAL_STUDENTS} students saved` : undefined}>
          {result && (
            <>
              <p className={`text-sm font-semibold ${result.ok ? 'text-azure-soft' : 'text-danger'}`}>
                {result.count} of {TOTAL_STUDENTS} students found{result.ok ? ' — ready to go.' : '.'}
              </p>
              {result.issues.length > 0 && (
                <ul role="alert" className="mt-3 space-y-1 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {result.issues.slice(0, 12).map((i, idx) => <li key={idx}>{i.message}</li>)}
                  {result.issues.length > 12 && <li>…and {result.issues.length - 12} more.</li>}
                </ul>
              )}
              <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-panel2 text-xs text-muted">
                    <tr><th className="px-3 py-2 w-12">#</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Branch</th></tr>
                  </thead>
                  <tbody>
                    {csv!.rows.map((r, i) => (
                      <tr key={i} className={`border-t border-line/60 ${badRows.has(i + 1) ? 'bg-danger/10' : ''}`}>
                        <td className="px-3 py-1.5 tabular-nums text-dim">{i + 1}</td>
                        <td className="px-3 py-1.5">{r.name || <span className="text-danger">(empty)</span>}</td>
                        <td className="px-3 py-1.5 text-muted">{r.branch}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!result.ok && <p className="mt-3 text-sm text-muted">Fix the file and upload it again in Step 1.</p>}
            </>
          )}
        </Step>

        <Step n={3} title={`Generate ${TEAM_COUNT} teams`} state={step3} summary={hasTeams && !replacing ? `${TEAM_COUNT} teams of 3` : undefined}>
          {csvOk ? (
            <>
              <p className="mb-4 text-sm text-muted">Students are shuffled at random and split into {TEAM_COUNT} teams of 3. The result is saved permanently, so refreshing never reshuffles.</p>
              <button
                className="btn-primary"
                disabled={busy !== null}
                onClick={() => (hasTeams ? (setDialogError(null), setRegenDialog('replace')) : void generate(true))}
              >
                {busy === 'generate' ? 'Generating…' : 'Generate Teams'}
              </button>
            </>
          ) : (
            <p className="text-sm text-muted">Upload and verify the CSV first.</p>
          )}
        </Step>

        <Step n={4} title="Confirm team allocation" state={step4} open={(status === 'generated' || status === 'confirmed') && !replacing} summary={status === 'confirmed' || locked ? 'Confirmed' : undefined}>
          <p className="mb-4 text-sm text-muted">Check the teams below. Once you confirm, the only way to change them is a full reset.</p>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" disabled={busy !== null || status === 'confirmed'} onClick={() => void advance('confirm')}>
              {busy === 'confirm' ? 'Confirming…' : status === 'confirmed' ? '✓ Teams confirmed' : 'Confirm teams'}
            </button>
            <button className="btn-ghost" disabled={busy !== null} onClick={() => { setDialogError(null); setRegenDialog('reshuffle'); }}>
              Reshuffle teams
            </button>
            <button className="btn-ghost" disabled={busy !== null} onClick={() => { setReplacing(true); setCsv(null); }}>
              Upload a different CSV
            </button>
          </div>
        </Step>

        <Step n={5} title="Start treasure hunt" state={step5} summary={locked ? 'Hunt is live' : undefined}>
          <p className="mb-4 text-sm text-muted">Starting unlocks the stage controls and locks the teams. The public leaderboard switches to “Playing”.</p>
          <button className="btn-primary" disabled={busy !== null} onClick={() => void advance('start')}>
            {busy === 'start' ? 'Starting…' : 'Start treasure hunt'}
          </button>
        </Step>
      </ol>

      {hasTeams && (
        <section className="mt-10" aria-label="Generated teams">
          <div className="rounded-2xl border border-violet/40 bg-violet/10 px-5 py-4">
            <p className="font-display text-xl font-semibold">{teams.length} Teams Generated Successfully</p>
            <p className="mt-1 text-sm text-muted">{justGenerated ? 'Saved to the database. ' : ''}These assignments are permanent until the event is reset.</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t) => (
              <div key={t.id} className="rounded-xl border border-line bg-panel/80 p-4">
                <p className="font-display text-sm font-semibold">{teamLabel(t.teamNumber)}</p>
                <ol className="mt-2 list-inside list-decimal space-y-0.5 text-sm">
                  {t.members.map((m) => (
                    <li key={m.name} className="truncate">
                      {m.name}
                      {m.branch && <span className="text-muted"> — {m.branch}</span>}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={regenDialog !== null}
        title={regenDialog === 'replace' ? 'Replace the current teams?' : 'Reshuffle the teams?'}
        description={
          regenDialog === 'replace'
            ? 'The students in the new CSV will be shuffled into brand-new teams. The current teams are deleted.'
            : 'The same students are shuffled into a new random allocation. The current teams are deleted.'
        }
        confirmLabel={regenDialog === 'replace' ? 'Replace teams' : 'Reshuffle teams'}
        tone="danger"
        busy={busy === 'generate'}
        error={dialogError}
        onConfirm={() => generate(regenDialog === 'replace')}
        onCancel={() => setRegenDialog(null)}
      />
    </div>
  );
}

function Step({ n, title, state, summary, open, children }: { n: number; title: string; state: StepState; summary?: string; open?: boolean; children: ReactNode }) {
  return (
    <li className={`rounded-2xl border p-5 ${state === 'active' ? 'border-violet/60 bg-panel shadow-glow' : 'border-line bg-panel/60'}`} aria-current={state === 'active' ? 'step' : undefined}>
      <div className="flex items-center gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${state === 'done' ? 'bg-violet text-white' : state === 'active' ? 'border border-violet text-violet-soft' : 'border border-line text-dim'}`}>
          {state === 'done' ? '✓' : n}
        </span>
        <h2 className={`font-display text-base font-semibold ${state === 'todo' ? 'text-dim' : 'text-ink'}`}>{title}</h2>
        {summary && !(open ?? state === 'active') && <span className="ml-auto text-sm text-muted">{summary}</span>}
      </div>
      {(open ?? state === 'active') && <div className="mt-4">{children}</div>}
    </li>
  );
}
