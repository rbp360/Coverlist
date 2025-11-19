'use client';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import {
  clientAuth,
  FIREBASE_ENABLED,
  FIREBASE_MISSING,
  FIREBASE_ACTIVATION_FLAG,
  signInWithGoogle,
} from '@/lib/firebaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [gLoading, setGLoading] = useState(false);
  // Redirect flow removed; popup only.
  const DEBUG_AUTH = (process.env.NEXT_PUBLIC_AUTH_DEBUG || '').toLowerCase() === 'true';
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [cookieInfo, setCookieInfo] = useState<any>(null);
  const [popupAttempted, setPopupAttempted] = useState(false);
  const [popupError, setPopupError] = useState<string | null>(null);
  const [authUserInfo, setAuthUserInfo] = useState<any>(null);
  const [idTokenForLink, setIdTokenForLink] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (FIREBASE_ENABLED && clientAuth) {
        try {
          const cred = await signInWithEmailAndPassword(clientAuth, email, password);
          const idToken = await cred.user.getIdToken();
          let r = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          if (!r.ok) {
            // small retry to avoid race on first init
            await new Promise((res) => setTimeout(res, 300));
            r = await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken }),
            });
          }
          if (!r.ok) {
            // Fall back to legacy local login
            const lr = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            });
            if (!lr.ok) throw new Error('session_start_failed');
          }
          if (!cred.user.emailVerified) {
            window.location.href = '/verify-email';
            return;
          }
          window.location.href = '/projects';
        } catch (fbErr: any) {
          // Firebase sign-in failed (e.g., no Firebase account). Try legacy login.
          const lr = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          if (!lr.ok) {
            const code = fbErr?.code || '';
            if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
              throw new Error('invalid_credentials');
            } else if (code === 'auth/invalid-email') {
              throw new Error('invalid_email');
            } else if (code === 'auth/too-many-requests') {
              throw new Error('too_many_requests');
            } else {
              throw new Error('login_failed');
            }
          }
          window.location.href = '/projects';
          return;
        }
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
      const msg = err?.message;
      if (msg === 'invalid_credentials') setError('Invalid email or password');
      else if (msg === 'invalid_email') setError('Please enter a valid email address');
      else if (msg === 'too_many_requests')
        setError('Too many attempts. Please wait a moment and try again.');
      else if (msg === 'session_start_failed')
        setError('Signed in, but failed to start a server session. Please retry.');
      else setError('Login failed');
    }
  }

  // Redirect processing removed.

  // Live auth state listener (popup flow & general visibility)
  useEffect(() => {
    if (!FIREBASE_ENABLED || !clientAuth) return;
    const unsub = clientAuth.onAuthStateChanged((u: any) => {
      if (u) {
        setAuthUserInfo({
          uid: u.uid,
          email: u.email,
          providers: (u.providerData || []).map((p: any) => p.providerId),
          emailVerified: u.emailVerified,
        });
      } else {
        setAuthUserInfo(null);
      }
    });
    return () => unsub();
  }, []);

  // Fetch debug info on demand
  useEffect(() => {
    let active = true;
    (async () => {
      if (!showDebug) return;
      try {
        const [cfgRes, ckRes] = await Promise.all([
          fetch('/api/auth/debug-config'),
          fetch('/api/auth/debug-cookies'),
        ]);
        const [cfg, ck] = await Promise.all([cfgRes.json(), ckRes.json()]);
        if (!active) return;
        setDebugInfo(cfg);
        setCookieInfo(ck);
      } catch (e) {
        // noop
      }
    })();
    return () => {
      active = false;
    };
  }, [showDebug]);

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="mb-4 text-2xl font-semibold">Log in</h2>
      {authUserInfo && (
        <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-green-800 text-sm">
          <div className="font-semibold">You’re signed in</div>
          <div className="mt-1">
            {authUserInfo.email} ({authUserInfo.uid})
          </div>
          <div className="mt-2 flex gap-2">
            <a
              href="/projects"
              className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
            >
              Go to Projects
            </a>
            <button
              type="button"
              className="rounded border px-3 py-1 hover:bg-neutral-100"
              onClick={async () => {
                try {
                  setError(null);
                  if (clientAuth?.currentUser) await clientAuth.signOut();
                  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
                  window.location.href = '/login';
                } catch (e) {
                  setError('Failed to sign out');
                }
              }}
            >
              Switch Account
            </button>
          </div>
        </div>
      )}
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
      {!FIREBASE_ENABLED && (
        <div className="mt-4 text-sm rounded border border-yellow-400 bg-yellow-50 p-3 text-yellow-800">
          <div className="font-semibold mb-1">Google sign-in unavailable</div>
          {!FIREBASE_ACTIVATION_FLAG && (
            <div>
              Set <code>NEXT_PUBLIC_AUTH_USE_FIREBASE=true</code> in <code>.env.local</code> and
              restart the dev server.
            </div>
          )}
          {FIREBASE_ACTIVATION_FLAG && FIREBASE_MISSING.length > 0 && (
            <div>
              Missing required public Firebase keys:
              <ul className="ml-4 list-disc">
                {FIREBASE_MISSING.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
              Add them to <code>.env.local</code> then restart.
            </div>
          )}
          {FIREBASE_ACTIVATION_FLAG && FIREBASE_MISSING.length === 0 && (
            <div>
              All keys present but initialization still disabled; try a full restart (`Ctrl+C` then
              `npm run dev`) and ensure you are not mixing hosts (use one origin consistently).
            </div>
          )}
        </div>
      )}
      {FIREBASE_ENABLED && (
        <div className="mt-6">
          <button
            type="button"
            disabled={gLoading}
            className="w-full flex items-center justify-center gap-2 rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            onClick={async () => {
              setError(null);
              setPopupError(null);
              try {
                setGLoading(true);
                setPopupAttempted(true);
                console.info('Starting Google popup sign-in');
                const cred = await signInWithGoogle();
                const idToken = await cred.user.getIdToken();
                setIdTokenForLink(idToken);
                let r = await fetch('/api/auth/session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ idToken }),
                });
                if (!r.ok) {
                  await new Promise((res) => setTimeout(res, 300));
                  r = await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken }),
                  });
                }
                if (!r.ok) throw new Error('Failed to start session (popup flow)');
                window.location.href = '/projects';
              } catch (err: any) {
                console.error('Google popup error', err);
                setPopupError(err?.code ? `Popup failed (${err.code})` : 'Popup sign-in failed');
              } finally {
                setGLoading(false);
              }
            }}
          >
            Sign in with Google
          </button>
          {authUserInfo && (
            <button
              type="button"
              className="mt-2 w-full flex items-center justify-center gap-2 rounded bg-neutral-600 px-3 py-2 text-white hover:bg-neutral-700"
              onClick={async () => {
                try {
                  setError(null);
                  // Sign out Firebase client user to allow selecting another account.
                  if (clientAuth?.currentUser) {
                    await clientAuth.signOut();
                  }
                  // Clear server cookies via logout endpoint.
                  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
                  // Reload to show login state again.
                  window.location.href = '/login';
                } catch (e) {
                  setError('Failed to sign out');
                }
              }}
            >
              Switch Google Account
            </button>
          )}
        </div>
      )}
      {DEBUG_AUTH && (
        <div className="mt-4 text-xs text-gray-500">
          <button type="button" className="underline" onClick={() => setShowDebug((v) => !v)}>
            {showDebug ? 'Hide auth debug' : 'Show auth debug'}
          </button>
          {showDebug && (
            <div className="mt-2 rounded border p-2">
              <div>FIREBASE_ENABLED: {String(FIREBASE_ENABLED)}</div>
              <div>clientAuth: {clientAuth ? 'yes' : 'no'}</div>
              <div>popupAttempted: {String(popupAttempted)}</div>
              {popupError && <div className="text-red-600">{popupError}</div>}
              <div>
                currentOrigin: {typeof window !== 'undefined' ? window.location.origin : 'server'}
              </div>
              <div>
                currentHref: {typeof window !== 'undefined' ? window.location.href : 'server'}
              </div>
              {debugInfo && (
                <div className="mt-2">
                  <div className="font-semibold">server config</div>
                  <div>adminReady: {String(debugInfo.serverConfig?.adminReady)}</div>
                  <div>NODE_ENV: {String(debugInfo.serverConfig?.NODE_ENV)}</div>
                  <div className="font-semibold mt-1">public config</div>
                  <div>
                    AUTH_USE_FIREBASE:{' '}
                    {String(debugInfo.publicConfig?.NEXT_PUBLIC_AUTH_USE_FIREBASE)}
                  </div>
                  <div>API_KEY: {String(debugInfo.publicConfig?.NEXT_PUBLIC_FIREBASE_API_KEY)}</div>
                  <div>
                    AUTH_DOMAIN: {String(debugInfo.publicConfig?.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)}
                  </div>
                  <div>
                    PROJECT_ID: {String(debugInfo.publicConfig?.NEXT_PUBLIC_FIREBASE_PROJECT_ID)}
                  </div>
                </div>
              )}
              {cookieInfo && (
                <div className="mt-2">
                  <div className="font-semibold">cookies</div>
                  <div>
                    legacy: {String(cookieInfo.hasLegacy)} | firebase:{' '}
                    {String(cookieInfo.hasFirebase)}
                  </div>
                </div>
              )}
              {authUserInfo && (
                <div className="mt-2">
                  <div className="font-semibold">client auth user</div>
                  <div>uid: {authUserInfo.uid}</div>
                  <div>email: {authUserInfo.email}</div>
                  <div>verified: {String(authUserInfo.emailVerified)}</div>
                  <div>providers: {authUserInfo.providers.join(', ')}</div>
                  <button
                    type="button"
                    className="mt-2 rounded border px-2 py-1 text-xs hover:bg-neutral-200"
                    onClick={async () => {
                      try {
                        const r = await fetch('/api/auth/link', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ idToken: idTokenForLink }),
                        });
                        const j = await r.json();
                        console.info('link result', j);
                        if (j.migrated) {
                          setError(null);
                        } else if (j.error) {
                          setError(`Link failed: ${j.error}`);
                        } else if (j.reason) {
                          setError(`Link status: ${j.reason}`);
                        }
                      } catch (e: any) {
                        setError('Link request error');
                      }
                    }}
                  >
                    Link legacy data
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
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
