#!/usr/bin/env node
/**
 * Read-only dump: prints current Firestore document at FIRESTORE_DB_DOC and saves a timestamped copy.
 */
const fs = require('fs');
const path = require('path');

const dotenv = require('dotenv');

// Load envs
dotenv.config();
const envLocal = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal, override: false });
const importEnv = path.join(process.cwd(), 'import.env');
if (fs.existsSync(importEnv)) dotenv.config({ path: importEnv, override: false });

function assertEnv(name) {
  if (!process.env[name]) throw new Error(`Missing env: ${name}`);
}
assertEnv('FIREBASE_PROJECT_ID');
assertEnv('FIREBASE_CLIENT_EMAIL');
assertEnv('FIREBASE_PRIVATE_KEY');

const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}
const firestore = admin.firestore();
const FIRESTORE_DOC_PATH = process.env.FIRESTORE_DB_DOC || 'coverlist/db';

(async () => {
  const [col, doc] = FIRESTORE_DOC_PATH.split('/');
  if (!col || !doc) throw new Error('Invalid FIRESTORE_DB_DOC path');
  const ref = firestore.collection(col).doc(doc);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log('[firestore-dump] No document at', FIRESTORE_DOC_PATH);
    process.exit(0);
  }
  const data = snap.data();
  console.log('[firestore-dump] Read document at', FIRESTORE_DOC_PATH);
  const DATA_DIR = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = path.join(DATA_DIR, `firestore.current.${stamp}.json`);
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  console.log('[firestore-dump] Wrote', out);
})();
