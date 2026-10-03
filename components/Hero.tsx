import type { ReactNode } from 'react';
import { STAGE_COUNT, TEAM_COUNT } from '@/lib/constants';

export function Hero({ children }: { children?: ReactNode }) {
  return (
    <header className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14">
      <p className="text-sm font-medium text-violet-soft">IETE SPIT presents</p>
      <h1 className="mt-3 font-display text-[2.6rem] font-bold leading-none tracking-tight text-ink [text-shadow:0_0_48px_rgba(139,108,255,0.5)] sm:text-7xl lg:text-[5.5rem]">
        PROXIMA 2.0
      </h1>
      <p className="mt-3 font-display text-xl font-medium tracking-[0.12em] text-violet-soft sm:text-3xl">UDAAN UNLOCKED</p>
      <p className="mt-4 text-sm font-semibold tracking-[0.3em] text-muted sm:text-base">TREASURE HUNT</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Chip value={String(TEAM_COUNT)} label="TEAMS" />
        <Chip value={String(STAGE_COUNT)} label="STAGES" />
        <Chip value="1" label="WINNER GOAL" />
      </div>
      {children}
    </header>
  );
}

function Chip({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2.5 rounded-xl border border-line bg-panel/70 px-4 py-2.5">
      <span className="font-display text-2xl font-semibold tabular-nums text-ink">{value}</span>
      <span className="text-xs font-semibold tracking-[0.18em] text-muted">{label}</span>
    </div>
  );
}
