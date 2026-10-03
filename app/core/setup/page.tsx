import { redirect } from 'next/navigation';
import { SetupWizard } from '@/components/SetupWizard';
import { getCoreSession } from '@/lib/auth/guard';
import { fetchBoard } from '@/lib/leaderboard/fetch';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const session = await getCoreSession().catch(() => null);
  if (!session) redirect('/core/login');

  try {
    const board = await fetchBoard({ includeAudit: true });
    return <SetupWizard initial={board} operator={session.name} />;
  } catch {
    return (
      <main className="mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center">
        <div>
          <p className="font-display text-xl font-semibold">The database is not reachable</p>
          <p className="mt-2 text-muted">Check the Supabase environment variables and that schema.sql has been run, then reload.</p>
        </div>
      </main>
    );
  }
}
