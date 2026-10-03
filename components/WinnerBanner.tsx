import { formatTime, ordinal, teamLabel } from '@/lib/format';
import type { RankedTeam } from '@/lib/types';

/** Shown once any team has cleared all five stages. Others who also finished are listed in order. */
export function WinnerBanner({ finishers, large = false }: { finishers: RankedTeam[]; large?: boolean }) {
  const first = finishers[0];
  if (!first) return null;
  const rest = finishers.slice(1);
  return (
    <section
      aria-live="polite"
      className={`rounded-2xl border border-gold/60 bg-gold/10 shadow-goldglow ${large ? 'px-[1.4em] py-[0.8em]' : 'px-5 py-4 sm:px-6 sm:py-5'}`}
    >
      <p className={`font-display font-semibold text-gold ${large ? 'text-[1.9em]' : 'text-xl sm:text-3xl'}`}>
        🏆 {teamLabel(first.teamNumber)} <span className="ml-1">WINNER</span>
      </p>
      <p className={`mt-1 font-semibold tracking-[0.14em] text-gold/90 ${large ? 'text-[0.95em]' : 'text-sm'}`}>
        ALL 5 STAGES CLEARED
        <span className="ml-3 font-normal tabular-nums tracking-normal text-gold/75">{formatTime(first.finishedAt)}</span>
      </p>
      {rest.length > 0 && (
        <p className={`mt-2 text-gold/80 ${large ? 'text-[0.85em]' : 'text-sm'}`}>
          Also finished:{' '}
          {rest.map((t, i) => (
            <span key={t.id} className="tabular-nums">
              {i > 0 && ', '}
              {teamLabel(t.teamNumber)} ({ordinal(t.finishOrder ?? i + 2)}, {formatTime(t.finishedAt)})
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
