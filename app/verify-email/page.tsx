'use client';
import { sendEmailVerification } from 'firebase/auth';
import { useEffect, useState } from 'react';

import { clientAuth } from '@/lib/firebaseClient';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<string>('');
  const user = clientAuth.currentUser;

  async function resend() {
    if (!clientAuth.currentUser) return;
    setStatus('Sending...');
    try {
      await sendEmailVerification(clientAuth.currentUser);
      setStatus('Verification email sent. Check your inbox.');
    } catch (e: any) {
      setStatus('Failed to send. Try again later.');
    }
  }

  useEffect(() => {
    setStatus('');
  }, []);

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-2">Verify your email</h1>
      <p className="text-sm text-gray-700">
        We sent a verification link to your email address. Please verify your account to continue.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={resend} className="bg-blue-600 text-white px-4 py-2 rounded">
          Resend email
        </button>
        <a className="underline text-sm" href="/projects">
          I7m verified  continue
        </a>
      </div>
      {status && <p className="mt-3 text-sm">{status}</p>}
    </div>
  );
}
