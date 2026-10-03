'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { postJson } from '@/lib/client/api';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await postJson('/api/core/logout', {});
        } catch {
          /* cookie may already be gone */
        }
        router.replace('/core/login');
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
