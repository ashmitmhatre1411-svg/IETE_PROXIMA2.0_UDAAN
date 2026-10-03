import type { ReactNode } from 'react';
import { formatTime } from '@/lib/format';
import type { StageView } from '@/lib/types';

/** One table cell: ✓ Cleared / 🔒 Not Cleared. Text collapses to the icon below xl screens. */
export function StageBadge({ cleared, stage }: { cleared: boolean; stage: number }) {
  return cleared ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet/15 px-2.5 py-1 text-sm font-medium text-violet-soft ring-1 ring-violet/30">
      <span aria-hidden>✓</span>
      <span className="sr-only xl:not-sr-only">Cleared</span>
      <span className="sr-only xl:hidden">Stage {stage}</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm text-dim">
      <span aria-hidden>🔒</span>
      <span className="sr-only xl:not-sr-only">Not Cleared</span>
      <span className="sr-only xl:hidden">Stage {stage}</span>
    </span>
  );
}

const TRACK = {
  sm: { node: 'h-6 w-6 text-xs', link: 'w-3' },
  md: { node: 'h-8 w-8 text-sm', link: 'w-5' },
  lg: { node: 'h-11 w-11 text-base', link: 'w-8' },
  fluid: { node: 'h-[1.9em] w-[1.9em] text-[0.8em]', link: 'w-[0.9em]' },
} as const;

/** Five connected nodes: the path a team walks. Cleared nodes are filled. */
export function StageTrack({
  stages,
  size = 'md',
  currentStage,
}: {
  stages: StageView[];
  size?: keyof typeof TRACK;
  currentStage?: number | null;
}) {
  const s = TRACK[size];
  const cleared = stages.filter((x) => x.completed).length;
  return (
    <ol className="inline-flex items-center" aria-label={`${cleared} of ${stages.length} stages cleared`}>
      {stages.map((st, i) => {
        const isCurrent = !st.completed && currentStage === st.stage;
        const next = stages[i + 1];
        return (
          <li key={st.stage} className="flex items-center" aria-label={`Stage ${st.stage} ${st.completed ? 'cleared' : 'not cleared'}`}>
            <span
              className={[
                'grid shrink-0 place-items-center rounded-full font-semibold tabular-nums transition-colors',
                s.node,
                st.completed
                  ? 'bg-violet text-white shadow-glow'
                  : isCurrent
                    ? 'border border-azure bg-azure/10 text-azure-soft'
                    : 'border border-line text-dim',
              ].join(' ')}
            >
              {st.completed ? '✓' : st.stage}
            </span>
            {next && (
              <span className={['h-0.5 rounded-full', s.link, st.completed && next.completed ? 'bg-violet' : st.completed ? 'bg-gradient-to-r from-violet to-line' : 'bg-line'].join(' ')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Vertical list: "✓ Stage 1 / 🔒 Stage 3". `action` lets the core panel add a Reset control. */
export function StageList({
  stages,
  showTimes = false,
  action,
}: {
  stages: StageView[];
  showTimes?: boolean;
  action?: (stage: StageView) => ReactNode;
}) {
  return (
    <ul className="space-y-1.5">
      {stages.map((s) => (
        <li key={s.stage} className="flex items-center justify-between gap-3 text-[0.95rem]">
          <span className={s.completed ? 'text-ink' : 'text-dim'}>
            <span aria-hidden className="mr-2 inline-block w-5 text-center">{s.completed ? '✓' : '🔒'}</span>
            Stage {s.stage}
            {showTimes && s.completed && (
              <span className="ml-2 text-xs text-muted tabular-nums">
                {formatTime(s.completedAt)}
                {s.completedBy ? ` · ${s.completedBy}` : ''}
              </span>
            )}
          </span>
          {action?.(s)}
        </li>
      ))}
    </ul>
  );
}
