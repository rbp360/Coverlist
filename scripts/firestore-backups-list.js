#!/usr/bin/env node
/*
  List Firestore Backups via the Firestore Admin REST API.

  Usage:
    node scripts/firestore-backups-list.js [location] [--json] [--project <id>] [--location <loc>] [--adc] [--token <access_token>]

  Env requirements (service account):
    - FIREBASE_PROJECT_ID
    - FIREBASE_CLIENT_EMAIL
    - FIREBASE_PRIVATE_KEY (may contain \n sequences)

  Optional envs:
    - FIRESTORE_LOCATION (default: nam5)

  Notes:
    - Requires the Firestore Backups feature enabled on the project and proper IAM permissions.
    - Scope used: https://www.googleapis.com/auth/datastore
*/

const fs = require('fs');
const path = require('path');

// Load env from .env and .env.local for local use
try {
  require('dotenv').config({ path: path.join(process.cwd(), '.env') });
} catch {}
try {
  require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
} catch {}

// Args
const argLoc = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : undefined;
const prettyJson = process.argv.includes('--json');
const useADC = process.argv.includes('--adc');

function readArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--'))
    return process.argv[idx + 1];
  return undefined;
}

const projectId = readArg('--project') || process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const location = readArg('--location') || argLoc || process.env.FIRESTORE_LOCATION || 'nam5';
const explicitToken = readArg('--token');

if (!projectId) {
  console.error(
    '[firestore-backups-list] Missing project id. Provide --project <id> or set FIREBASE_PROJECT_ID',
  );
  process.exit(1);
}

async function getAccessToken() {
  if (explicitToken) return explicitToken;
  const admin = require('firebase-admin');
  let cred;
  if (useADC) {
    cred = admin.credential.applicationDefault();
  } else {
    if (!clientEmail || !privateKey) {
      throw new Error(
        'Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY. Pass --adc to use Application Default Credentials.',
      );
    }
    cred = admin.credential.cert({ projectId, clientEmail, privateKey });
  }
  const { access_token } = await cred.getAccessToken();
  if (!access_token) throw new Error('Failed to obtain access token');
  return access_token;
}

async function listBackups(token) {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/backups`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const code = body && body.error && body.error.code;
    const message = body && body.error && body.error.message;
    const hint =
      res.status === 403
        ? `Hint: ensure Firestore Backups are enabled in project ${projectId}, location ${location}, and that the caller has sufficient IAM (e.g., roles/datastore.admin). Auth mode=${useADC ? 'ADC' : 'ServiceAccount'}${
            useADC ? '' : ` as ${clientEmail}`
          }.`
        : '';
    throw new Error(`[${res.status}] ${message || text} (code=${code || 'unknown'}) ${hint}`);
  }
  return body;
}

function formatBackups(backups) {
  if (!Array.isArray(backups) || backups.length === 0) {
    console.log(
      `[firestore-backups-list] No backups found in location ${location} for project ${projectId}`,
    );
    return;
  }
  // Print a compact table
  const rows = backups.map((b) => {
    const name = b.name || '';
    const state = b.state || '';
    const createTime = b.createTime || '';
    const backupType = b.backupType || '';
    const sizeBytes = b.sizeBytes != null ? String(b.sizeBytes) : '';
    return { name, state, createTime, backupType, sizeBytes };
  });
  const headers = ['name', 'state', 'createTime', 'backupType', 'sizeBytes'];
  const widths = headers.map((h) => Math.max(h.length, ...rows.map((r) => (r[h] || '').length)));
  const pad = (str, w) => str + ' '.repeat(Math.max(0, w - str.length));
  console.log(headers.map((h, i) => pad(h, widths[i])).join('  '));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) {
    console.log(headers.map((h, i) => pad(r[h] || '', widths[i])).join('  '));
  }
}

(async () => {
  try {
    const token = await getAccessToken();
    const data = await listBackups(token);
    const backups = data.backups || [];
    if (prettyJson) {
      console.log(JSON.stringify(backups, null, 2));
    } else {
      formatBackups(backups);
    }
  } catch (err) {
    console.error('[firestore-backups-list] Error:', err.message || String(err));
    process.exit(1);
  }
})();
