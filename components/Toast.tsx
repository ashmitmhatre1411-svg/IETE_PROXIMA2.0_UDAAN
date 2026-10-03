'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((message: string, tone: 'ok' | 'error' = 'ok') => {
    clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? 6000 : 3500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, show, dismiss: () => setToast(null) };
}

export function Toast({ toast }: { toast: { message: string; tone: 'ok' | 'error' } | null }) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <p
        role={toast.tone === 'error' ? 'alert' : 'status'}
        className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-glow ${
          toast.tone === 'error' ? 'border-danger/50 bg-panel text-danger' : 'border-violet/50 bg-panel text-ink'
        }`}
      >
        {toast.message}
      </p>
    </div>
  );
}
