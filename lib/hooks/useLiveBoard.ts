'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/browser';
import type { BoardData, RankedTeam } from '@/lib/types';

export type Connection = 'connecting' | 'live' | 'offline';

/**
 * Keeps a board in sync:
 *   • Supabase Realtime tells us "something changed" (read-only anon key),
 *   • we then re-fetch the full board from our own API,
 *   • plus a slow poll as a safety net if the websocket drops (venue Wi-Fi!).
 */
export function useLiveBoard(initial: BoardData | null, endpoint: string) {
  const [board, setBoard] = useState<BoardData | null>(initial);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [lastUpdated, setLastUpdated] = useState<number | null>(initial ? Date.now() : null);
  const [failed, setFailed] = useState(false);

  const inFlight = useRef(false);
  const queued = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    inFlight.current = true;
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/core/login';
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setBoard((await res.json()) as BoardData);
      setLastUpdated(Date.now());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      inFlight.current = false;
      if (queued.current) {
        queued.current = false;
        void refresh();
      }
    }
  }, [endpoint]);

  const scheduleRefresh = useCallback(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void refresh(), 150);
  }, [refresh]);

  // First load when the server could not provide data.
  useEffect(() => {
    if (!initial) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime change notifications.
  useEffect(() => {
    const client = getBrowserClient();
    if (!client) {
      setConnection('offline');
      return;
    }
    const channel = client
      .channel(`board-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stage_progress' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_state' }, scheduleRefresh)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnection('live');
          scheduleRefresh(); // catch anything missed while connecting
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnection('offline');
        }
      });
    return () => {
      clearTimeout(debounce.current);
      void client.removeChannel(channel);
    };
  }, [scheduleRefresh]);

  // Safety-net polling: slow while realtime is healthy, fast when it is not.
  useEffect(() => {
    const id = setInterval(() => void refresh(), connection === 'live' ? 20000 : 5000);
    return () => clearInterval(id);
  }, [connection, refresh]);

  // Refresh immediately when a laptop/phone wakes up or the tab is shown again.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [refresh]);

  return { board, connection, lastUpdated, failed, refresh };
}

/** Returns team numbers whose progress just increased, for a brief highlight. */
export function useChangeFlash(teams: RankedTeam[]): Set<number> {
  const previous = useRef<Map<number, number> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [flash, setFlash] = useState<Set<number>>(new Set());

  useEffect(() => {
    const now = new Map(teams.map((t) => [t.teamNumber, t.completedCount] as const));
    if (previous.current) {
      const changed = new Set<number>();
      now.forEach((count, n) => {
        if (count > (previous.current!.get(n) ?? 0)) changed.add(n);
      });
      if (changed.size > 0) {
        setFlash(changed);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setFlash(new Set()), 2800);
      }
    }
    previous.current = now;
  }, [teams]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return flash;
}
