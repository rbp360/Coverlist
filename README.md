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

- GETSONG_API_KEY: API key for the GetSong BPM service
- GETSONG_EMAIL: Contact email to include in User-Agent
- GETSONG_BASE_URL: Override base URL (default: https://api.getsongbpm.com). Set to https://api.getsong.co if your key is for that host.
- GETSONG_STRICT: Set to 1 or true to disable secondary lookups (no fallback to /song by id). Useful for testing whether the initial /search returns tempo/key.

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

On a project's Repertoire page, use the button "import all songs in your repertoire" to add every unique song (by title and artist) from your other projects into the current project's repertoire. Existing songs in the project are skipped. If enrichment on import is enabled in Settings and the enrichment mode is active (stub or GetSong), missing key/tempo values will be auto-filled.

## Feature: Key/Tempo enrichment (GetSong BPM)

Enable provider in Settings → Key/Tempo Enrichment by choosing "GetSong BPM (API)". Provide `GETSONG_API_KEY` (and optionally `GETSONG_EMAIL`) in `.env.local`.

Ways to enrich:

- Repertoire page → per-song button "Generate info from AI"
- Enable "On import" in Settings to enrich automatically as songs are added

Notes:

- By default, the integration uses `https://api.getsongbpm.com/` search (and `tempo`) endpoints with `api_key` in the query.
- If you set `GETSONG_BASE_URL=https://api.getsong.co`, the app will send the API key in headers (`x-api-key`) and include `x-user-email` when available.
- Some environments may block requests (e.g., bot protection); if a request fails, the app will skip enrichment gracefully.

## Troubleshooting

- If Playwright tests fail locally, install browsers: `npx playwright install`
- Delete `.next` and `node_modules` then reinstall: `rmdir /s /q node_modules .next` then `npm ci`
