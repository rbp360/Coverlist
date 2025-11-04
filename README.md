## Authentication and password reset (Firebase)

The app uses Firebase Authentication for email+password.

- Sign up: Create an account on `/signup`. A verification email is sent automatically. You’ll be redirected to `/verify-email` with an option to resend the email.
- Verify email: Click the link in your email; it opens `/auth/action?mode=verifyEmail&...` and completes verification.
- Log in: Use `/login`. After sign-in, a secure server session cookie is set.
- Forgot password: Go to `/reset/request`. You’ll receive a Firebase reset link; it opens `/auth/action?mode=resetPassword&...` where you set your new password.

Notes:

- For local dev, access the site via `http://127.0.0.1:3001` (loopback IP works best with some providers and cookies).

# Coverlist

A Next.js 14 + TypeScript starter with Tailwind CSS, Jest, and Playwright. Windows-friendly scripts and docs.

## Quick start (Windows cmd.exe)

1. Install Node.js 20 LTS.
2. Install deps:

```
npm ci
```

3. Start dev server:

```
npm run dev
```

4. Run unit tests:

```
npm test
```

5. Run E2E tests (requires dev server at http://localhost:3001):

```
npm run test:e2e
```

## Scripts

- dev: Next.js dev server
- build: Next build
- start: Next start
- lint: ESLint
- typecheck: TypeScript check
- test / test:watch: Jest
- test:e2e: Playwright tests
- e2e:report: Open Playwright HTML report
- format: Prettier write
- data:pull: Pull Firestore snapshot → data/db.json (requires Firebase Admin env)
- data:push: Push local data/db.json → Firestore (requires Firebase Admin env)

## CI

GitHub Actions workflow runs lint, typecheck, unit tests, then Playwright.

## Docker

- Build prod image: `docker build -t coverlist .`
- Run dev via docker-compose: `docker compose up`

## Environment

Copy `.env.local.example` to `.env.local` and adjust as needed.

Required variables:

- JWT_SECRET: secret for signing auth cookies (set to a strong random value in production)

Optional persistence variables (enable Firestore mirroring):

- DATA_BACKEND=firestore
- FIRESTORE_DB_DOC=coverlist/db (default if omitted)
- FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (Admin SDK for server)

Optional provider variables:

None at this time for key/tempo enrichment (external provider removed).

### Spotify integration (playlists)

To enable creating Spotify playlists from setlists or song selections, set these variables in `.env.local`:

- SPOTIFY_CLIENT_ID
- SPOTIFY_CLIENT_SECRET
- NEXT_PUBLIC_BASE_URL (used to compute the redirect URI)

Redirect URI (computed):

- `${NEXT_PUBLIC_BASE_URL}/api/integrations/spotify/callback`

Then in the Spotify Developer Dashboard:

1. Create an app and copy the Client ID and Client Secret.
2. Add the computed Redirect URI above to the app settings (exact match required). Note: per Spotify policy (April–Nov 2025), use HTTPS for public URLs; for local development, use a loopback IP literal (127.0.0.1 or [::1]) with HTTP. `localhost` is not allowed.
3. Save and restart the dev server.

Troubleshooting:

- If you see "Missing required parameter; client_id" or "spotify_env_missing", your env vars are not set or the server needs a restart.
- Ensure the redirect URI exactly matches the value configured in Spotify and the computed value above.

Local demo storage and persistence:

- By default, data is stored in a JSON file at `data/db.json` (fast for local dev and tests).
- On Vercel, the filesystem is ephemeral. To persist data, set `DATA_BACKEND=firestore` and provide Firebase Admin credentials. The build step pulls Firestore into `data/db.json`, and runtime writes mirror back to Firestore.

## Feature: Repertoire import

On a project's Repertoire page, use the button "import all songs in your repertoire" to add every unique song (by title and artist) from your other projects into the current project's repertoire. Existing songs in the project are skipped. If enrichment on import is enabled in Settings and the enrichment mode is set to Stub, missing key/tempo values will be auto-filled deterministically.

## Feature: Key/Tempo enrichment

Two modes are available in Settings → Key/Tempo Enrichment:

- None: do not enrich key/tempo automatically
- Stub (deterministic): offline, deterministic filler values based on title/artist for quick demos/tests

You can also enable "On import" in Settings to apply the stub enrichment automatically when adding songs.

## Troubleshooting

- If Playwright tests fail locally, install browsers: `npx playwright install`
- Delete `.next` and `node_modules` then reinstall: `rmdir /s /q node_modules .next` then `npm ci`

## Firebase (optional)

You can use Firebase as your backend for auth and/or data. This repo includes:

- A client initializer for browser code at `lib/firebaseClient.ts`
- A server/admin initializer for API routes at `lib/firebaseAdmin.ts`

Setup steps:

1. Create or open a Firebase project in the Firebase Console.
2. For Admin SDK: create a Service Account (Project Settings → Service Accounts → Generate new private key).
3. Add these environment variables (Vercel Project Settings → Environment Variables for deployed, `.env.local` for local):

Client SDK (public):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Admin SDK (private):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (on Vercel, paste with escaped newlines: `\n`)
- (optional) `FIREBASE_DATABASE_URL`

Usage:

- In client components: `import { clientDb } from '@/lib/firebaseClient'` and use Firestore Web SDK.
- In API routes/server code: `import { firestore } from '@/lib/firebaseAdmin'` (check for undefined if env values are missing).

Notes:

- The app can persist to a local JSON file (`data/db.json`) for demos and tests. On Vercel, enable Firestore mirroring (see below) to persist across deploys/cold starts.
- If you adopt Firebase Authentication, update middleware and API routes to validate Firebase ID tokens (via `firebase-admin`) and remove the custom JWT cookie.

## Persistence: Firestore mirroring (recommended on Vercel)

This repo supports a zero-churn migration to Firestore as the durable store without changing app code:

- Reads/writes continue to use the JSON file API (`lib/db.ts`).
- At build time, a snapshot is pulled from Firestore into `data/db.json`.
- At runtime, every write mirrors to Firestore (best-effort) to keep it up to date.

Enable it by setting these environment variables (Vercel Project Settings → Environment Variables, or `.env.local` locally):

- `DATA_BACKEND=firestore`
- `FIRESTORE_DB_DOC=coverlist/db` (or your preferred `collection/document` path)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (Admin SDK)

Build behavior:

- `npm run build` runs a prebuild step that pulls Firestore → `data/db.json` when Admin env is present.

Manual sync scripts:

- Pull: `npm run data:pull` (Firestore → `data/db.json`)
- Push: `npm run data:push` (`data/db.json` → Firestore)

Notes:

- On Vercel, JSON writes go to `/tmp/data/db.json` and are mirrored to Firestore. The next deploy/cold start will seed from Firestore again.
- If you later want to read directly from Firestore (fully async), you can replace the `db` implementation and update call sites incrementally.

User ID migration (legacy → Firebase):

- When a user first signs in with Firebase, the server links their legacy account (matched by email) to their Firebase uid and transparently migrates all references (projects, memberships, practice logs, repertoire, join requests, and votes). This preserves existing data so users continue to see their content after switching auth providers.
