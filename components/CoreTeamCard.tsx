import { formatTime, ordinal, teamLabel } from '@/lib/format';
import type { EventStatus, RankedTeam } from '@/lib/types';
import { StageList } from './StageProgress';

/** Control card for one team. Only ever rendered inside /core (behind login). */
export function CoreTeamCard({
  team,
  eventStatus,
  onComplete,
  onReset,
}: {
  team: RankedTeam;
  eventStatus: EventStatus;
  onComplete: (team: RankedTeam, stage: number) => void;
  onReset: (team: RankedTeam, stage: number) => void;
}) {
  const live = eventStatus === 'running';
  const finished = team.completedCount >= 5;
  const lastCleared = team.completedCount; // highest cleared stage (stages clear in order)

  return (
    <article
      className={`rounded-2xl border p-5 ${finished ? 'border-gold/60 bg-gold/10 shadow-goldglow' : 'border-line bg-panel/85'}`}
      aria-label={teamLabel(team.teamNumber)}
    >
      <header className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">{teamLabel(team.teamNumber)}</h3>
        {finished ? (
          <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">🏆 WINNER</span>
        ) : (
          <span className="rounded-full bg-panel2 px-3 py-1 text-xs font-medium tabular-nums text-muted">{team.completedCount}/5</span>
        )}
      </header>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium text-muted">Members</p>
        <ul className="space-y-0.5 text-[0.95rem]">
          {team.members.map((m) => (
            <li key={m.name}>
              {m.name}
              {m.branch && <span className="text-muted"> — {m.branch}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium text-muted">Progress</p>
        <StageList
          stages={team.stages}
          showTimes
          action={(s) =>
            s.completed ? (
              <button
                className="rounded-md px-2 py-0.5 text-xs font-medium text-muted underline-offset-2 hover:text-danger hover:underline"
                onClick={() => onReset(team, s.stage)}
                aria-label={`Reset stage ${s.stage} for ${teamLabel(team.teamNumber)}`}
              >
                Reset
              </button>
            ) : null
          }
        />
      </div>

      {finished ? (
        <p className="mt-4 rounded-lg bg-gold/10 px-3 py-2 text-sm font-semibold text-gold">
          ALL 5 STAGES CLEARED
          <span className="ml-2 font-normal tabular-nums text-gold/80">
            {formatTime(team.finishedAt)}
            {team.finishOrder ? ` · ${ordinal(team.finishOrder)} to finish` : ''}
          </span>
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Current stage: <span className="font-semibold text-ink">Stage {team.currentStage}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!finished && team.currentStage && (
          <button
            className="btn-primary flex-1"
            disabled={!live}
            title={live ? undefined : 'The hunt has not started yet'}
            onClick={() => onComplete(team, team.currentStage!)}
          >
            COMPLETE STAGE {team.currentStage}
          </button>
        )}
        {lastCleared > 0 && (
          <button className="btn-ghost" onClick={() => onReset(team, lastCleared)}>
            RESET
          </button>
        )}
      </div>
    </article>
  );
}
