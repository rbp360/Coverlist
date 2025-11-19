import admin from 'firebase-admin';

// Initialize a singleton firebase-admin app using env-provided service account.
// Works on Vercel serverless (env vars) and locally via .env.local.

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Vercel stores multiline secrets as escaped \n; convert to real newlines if present.
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

let adminInitError: string | undefined;
if (!admin.apps.length) {
  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } catch (e: any) {
      adminInitError = e?.message || 'unknown_admin_init_error';
    }
  } else {
    adminInitError = 'missing_env_vars';
  }
}

export { admin };
export const firestore = admin.apps.length ? admin.firestore() : undefined;
export const authAdmin = admin.apps.length ? admin.auth() : undefined;
export function getAdminDiagnostics() {
  return {
    initialized: admin.apps.length > 0,
    initError: adminInitError,
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    hasPrivateKey: !!privateKey,
    privateKeySnippet: privateKey ? privateKey.split('\n')[0]?.slice(0, 40) : undefined,
    // Heuristic checks
    privateKeyHasBegin: /BEGIN PRIVATE KEY/.test(privateKey),
    privateKeyContainsEscapedNewlines: /\\n/.test(process.env.FIREBASE_PRIVATE_KEY || ''),
  };
}
// Realtime Database is not used; avoid touching admin.database() unless explicitly configured.
