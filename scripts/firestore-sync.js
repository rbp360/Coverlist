#!/usr/bin/env node
/*
  Sync JSON DB with Firestore Admin.
  Usage:
    node scripts/firestore-sync.js pull   # Firestore -> data/db.json
    node scripts/firestore-sync.js push   # data/db.json -> Firestore

  Requirements:
    - Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
    - Optional: set DATA_BACKEND=firestore to enable in CI/Vercel
    - Optional: set FIRESTORE_DB_DOC (default: coverlist/db)
*/

const fs = require('fs');
const path = require('path');
// Load env from .env and .env.local if present (so local scripts have Admin creds)
try {
  require('dotenv').config({ path: path.join(process.cwd(), '.env') });
} catch {}
try {
  require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
} catch {}

const ACTION = process.argv[2] || 'pull';
const FIRESTORE_DOC_PATH = process.env.FIRESTORE_DB_DOC || 'coverlist/db';
const DATA_DIR = path.join(process.cwd(), 'data');
const JSON_PATH = path.join(DATA_DIR, 'db.json');

function hasAdminEnv() {
  return (
    !!process.env.FIREBASE_PROJECT_ID &&
    !!process.env.FIREBASE_CLIENT_EMAIL &&
    !!process.env.FIREBASE_PRIVATE_KEY
  );
}

async function run() {
  if (!hasAdminEnv()) {
    console.log('[firestore-sync] Skipping: Firebase admin env vars not set');
    process.exit(0);
  }
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
  }
  const firestore = admin.firestore();
  const [col, doc] = FIRESTORE_DOC_PATH.split('/');
  if (!col || !doc) throw new Error(`Invalid FIRESTORE_DB_DOC path: ${FIRESTORE_DOC_PATH}`);
  const ref = firestore.collection(col).doc(doc);

  if (ACTION === 'pull') {
    try {
      const snap = await ref.get();
      if (!snap.exists) {
        console.log(`[firestore-sync] No document at ${FIRESTORE_DOC_PATH}; nothing to pull`);
        process.exit(0);
      }
      const data = snap.data();
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
      fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2));
      console.log(`[firestore-sync] Wrote ${JSON_PATH} from Firestore (${FIRESTORE_DOC_PATH})`);
    } catch (err) {
      const msg = (err && err.message) || String(err);
      const code = err && (err.code || err.status);
      // Gracefully skip when database is not yet created or doc is missing.
      if (code === 5 || code === '5' || /NOT_FOUND/i.test(msg)) {
        console.log(
          `[firestore-sync] Firestore database or document not found; skipping pull (path=${FIRESTORE_DOC_PATH}).`,
        );
        console.log(
          '[firestore-sync] To initialize, create a Firestore (Native) database in Firebase Console and optionally run "npm run data:push".',
        );
        process.exit(0);
      }
      throw err;
    }
  } else if (ACTION === 'push') {
    if (!fs.existsSync(JSON_PATH)) {
      console.error(`[firestore-sync] Missing ${JSON_PATH}; nothing to push`);
      process.exit(1);
    }
    const raw = fs.readFileSync(JSON_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    await ref.set(parsed);
    console.log(`[firestore-sync] Pushed ${JSON_PATH} to Firestore (${FIRESTORE_DOC_PATH})`);
  } else {
    console.error('[firestore-sync] Unknown action. Use pull|push');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('[firestore-sync] Error:', err.message);
  process.exit(1);
});
