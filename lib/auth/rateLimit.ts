import 'server-only';

// Best-effort brute-force throttle. State is per server instance (serverless instances do not
// share memory), so this slows guessing down rather than being an absolute guarantee. The
// password is also compared in constant time and failures are artificially delayed.
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

export function loginBlockedFor(key: string): number {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= Date.now()) return 0;
  return entry.count >= MAX_ATTEMPTS ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 0;
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
  if (attempts.size > 500) for (const [k, v] of attempts) if (v.resetAt <= now) attempts.delete(k);
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
