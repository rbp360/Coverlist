import admin from 'firebase-admin';

// Initialize a singleton firebase-admin app using env-provided service account.
// Works on Vercel serverless (env vars) and locally via .env.local.

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Vercel stores multiline secrets as escaped \n; convert to real newlines if present.
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!admin.apps.length) {
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      // databaseURL is optional; uncomment if you need RTDB and set FIREBASE_DATABASE_URL
      // databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  } else {
    // If Firebase env is not set, we skip initialization.
    // Callers can detect admin.apps.length === 0 and handle gracefully.
  }
}

export { admin };
export const firestore = admin.apps.length ? admin.firestore() : undefined;
export const authAdmin = admin.apps.length ? admin.auth() : undefined;
export const rtdb = admin.apps.length && admin.database ? admin.database() : undefined;
