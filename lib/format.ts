import { EVENT_TIMEZONE } from './constants';

const timeFmt = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZone: EVENT_TIMEZONE,
});

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return timeFmt.format(d).toUpperCase();
}

export function teamLabel(n: number): string {
  return `TEAM ${String(n).padStart(2, '0')}`;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]!);
}
