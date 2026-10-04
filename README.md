# Salva Dico

A personal, offline-first PWA to build a **four-language vocabulary dictionary**
(French, English, Spanish, Italian) and review it with a swipe quiz.

> 🚧 Work in progress. This README is a skeleton and will be completed as the project grows
> (architecture diagram, security model, offline/sync strategy).

## Features (planned)

- Every entry exists in all four languages at once, with grammar details (gender, plurals,
  adjective forms, verb conjugations).
- Fast accent- and article-insensitive search across the four languages.
- AI-assisted entry creation (Google Gemini, called from a serverless function).
- Swipe quiz with touch, mouse and keyboard controls.
- Works offline; data synced between devices with Firestore.

## Tech stack

| Concern         | Choice                                            |
| --------------- | ------------------------------------------------- |
| UI              | React + TypeScript (strict)                       |
| Build / PWA     | Vite, `vite-plugin-pwa` (Workbox)                 |
| Routing         | React Router                                      |
| Auth / database | Firebase Authentication (Google), Cloud Firestore |
| AI              | Google Gemini API, via a Netlify Function         |
| Hosting         | Netlify                                           |
| Tests           | Vitest + React Testing Library, Playwright        |
| Quality         | ESLint (type-aware), Prettier, GitHub Actions CI  |
| Package manager | pnpm, with supply-chain hardening (see below)     |

## Getting started

Requirements: Node.js 24 LTS (see `.nvmrc`), pnpm (version pinned in `package.json`) and, for the
Firebase emulators, Java 21.

```sh
pnpm install
pnpm exec playwright install   # browsers for E2E tests, first time only
```

**Local development without touching real data** (recommended): runs the app against the Firebase
emulators, seeded with ~25 realistic entries. Use the "Connexion de dev (émulateur)" button to sign in.

```sh
pnpm dev:emulators             # app on http://localhost:5173, emulator UI on http://localhost:4000
```

To seed thousands of synthetic entries for performance checks:
`firebase emulators:exec --only firestore,auth --project demo-salva-dico --ui 'node scripts/seed-emulator.ts --bulk 3000 && vite --mode emulator'`.

**Against the real Firebase project:** copy `.env.example` to `.env.local`, fill in the web config,
then run `pnpm dev`.

## Scripts

| Command              | Description                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| `pnpm dev`           | Start the dev server                                                    |
| `pnpm build`         | Typecheck and build for production                                      |
| `pnpm preview`       | Serve the production build locally                                      |
| `pnpm typecheck`     | Run the TypeScript compiler                                             |
| `pnpm lint`          | Lint with ESLint                                                        |
| `pnpm format`        | Format with Prettier (`format:check` to verify only)                    |
| `pnpm test`          | Unit and component tests (Vitest)                                       |
| `pnpm test:e2e`      | E2E tests (Playwright: Chromium, Firefox, WebKit, mobile)               |
| `pnpm test:emulator` | Security rules and sync tests on the Firestore emulator (needs Java 21) |
| `pnpm emulators`     | Start the Firebase emulators with their UI on port 4000                 |

## Security

### Dependencies (supply chain)

`pnpm-workspace.yaml` hardens dependency installation:

- `minimumReleaseAge`: only versions published at least 7 days ago are installed.
- `trustPolicy: no-downgrade`: a version with weaker trust evidence than a previous one is refused
  (possible package takeover). Each exception is pinned to an exact version and justified.
- `blockExoticSubdeps`: transitive dependencies cannot come from git or tarball URLs.
- `strictDepBuilds` + empty `allowBuilds`: no dependency install script runs unless reviewed.

GitHub Actions are pinned to full commit SHAs and the CI token is read-only.

### Application

- **Authentication:** Google sign-in only (Firebase Authentication). The session persists per device
  and works offline.
- **Authorization lives in the Firestore rules** (`firestore.rules`), not in the client. Only the owner's
  UID can read or write, and only under `users/{uid}/entries`. Any other account gets an "access denied"
  screen. The owner UID is a literal in the rules: it is not a secret, and rules cannot read environment
  variables.
- **The Firebase web config is public by design.** Every `VITE_` variable ends up in the bundle; the API key
  only identifies the project. Security comes from the rules, which are tested on the emulator
  (`tests/emulator/firestore.rules.test.ts`): owner-only access, structural validation, server-side
  `updatedAt`, immutable `createdAt`, no hard deletes.
- **Content-Security-Policy** (`csp.ts`): strict policy injected as a `<meta>` tag at build time, without
  `unsafe-inline` or `unsafe-eval`. E2E tests fail on any CSP violation in Chromium, Firefox and WebKit.
- **Secrets** (Gemini API key, step 6) only live in Netlify environment variables, never in the client.

## Offline and sync strategy

Firestore's free tier allows 50,000 document reads per day, and the dictionary will hold thousands of
entries. Re-listening to the whole collection on every app start would burn that quota, so the sync is
**delta-based** (`src/data/entriesSync.ts`):

1. On start, every entry is read from Firestore's **persistent local cache** (IndexedDB): instant, free,
   works offline.
2. A single listener then fetches only documents whose **server** `updatedAt` is after a stored cursor.
   An app start with no remote change costs one read instead of one per entry.
3. `updatedAt` is always a server timestamp (enforced by the rules), so a wrong device clock cannot make
   a change invisible. The cursor keeps nanosecond precision and only advances on server-confirmed data.
4. **Deletions are soft** (`deleted: true`) so they travel through the delta query; hard deletes are
   forbidden by the rules.
5. Offline writes are applied to the local cache immediately and queued by Firestore until reconnection.

Trade-offs and safeguards:

- The cache must never evict synced entries, so cache garbage collection is disabled
  (`CACHE_SIZE_UNLIMITED`) and the app asks the browser for persistent storage.
- If the cache is empty while a cursor exists (for example, Safari cleared site data), the app falls back
  to a full sync instead of silently missing entries.
- Tombstones stay in the database; a purge can be added later if needed.

These behaviors are covered by end-to-end tests against the Firestore emulator
(`tests/emulator/entriesSync.test.ts`).

## License

Personal project. All rights reserved.
