'use client';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { clientAuth, FIREBASE_ENABLED, signInWithGoogle } from '@/lib/firebaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (FIREBASE_ENABLED && clientAuth) {
        const cred = await signInWithEmailAndPassword(clientAuth, email, password);
        const idToken = await cred.user.getIdToken();
        const r = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        if (!r.ok) throw new Error('Failed to start session');
        // If email not verified, guide user to verify page
        if (!cred.user.emailVerified) {
          window.location.href = '/verify-email';
          return;
        }
        window.location.href = '/projects';
      } else {
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!r.ok) throw new Error('Invalid credentials');
        window.location.href = '/projects';
      }
    } catch (err: any) {
      setError('Invalid credentials');
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="mb-4 text-2xl font-semibold">Log in</h2>
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
        <button className="w-full rounded bg-black px-3 py-2 text-white">Log in</button>
      </form>
      <div className="mt-6">
        <button
          className="w-full flex items-center justify-center gap-2 rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
          onClick={async () => {
            setError(null);
            try {
              const cred = await signInWithGoogle();
              const idToken = await cred.user.getIdToken();
              const r = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
              });
              if (!r.ok) throw new Error('Failed to start session');
              window.location.href = '/projects';
            } catch (err: any) {
              setError('Google sign-in failed');
            }
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g>
              <path
                d="M44.5 20H24V28.5H35.7C34.3 32.1 30.7 34.5 26.5 34.5C21.5 34.5 17.5 30.5 17.5 25.5C17.5 20.5 21.5 16.5 26.5 16.5C28.7 16.5 30.7 17.3 32.2 18.6L37.1 13.7C34.1 11.1 30.5 9.5 26.5 9.5C16.7 9.5 8.5 17.7 8.5 27.5C8.5 37.3 16.7 45.5 26.5 45.5C36.3 45.5 44.5 37.3 44.5 27.5C44.5 25.7 44.3 23.9 44.5 22.1V20Z"
                fill="#4285F4"
              />
              <path
                d="M8.5 27.5C8.5 17.7 16.7 9.5 26.5 9.5C30.5 9.5 34.1 11.1 37.1 13.7L32.2 18.6C30.7 17.3 28.7 16.5 26.5 16.5C21.5 16.5 17.5 20.5 17.5 25.5C17.5 30.5 21.5 34.5 26.5 34.5C30.7 34.5 34.3 32.1 35.7 28.5H24V20H44.5V22.1C44.3 23.9 44.5 25.7 44.5 27.5C44.5 37.3 36.3 45.5 26.5 45.5C16.7 45.5 8.5 37.3 8.5 27.5Z"
                fill="#34A853"
              />
              <path
                d="M44.5 20H24V28.5H35.7C34.3 32.1 30.7 34.5 26.5 34.5C21.5 34.5 17.5 30.5 17.5 25.5C17.5 20.5 21.5 16.5 26.5 16.5C28.7 16.5 30.7 17.3 32.2 18.6L37.1 13.7C34.1 11.1 30.5 9.5 26.5 9.5C16.7 9.5 8.5 17.7 8.5 27.5C8.5 37.3 16.7 45.5 26.5 45.5C36.3 45.5 44.5 37.3 44.5 27.5C44.5 25.7 44.3 23.9 44.5 22.1V20Z"
                fill="#FBBC05"
              />
              <path
                d="M44.5 20H24V28.5H35.7C34.3 32.1 30.7 34.5 26.5 34.5C21.5 34.5 17.5 30.5 17.5 25.5C17.5 20.5 21.5 16.5 26.5 16.5C28.7 16.5 30.7 17.3 32.2 18.6L37.1 13.7C34.1 11.1 30.5 9.5 26.5 9.5C16.7 9.5 8.5 17.7 8.5 27.5C8.5 37.3 16.7 45.5 26.5 45.5C36.3 45.5 44.5 37.3 44.5 27.5C44.5 25.7 44.3 23.9 44.5 22.1V20Z"
                fill="#EA4335"
              />
            </g>
          </svg>
          Sign in with Google
        </button>
      </div>
      <p className="mt-3 text-sm text-gray-600">
        No account?{' '}
        <a className="underline" href="/signup">
          Sign up
        </a>
      </p>
      <p className="mt-2 text-sm">
        <a className="underline" href="/reset/request">
          Forgot your password?
        </a>
      </p>
    </div>
  );
}
