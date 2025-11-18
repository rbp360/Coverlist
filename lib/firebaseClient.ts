// Client-side Firebase initialization for browser and React components.
// Uses NEXT_PUBLIC_* env vars only. Safe to import in client components.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Determine if all required public config values are present
export const FIREBASE_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
);

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
  return signInWithPopup(clientAuth, provider);
}
