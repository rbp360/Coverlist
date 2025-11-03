'use client';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';

import { clientAuth } from '@/lib/firebaseClient';

function useQuery() {
  return useMemo(
    () => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''),
    [],
  );
}

export default function AuthActionPage() {
  const q = useQuery();
  const mode = q.get('mode');
  const oobCode = q.get('oobCode') || '';
  const [status, setStatus] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    async function run() {
      if (!mode || !oobCode) return;
      if (mode === 'verifyEmail') {
        try {
          await applyActionCode(clientAuth, oobCode);
          setVerified(true);
          setStatus('Email verified! You can close this window.');
        } catch (e: any) {
          setStatus('Invalid or expired verification link.');
        }
      } else if (mode === 'resetPassword') {
        try {
          await verifyPasswordResetCode(clientAuth, oobCode);
          setStatus('Enter a new password.');
        } catch (e: any) {
          setStatus('Invalid or expired reset link.');
        }
      }
    }
    run();
  }, [mode, oobCode]);

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setStatus('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirm) {
      setStatus('Passwords do not match.');
      return;
    }
    try {
      await confirmPasswordReset(clientAuth, oobCode, newPassword);
      setStatus('Password reset successful. You can now sign in.');
    } catch (e: any) {
      setStatus('Failed to reset password. Link may be invalid or expired.');
    }
  }

  if (mode === 'resetPassword') {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Choose a new password</h1>
        <form onSubmit={onReset} className="space-y-4">
          <label className="block">
            <span className="text-sm">New password</span>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm">Confirm password</span>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            Reset password
          </button>
        </form>
        {status && <p className="mt-4 text-sm">{status}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Account action</h1>
      <p className="text-sm">{status || 'Processing...'}</p>
      {verified && (
        <p className="mt-2 text-sm">
          <a className="underline" href="/projects">
            Continue to app
          </a>
        </p>
      )}
    </div>
  );
}
