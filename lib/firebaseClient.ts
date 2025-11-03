// Client-side Firebase initialization for browser and React components.
// Uses NEXT_PUBLIC_* env vars only. Safe to import in client components.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Avoid re-initializing during HMR or multiple imports
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const clientDb = getFirestore(app);
export const clientAuth = getAuth(app);
// Use browser language for email templates
try {
  clientAuth.useDeviceLanguage();
} catch {}
export default app;
