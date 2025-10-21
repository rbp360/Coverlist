'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function AutoAccept({ onAccept }: { onAccept: (token: string) => void }) {
  const params = useSearchParams();
  const tokenFromUrl = params.get('token');
  useEffect(() => {
    if (tokenFromUrl) onAccept(tokenFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromUrl]);
  return null;
}

export default function AcceptInvitePage() {
  const [tokenInput, setTokenInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function accept(token: string) {
    setMessage(null);
    const res = await fetch('/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      setMessage('Invite accepted! You now have access.');
      // Optionally redirect user somewhere useful
      setTimeout(() => router.push('/projects'), 800);
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || 'Failed to accept invite');
    }
  }

  // Auto-accept if token in URL (wrapped in Suspense per Next.js requirement)
  // Use a child component that reads search params

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <AutoAccept onAccept={accept} />
      </Suspense>
      <h2 className="text-2xl font-semibold">Accept Invite</h2>
      <p className="text-sm text-neutral-600">
        Paste the invite token you received to join the project.
      </p>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Invite token"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
        />
        <button
          className="rounded bg-black px-3 py-2 text-white"
          onClick={() => accept(tokenInput)}
        >
          Accept
        </button>
      </div>
      {message && <div className="text-sm">{message}</div>}
    </div>
  );
}
