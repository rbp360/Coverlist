'use client';
import { useState } from 'react';

export default function ResetRequestPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('Sending...');
    setResetUrl(null);
    try {
      const res = await fetch('/api/auth/reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'failed');
      setStatus('If that email exists, a reset link has been sent.');
      if (json.resetUrl) setResetUrl(json.resetUrl);
    } catch (err: any) {
      setStatus('Failed to send reset link');
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Reset your password</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Send reset link
        </button>
      </form>
      {status && <p className="mt-4 text-sm">{status}</p>}
      {resetUrl && (
        <p className="mt-2 text-xs text-gray-600 break-all">
          Dev shortcut:{' '}
          <a className="underline" href={resetUrl}>
            {resetUrl}
          </a>
        </p>
      )}
    </div>
  );
}
