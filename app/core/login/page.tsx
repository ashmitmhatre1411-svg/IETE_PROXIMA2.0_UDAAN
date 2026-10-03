import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { getCoreSession } from '@/lib/auth/guard';

export const dynamic = 'force-dynamic';

function safeNext(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  // Only same-site /core paths; blocks open redirects like //evil.com
  return v && v.startsWith('/core') && !v.startsWith('//') ? v : '/core';
}

export default async function CoreLoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getCoreSession().catch(() => null)) redirect(next);

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-4 py-10">
      <div className="w-full">
        <h1 className="font-display text-3xl font-bold">PROXIMA 2.0</h1>
        <p className="mt-1 font-display tracking-[0.1em] text-violet-soft">CORE LOGIN</p>
        <div className="panel mt-8 p-6">
          <LoginForm next={next} />
        </div>
        <p className="mt-4 text-center text-sm text-dim">Only the core team can change stages. The public leaderboard needs no login.</p>
      </div>
    </main>
  );
}
