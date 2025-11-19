#!/usr/bin/env node
/**
 * Batch migration script: local JSON DB -> Firestore snapshot + user ID alignment.
 *
 * What it does:
 * 1. Reads data/db.json.
 * 2. Lists all Firebase Auth users (email + uid).
 * 3. For each Firebase user, finds matching local user by email.
 *    - If found and IDs differ, rewrites every reference (projects.ownerId, memberIds, practice, etc.)
 *    - If not found, creates a new local user entry (passwordHash: 'firebase').
 * 4. Writes updated db.json (creates a timestamped backup first).
 * 5. Writes the entire DB snapshot to Firestore (collection/doc: coverlist/db or FIRESTORE_DB_DOC).
 *
 * Usage:
 *   Set required env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, etc.).
 *   Optionally set DATA_BACKEND=firestore and FIRESTORE_DB_DOC if you want consistency.
 *   Run: npm run migrate:firestore
 *
 * Dry-run mode:
 *   Set DRY_RUN=1 to skip writing changes (shows planned operations).
 */

const fs = require('fs');
const path = require('path');

// Load env from .env, then also try .env.local and import.env for convenience
const dotenv = require('dotenv');
dotenv.config();
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: false });
}
const importEnvPath = path.join(process.cwd(), 'import.env');
if (fs.existsSync(importEnvPath)) {
  dotenv.config({ path: importEnvPath, override: false });
}
const admin = require('firebase-admin');

function assertEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing required env var: ${name}`);
  }
}

assertEnv('FIREBASE_PROJECT_ID');
assertEnv('FIREBASE_CLIENT_EMAIL');
assertEnv('FIREBASE_PRIVATE_KEY');

// Normalize private key newlines
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

const firestore = admin.firestore();
const auth = admin.auth();

// Determine dry-run: env DRY_RUN=1|true or CLI flag --dry-run
const argv = process.argv.slice(2);
const DRY_RUN =
  [process.env.DRY_RUN, process.env.dry_run]
    .filter(Boolean)
    .map((v) => v.toLowerCase())
    .some((v) => v === '1' || v === 'true') || argv.includes('--dry-run');
const CONFIRM_WRITE =
  argv.includes('--confirm-write') || (process.env.CONFIRM_WRITE || '').trim() === '1';
console.log('[migrate-firestore] Raw DRY_RUN env:', process.env.DRY_RUN);
console.log('[migrate-firestore] CLI args:', argv);
const FIRESTORE_DOC_PATH = process.env.FIRESTORE_DB_DOC || 'coverlist/db';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
if (!fs.existsSync(DB_FILE)) {
  console.error('db.json not found at', DB_FILE);
  process.exit(1);
}

function loadDB() {
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw);
}

function backupDB() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `db.backup.${stamp}.json`;
  const backupPath = path.join(DATA_DIR, backupName);
  fs.copyFileSync(DB_FILE, backupPath);
  return backupPath;
}

function writeDB(db) {
  if (DRY_RUN) return; // skip actual write
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function migrateUserId(db, oldUserId, newUserId) {
  if (!oldUserId || !newUserId || oldUserId === newUserId) return;
  const users = db.users || (db.users = []);
  const oldIdx = users.findIndex((u) => u.id === oldUserId);
  if (oldIdx !== -1) {
    const existingNewIdx = users.findIndex((u) => u.id === newUserId);
    if (existingNewIdx !== -1 && existingNewIdx !== oldIdx) {
      const oldU = users[oldIdx];
      const newU = users[existingNewIdx];
      const merged = {
        ...newU,
        email: newU.email || oldU.email,
        username: newU.username || oldU.username,
        name: newU.name || oldU.name,
        avatarUrl: newU.avatarUrl || oldU.avatarUrl,
        passwordHash: newU.passwordHash || oldU.passwordHash,
        spotify: newU.spotify || oldU.spotify,
        createdAt: newU.createdAt || oldU.createdAt,
      };
      users[existingNewIdx] = { ...merged, id: newUserId };
      users.splice(oldIdx, 1);
    } else {
      users[oldIdx] = { ...users[oldIdx], id: newUserId };
    }
  }
  // projects owner/memberIds
  (db.projects || []).forEach((p) => {
    if (p.ownerId === oldUserId) p.ownerId = newUserId;
    if (Array.isArray(p.memberIds)) {
      p.memberIds = p.memberIds.map((m) => (m === oldUserId ? newUserId : m));
      p.memberIds = Array.from(new Set(p.memberIds));
    }
  });
  // practice/projectMembers/repertoire/joinRequests/todo votes
  const mapList = (arrName, field = 'userId') => {
    if (!Array.isArray(db[arrName])) return;
    db[arrName] = db[arrName].map((item) =>
      item[field] === oldUserId ? { ...item, [field]: newUserId } : item,
    );
  };
  mapList('projectMembers');
  mapList('projectPractice');
  mapList('personalPractice');
  mapList('repertoireSongs');
  mapList('joinRequests');
  if (Array.isArray(db.projectTodo)) {
    db.projectTodo = db.projectTodo.map((t) => {
      if (t.votes && Object.prototype.hasOwnProperty.call(t.votes, oldUserId)) {
        const nextVotes = { ...t.votes };
        const vote = nextVotes[oldUserId];
        delete nextVotes[oldUserId];
        if (!Object.prototype.hasOwnProperty.call(nextVotes, newUserId)) {
          nextVotes[newUserId] = vote;
        }
        return { ...t, votes: nextVotes };
      }
      return t;
    });
  }
}

async function listAllFirebaseUsers() {
  let nextPageToken = undefined;
  const all = [];
  do {
    const page = await auth.listUsers(1000, nextPageToken);
    all.push(...page.users);
    nextPageToken = page.pageToken;
  } while (nextPageToken);
  return all.map((u) => ({ uid: u.uid, email: u.email }));
}

async function main() {
  console.log('Starting migration (dryRun=%s)', DRY_RUN);
  const db = loadDB();
  db.users = db.users || [];
  const firebaseUsers = await listAllFirebaseUsers();
  console.log('Firebase users:', firebaseUsers.length);

  const operations = [];
  for (const fu of firebaseUsers) {
    if (!fu.email) continue;
    const legacy = db.users.find(
      (u) => u.email && u.email.toLowerCase() === fu.email.toLowerCase(),
    );
    if (!legacy) {
      // Create new local user entry to mirror firebase account
      const newUser = {
        id: fu.uid,
        email: fu.email,
        passwordHash: 'firebase',
        createdAt: new Date().toISOString(),
      };
      db.users.push(newUser);
      operations.push({ type: 'create', email: fu.email, uid: fu.uid });
      continue;
    }
    if (legacy.id !== fu.uid) {
      migrateUserId(db, legacy.id, fu.uid);
      operations.push({ type: 'migrate', email: fu.email, oldId: legacy.id, newId: fu.uid });
    } else {
      operations.push({ type: 'noop', email: fu.email, uid: fu.uid });
    }
  }

  // Backup & write
  if (!DRY_RUN) {
    const backupPath = backupDB();
    writeDB(db);
    console.log('Backup created:', backupPath);
    console.log('Updated db.json written.');
  } else {
    console.log('Dry run: no changes written to disk.');
  }

  // Firestore snapshot write
  try {
    if (!DRY_RUN) {
      const [col, doc] = FIRESTORE_DOC_PATH.split('/');
      if (!col || !doc) throw new Error('Invalid FIRESTORE_DB_DOC path');
      const ref = firestore.collection(col).doc(doc);
      // Backup current Firestore snapshot before overwrite
      const existing = await ref.get();
      if (existing.exists) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(DATA_DIR, `firestore.backup.${stamp}.json`);
        if (!DRY_RUN) fs.writeFileSync(backupPath, JSON.stringify(existing.data(), null, 2));
        console.log('Firestore backup saved at', backupPath);
      } else {
        console.log('No existing Firestore document to backup at', FIRESTORE_DOC_PATH);
      }
      if (!CONFIRM_WRITE) {
        console.log(
          'CONFIRM_WRITE not set and --confirm-write not provided; skipping Firestore write.',
        );
      } else {
        await ref.set(db);
        console.log('Firestore snapshot updated at', FIRESTORE_DOC_PATH);
      }
    } else {
      console.log('Dry run: skipped Firestore write');
    }
  } catch (e) {
    console.error('Firestore write failed:', e.message);
  }

  // Summary
  const summary = operations.reduce((acc, op) => {
    acc[op.type] = (acc[op.type] || 0) + 1;
    return acc;
  }, {});
  console.log('Operation summary:', summary);
  console.log('Detailed operations:', operations);
  console.log('Migration complete.');
}

main().catch((e) => {
  console.error('Migration error:', e);
  process.exit(1);
});
