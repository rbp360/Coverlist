'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-black text-white min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <pre className="bg-neutral-900 rounded p-4 mb-4 text-red-400 max-w-xl overflow-x-auto">
          {error.message}
        </pre>
        <button
          className="rounded bg-brand-500 px-4 py-2 text-black font-semibold"
          onClick={() => reset()}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
