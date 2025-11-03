'use client';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { clientAuth } from '@/lib/firebaseClient';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(clientAuth, email, password);
      try {
        await sendEmailVerification(cred.user, {
          url: typeof window !== 'undefined' ? `${window.location.origin}/auth/action` : undefined,
          handleCodeInApp: true,
        } as any);
      } catch {}
      const idToken = await cred.user.getIdToken();
      const r = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!r.ok) throw new Error('Failed to start session');
      window.location.href = '/verify-email';
    } catch (err: any) {
      setError('Signup failed');
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="mb-4 text-2xl font-semibold">Sign up</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-black px-3 py-2 text-white">Create account</button>
      </form>
      <p className="mt-3 text-sm text-gray-600">
        Have an account?{' '}
        <a className="underline" href="/login">
          Log in
        </a>
      </p>
      <p className="mt-2 text-sm text-gray-600">Well email you a verification link.</p>
    </div>
  );
}
