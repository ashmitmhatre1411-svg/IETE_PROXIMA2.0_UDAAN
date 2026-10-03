'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ClientError, postJson } from '@/lib/client/api';

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await postJson('/api/core/login', { name, password });
      router.replace(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof ClientError ? e.message : 'Could not log in. Please try again.');
      setBusy(false);
    }
  }

  // Not a <form>: Enter is handled explicitly so the password never ends up in a URL.
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void submit();
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-muted">Your name</label>
        <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onEnter} autoComplete="name" autoFocus maxLength={60} />
        <p className="mt-1.5 text-xs text-dim">Recorded next to every stage you clear.</p>
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-muted">Core password</label>
        <input id="password" type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={onEnter} autoComplete="current-password" />
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}
      <button className="btn-primary w-full" disabled={busy || !name.trim() || !password} onClick={() => void submit()}>
        {busy ? 'Checking…' : 'Open control panel'}
      </button>
    </div>
  );
}
