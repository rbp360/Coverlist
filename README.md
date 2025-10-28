## Password reset

The app includes a standard password reset flow:

1. Request a reset link: go to `/reset/request`, enter your email.
2. You’ll receive a link (in development it’s shown directly on the page/response). In production you would wire this to your email service.
3. Follow the link `/reset/[token]`, choose a new password, and you’ll be logged in.

API endpoints:

- POST `/api/auth/reset/request` { email }
- POST `/api/auth/reset/confirm` { token, newPassword }

Notes:

- Reset links expire after 15 minutes.
- For local dev, access the site via `http://127.0.0.1:PORT` to align with cookie behavior and Spotify rules.

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

5. Run E2E tests (requires dev server at http://localhost:3000):

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

## CI

GitHub Actions workflow runs lint, typecheck, unit tests, then Playwright.

## Docker

- Build prod image: `docker build -t coverlist .`
- Run dev via docker-compose: `docker compose up`

## Environment

Copy `.env.local.example` to `.env.local` and adjust as needed.

Required variables:

- JWT_SECRET: secret for signing auth cookies (set to a strong random value in production)

Optional provider variables:

None at this time for key/tempo enrichment (external provider removed).

### Spotify integration (playlists)

To enable creating Spotify playlists from setlists or song selections, set these variables in `.env.local`:

- SPOTIFY_CLIENT_ID
- SPOTIFY_CLIENT_SECRET
- SPOTIFY_REDIRECT_URI (for local dev use: `http://127.0.0.1:3001/api/integrations/spotify/callback`)

Then in the Spotify Developer Dashboard:

1. Create an app and copy the Client ID and Client Secret.
2. Add the Redirect URI above to the app settings (exact match required). Note: per Spotify policy (April–Nov 2025), use HTTPS for public URLs; for local development, use a loopback IP literal (127.0.0.1 or [::1]) with HTTP. `localhost` is not allowed.
3. Save and restart the dev server.

Troubleshooting:

- If you see "Missing required parameter; client_id" or "spotify_env_missing", your env vars are not set or the server needs a restart.
- Ensure the redirect URI exactly matches the value configured in Spotify and in `.env.local`.

Local demo storage:

- User accounts are stored in a JSON file at `data/db.json`.
  Replace with a real database for production.

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

You can use Firebase as your backend for auth and/or data. This repo includes a lightweight admin initializer at `lib/firebaseAdmin.ts`.

Setup steps:

1. Create or open a Firebase project in the Firebase Console.
2. Create a Service Account (Project Settings → Service Accounts → Generate new private key).
3. Add these environment variables (Vercel Project Settings → Environment Variables for deployed, `.env.local` for local):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (on Vercel, paste with escaped newlines: `\n`)
- (optional) `FIREBASE_DATABASE_URL`

Notes:

- The app currently persists to a local JSON file (`data/db.json`) for demos and tests. In production on Vercel, the filesystem is ephemeral; we recommend migrating to Firestore/RTDB. You can keep the current API routes and swap the `db` implementation behind the scenes.
- If you adopt Firebase Authentication, update middleware and API routes to validate Firebase ID tokens (via `firebase-admin`) and remove the custom JWT cookie.
