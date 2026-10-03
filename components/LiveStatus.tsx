import type { Connection } from '@/lib/hooks/useLiveBoard';
import { formatTime } from '@/lib/format';

export function LiveStatus({
  connection,
  lastUpdated,
  failed,
  large = false,
}: {
  connection: Connection;
  lastUpdated: number | null;
  failed: boolean;
  large?: boolean;
}) {
  const label = failed ? 'Connection problem — retrying' : connection === 'live' ? 'Live' : connection === 'connecting' ? 'Connecting…' : 'Updating every few seconds';
  const color = failed ? 'bg-danger' : connection === 'live' ? 'bg-azure' : 'bg-gold';
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-full border border-line bg-panel/80 px-3 py-1 ${large ? 'text-base' : 'text-sm'} text-muted`}
    >
      <span className="relative flex h-2.5 w-2.5">
        {connection === 'live' && !failed && <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-azure opacity-60" />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
      </span>
      <span className="font-medium text-ink">{label}</span>
      {lastUpdated && <span className="hidden tabular-nums sm:inline">· {formatTime(new Date(lastUpdated).toISOString())}</span>}
    </span>
  );
}
