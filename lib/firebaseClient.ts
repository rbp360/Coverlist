// Client-side Firebase initialization for browser and React components.
// Uses NEXT_PUBLIC_* env vars only. Safe to import in client components.

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Determine if all required public config values are present AND explicitly enabled.
// Default to disabled unless `NEXT_PUBLIC_AUTH_USE_FIREBASE` is 'true'.
const PUBLIC_WANTS_FIREBASE =
  (process.env.NEXT_PUBLIC_AUTH_USE_FIREBASE || '').toLowerCase() === 'true';
// IMPORTANT: Next.js only inlines env vars when referenced directly (process.env.KEY).
// Avoid dynamic indexing (process.env[k]) or values will be undefined in the browser bundle.
export const FIREBASE_MISSING = [
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 'NEXT_PUBLIC_FIREBASE_API_KEY',
  !process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  !process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET && 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  !process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  !process.env.NEXT_PUBLIC_FIREBASE_APP_ID && 'NEXT_PUBLIC_FIREBASE_APP_ID',
].filter(Boolean) as string[];
export const FIREBASE_ENABLED = Boolean(
  PUBLIC_WANTS_FIREBASE &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
);
export const FIREBASE_ACTIVATION_FLAG = PUBLIC_WANTS_FIREBASE;

let app: any | undefined;
let clientDb: any | undefined;
let clientAuth: any | undefined;

if (FIREBASE_ENABLED) {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  };
  // Avoid re-initializing during HMR or multiple imports
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  clientDb = getFirestore(app);
  clientAuth = getAuth(app);
  try {
    clientAuth.useDeviceLanguage();
  } catch {}
}

export { app as default, clientDb, clientAuth };

// Helper for Google sign-in
export async function signInWithGoogle() {
  if (!FIREBASE_ENABLED || !clientAuth) throw new Error('Firebase not enabled');
  const provider = new GoogleAuthProvider();
  // Force account chooser each time to allow selecting among multiple Google accounts.
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(clientAuth, provider);
}

// Optional redirect helpers (useful for Safari/iOS or passkey issues)
export async function signInWithGoogleRedirect() {
  if (!FIREBASE_ENABLED || !clientAuth) throw new Error('Firebase not enabled');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithRedirect(clientAuth, provider);
}

export async function getGoogleRedirectResult() {
  if (!FIREBASE_ENABLED || !clientAuth) return null;
  return getRedirectResult(clientAuth);
}

// Helper for Google sign-in via redirect (more reliable across browsers)
// Redirect-based Google sign-in removed (popup only). If needed in future,
// reintroduce signInWithRedirect with an environment flag.
