'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center">
      <div>
        <p className="font-display text-2xl font-semibold">Something went wrong</p>
        <p className="mt-3 text-muted">The page could not be shown. Please try again.</p>
        <button onClick={reset} className="btn-primary mt-6">Try again</button>
      </div>
    </main>
  );
}
