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

Copy `.env.example` to `.env.local` and adjust as needed.

Required variables:

- JWT_SECRET: secret for signing auth cookies (set to a strong random value in production)

Local demo storage:

- User accounts are stored in a JSON file at `data/db.json`.
  Replace with a real database for production.

## Troubleshooting

- If Playwright tests fail locally, install browsers: `npx playwright install`
- Delete `.next` and `node_modules` then reinstall: `rmdir /s /q node_modules .next` then `npm ci`
