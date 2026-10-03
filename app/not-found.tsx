import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center">
      <div>
        <p className="font-display text-5xl font-bold">404</p>
        <p className="mt-3 text-muted">That page does not exist.</p>
        <Link href="/leaderboard" className="btn-primary mt-6">Go to the leaderboard</Link>
      </div>
    </main>
  );
}
