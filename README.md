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

Requirements: Node.js 24 LTS (see `.nvmrc`) and pnpm (version pinned in `package.json`).

```sh
pnpm install
pnpm exec playwright install   # browsers for E2E tests, first time only
cp .env.example .env.local     # then fill in the values
pnpm dev
```

## Scripts

| Command          | Description                                               |
| ---------------- | --------------------------------------------------------- |
| `pnpm dev`       | Start the dev server                                      |
| `pnpm build`     | Typecheck and build for production                        |
| `pnpm preview`   | Serve the production build locally                        |
| `pnpm typecheck` | Run the TypeScript compiler                               |
| `pnpm lint`      | Lint with ESLint                                          |
| `pnpm format`    | Format with Prettier (`format:check` to verify only)      |
| `pnpm test`      | Unit and component tests (Vitest)                         |
| `pnpm test:e2e`  | E2E tests (Playwright: Chromium, Firefox, WebKit, mobile) |

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

_To be documented in step 2 (Firestore rules) and step 6 (AI function)._

## License

Personal project. All rights reserved.
