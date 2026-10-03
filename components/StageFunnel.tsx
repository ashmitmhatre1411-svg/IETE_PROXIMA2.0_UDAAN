import { STAGE_NUMBERS } from '@/lib/constants';

/**
 * The route every team flies: five checkpoints, each labelled with how many teams
 * have cleared it so far. Real numbers only — it reads straight from the board.
 */
export function StageFunnel({ cleared, teamCount }: { cleared: number[]; teamCount: number }) {
  return (
    <section aria-label="Teams that have cleared each stage" className="mt-10">
      <ol className="relative grid grid-cols-5 gap-1 sm:gap-3">
        <span aria-hidden className="absolute left-[10%] right-[10%] top-[1.05rem] h-px bg-gradient-to-r from-violet/60 via-azure/50 to-line" />
        {STAGE_NUMBERS.map((n, i) => {
          const count = cleared[i] ?? 0;
          const any = count > 0;
          return (
            <li key={n} className="relative flex flex-col items-center text-center">
              <span
                className={`z-10 grid h-[2.1rem] w-[2.1rem] place-items-center rounded-full border text-sm font-semibold tabular-nums ${
                  any ? 'border-violet bg-violet text-white shadow-glow' : 'border-line bg-void text-dim'
                }`}
              >
                {n}
              </span>
              <span className="mt-2 text-sm font-medium text-ink">Stage {n}</span>
              <span className="text-xs text-muted tabular-nums">
                {count} of {teamCount} teams
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
