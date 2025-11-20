'use client';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';

import { clientAuth, FIREBASE_ENABLED } from '@/lib/firebaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (FIREBASE_ENABLED && clientAuth) {
        // Firebase email/password login
        const cred = await signInWithEmailAndPassword(clientAuth, email, password);
        const idToken = await cred.user.getIdToken();
        const r = await fetch('/api/auth/session?debug=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, debug: 1 }),
        });
        if (!r.ok) {
          const info = await r.json().catch(() => ({}) as any);
          if (info?.debug) {
            // Non-sensitive diagnostics printed to help troubleshoot locally
            console.log('[session.debug]', info.debug);
          }
          throw new Error('Failed to start session');
        }
        window.location.href = '/projects';
      } else {
        // Legacy/local login
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          if (data.error === 'invalid_credentials') {
            setError('Invalid email or password');
            if (email) setShowReset(true);
          } else if (data.error === 'invalid_input') {
            setError('Please fill all fields');
          } else {
            setError('Login failed');
          }
          return;
        }
        window.location.href = '/projects';
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed');
      if (email) setShowReset(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="mb-4 text-2xl font-semibold">Log in</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {showReset && email && (
          <button
            type="button"
            className="w-full mt-2 rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                const r = await fetch('/api/auth/request-password-reset', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email }),
                });
                if (!r.ok) throw new Error('Failed to send reset email');
                setError('Password reset email sent. Check your inbox.');
                setShowReset(false);
              } catch (e: any) {
                setError(e?.message || 'Failed to send reset email');
              } finally {
                setLoading(false);
              }
            }}
          >
            Reset password
          </button>
        )}
        <button
          disabled={loading}
          className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-60"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <div className="mt-4 text-sm text-center">
        <a href="/signup" className="underline">
          Need an account? Sign up
        </a>
      </div>
    </div>
  );
}
