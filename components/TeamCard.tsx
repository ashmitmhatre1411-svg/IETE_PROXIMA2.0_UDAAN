import Link from 'next/link';
import { formatTime, ordinal, teamLabel } from '@/lib/format';
import { teamStatus } from '@/lib/leaderboard/status';
import type { EventStatus, RankedTeam } from '@/lib/types';
import { StageList, StageTrack } from './StageProgress';

/** Read-only team card used on the public site (mobile list and team page). No controls. */
export function TeamCard({
  team,
  eventStatus,
  flash = false,
  href,
  detail = false,
}: {
  team: RankedTeam;
  eventStatus: EventStatus;
  flash?: boolean;
  href?: string;
  detail?: boolean;
}) {
  const status = teamStatus(team, eventStatus);
  const winner = status.kind === 'winner';
  const first = team.finishOrder === 1;

  return (
    <article
      className={[
        'relative rounded-2xl border p-4 sm:p-5',
        winner ? (first ? 'border-gold/60 bg-gold/10 shadow-goldglow' : 'border-gold/30 bg-gold/5') : 'border-line bg-panel/85',
        flash ? 'row-flash' : '',
      ].join(' ')}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">
            {href ? (
              <Link href={href} className="after:absolute after:inset-0 after:content-['']">
                {teamLabel(team.teamNumber)}
              </Link>
            ) : (
              teamLabel(team.teamNumber)
            )}
          </h3>
          <p className={`mt-0.5 text-sm font-medium ${winner ? 'text-gold' : status.kind === 'playing' ? 'text-azure-soft' : 'text-muted'}`}>
            {status.text}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-semibold tabular-nums">
            {team.completedCount}
            <span className="text-dim">/5</span>
          </p>
          <p className="text-xs text-muted">{team.rank ? `Rank ${team.rank}` : 'Not started'}</p>
        </div>
      </header>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium text-muted">Members</p>
        <ul className="space-y-0.5 text-[0.95rem]">
          {team.members.map((m) => (
            <li key={m.name} className="truncate">
              {m.name}
              {detail && m.branch && <span className="text-muted"> — {m.branch}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 overflow-x-auto">
        {detail ? (
          <>
            <p className="mb-1.5 text-xs font-medium text-muted">Progress</p>
            <StageList stages={team.stages} showTimes />
            <p className="mt-3 text-sm text-muted">
              Progress: <span className="font-semibold tabular-nums text-ink">{team.completedCount} / 5</span>
            </p>
          </>
        ) : (
          <StageTrack stages={team.stages} size="md" currentStage={eventStatus === 'running' ? team.currentStage : null} />
        )}
      </div>

      {winner && (
        <p className="mt-4 rounded-lg bg-gold/10 px-3 py-2 text-sm font-semibold text-gold">
          ALL 5 STAGES CLEARED
          <span className="ml-2 font-normal tabular-nums text-gold/80">
            {formatTime(team.finishedAt)} · {team.finishOrder ? `${ordinal(team.finishOrder)} to finish` : ''}
          </span>
        </p>
      )}
    </article>
  );
}
