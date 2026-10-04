# CLAUDE.md — Personal Multilingual Dictionary (FR / EN / ES / IT)

## 1. Project overview

A personal PWA used daily to build a 4-language vocabulary dictionary and review it with a swipe quiz.
Every entry always exists in **all four languages at once**: French, English, Spanish, Italian. The goal is to
improve all four languages together, so an entry is only "known" if it is known in every language.

- **Owner / only user:** Salva. Native French speaker, good English, beginner Spanish, starting Italian.
- **Usage:** phone first (mobile-first UI), also used on desktop. Data synced between devices.
- **Must work offline:** reading the dictionary, searching, the quiz, and manual add/edit/delete.
- **Public GitHub repo:** this project is also a portfolio piece for technical support job interviews.
  Code quality, security choices, tests, CI and the README matter as much as the features.

## 2. How to work with me (Claude Code rules)

- **Work step by step.** Follow the roadmap (section 10). Before starting a step, present a short plan
  (files touched, approach, new dependencies) and **wait for my approval**. Do not chain several steps.
- **My background:** ~2 years of vanilla JS / PWA experience and some React experience.
  No need to explain standard React concepts; only flag non-obvious patterns or trade-offs.
- **Ask before adding any dependency.** Prefer the platform and small, well-maintained libraries.
- **Definition of done for every step:** typecheck passes, lint passes, tests pass, new logic has tests,
  and you tell me how to verify the feature manually.
- **Commits:** small and focused, Conventional Commits, in English (`feat: add entry form`, `fix: ...`).
- **Language conventions:**
  - Code, identifiers, comments, commits, README, docs: **English**.
  - All UI text: **French**. Keep UI strings in one place (`src/i18n/fr.ts`) even though there is only one locale.
  - Our conversations: French.
- **Never commit secrets.** `.env*` files are git-ignored; `.env.example` documents the variables.
- When a decision in this file turns out to be wrong or incomplete, say so and propose an update to this file.
- After each completed step, update section 11 (Status).

## 3. Tech stack

| Concern | Choice |
|---|---|
| Package manager | pnpm with supply-chain hardening (`pnpm-workspace.yaml`: `minimumReleaseAge`, `trustPolicy`, no install scripts unless reviewed) |
| UI | React + TypeScript (strict mode). TS pinned to 6.0.x until `typescript-eslint` supports TS 7 |
| Build | Vite |
| PWA | `vite-plugin-pwa` (Workbox), app shell precached, installable |
| Routing | React Router |
| Auth | Firebase Authentication — Google sign-in only |
| Database | Cloud Firestore with persistent local cache (offline) |
| AI | Google Gemini API (free tier), called **only** from a serverless function |
| Hosting + functions | Netlify (static site + Netlify Functions) |
| Validation | Zod (shared schemas for entries and AI responses) |
| Unit / component tests | Vitest + React Testing Library |
| E2E tests | Playwright on Chromium, Firefox, WebKit + mobile emulation (including an offline scenario) |
| Security rules tests | Firebase Emulator Suite + `@firebase/rules-unit-testing` |
| Lint / format | ESLint + Prettier |
| CI | GitHub Actions: typecheck, lint, unit tests, rules tests, build on every push/PR |

Styling: plain CSS (CSS modules or a single well-organized stylesheet with CSS custom properties).
No UI framework unless we agree otherwise. Theme follows the system (`prefers-color-scheme`), no manual toggle.

## 4. Security model

- The app requires Google sign-in **once per device**; the session persists. There is no other login UI.
- Firestore rules: only the owner's UID can read or write. Everything else is denied.
  The owner UID is configured, never hardcoded in client logic beyond what the rules need.
- The Gemini API key lives **only** in Netlify environment variables (`GEMINI_API_KEY`).
  The client never sees it.
- The Netlify function verifies the Firebase ID token (`firebase-admin`) and checks the owner UID
  before calling Gemini, so nobody else can consume the quota.
- The Firebase web config is public by design; security relies on the rules. Document this in the README.
- The Gemini model name is configurable (`GEMINI_MODEL` env var). Check current Gemini docs for the
  available free-tier models and structured-output API before implementing; do not rely on memory.

## 5. Data model

All entries live in `users/{uid}/entries/{entryId}`. Sketch (refine with Zod during step 1):

```ts
type Lang = 'fr' | 'en' | 'es' | 'it';
type EntryType = 'noun' | 'verb' | 'adjective' | 'expression';

interface Entry {
  id: string;
  schemaVersion: number;           // for future migrations
  type: EntryType;
  translations: Record<Lang, Translation[]>; // at least 1 per language, all languages required
  mastered: boolean;               // manual switch, excludes the entry from quizzes when filtered
  createdAt: Timestamp;
  updatedAt: Timestamp;            // used for delta sync
  deleted: boolean;                // soft delete (tombstone) — required for delta sync
}
```

Several translations per language are allowed and **all have equal weight** (no "main" translation).
The shape of a `Translation` depends on the entry type:

- **expression:** `{ text }`
- **noun:** `{ text, gender?: 'm' | 'f', article?, plural?, pluralArticle? }`
  - FR / ES / IT: gender, singular article and plural are filled (ex. IT: `il ragazzo` / `i ragazzi`).
  - EN: no gender or article; `plural` only when irregular (mouse → mice).
- **adjective:** FR / ES / IT: 4 forms `{ mascSing, femSing, mascPlural, femPlural }`
  (identical forms allowed, ex. IT `grande / grande / grandi / grandi`). EN: single form.
- **verb:** `{ text (infinitive), reflexive?: boolean, conjugation }` where `conjugation` depends on the language:

```ts
// 6 persons, always in this order: 1sg, 2sg, 3sg, 1pl, 2pl, 3pl
type Persons = [string, string, string, string, string, string];
// Present imperative, 3 persons: 2sg, 1pl, 2pl
// ex. FR affirmative: va / allons / allez — negative: ne va pas / n'allons pas / n'allez pas
// ex. ES affirmative: ve / vamos / id — negative: no vayas / no vayamos / no vayáis
// ex. IT affirmative: vai (va') / andiamo / andate — negative: non andare / non andiamo / non andate
interface Imperative {
  affirmative: [string, string, string];
  negative: [string, string, string];
}

interface ConjugationFR { auxiliary: 'avoir' | 'être'; present: Persons; passeCompose: Persons;
  imparfait: Persons; futurSimple: Persons; conditionnelPresent: Persons; imperatifPresent: Imperative; }

interface ConjugationIT { auxiliary: 'avere' | 'essere'; presente: Persons; passatoProssimo: Persons;
  imperfetto: Persons; futuroSemplice: Persons; condizionalePresente: Persons; imperativo: Imperative; }

interface ConjugationES { presente: Persons; preteritoPerfecto: Persons; preteritoIndefinido: Persons;
  preteritoImperfecto: Persons; futuroSimple: Persons; condicional: Persons; imperativo: Imperative; }

interface ConjugationEN { base: string; pastSimple: string; pastParticiple: string; irregular: boolean; }
```

Decisions behind this model:
- The Zod schemas in `src/domain/schemas.ts` are the source of truth; this section is a summary.
- Domain timestamps are epoch milliseconds (`number`); conversion to Firestore `Timestamp` lives in the
  Firebase layer only.
- Nouns: `text` is the bare noun, articles are separate fields (`l'` + `arbre`). FR / ES / IT require
  `gender` and `article`; `plural` + `pluralArticle` are optional (uncountable nouns) but go together.
- Verbs: `text` is the infinitive as displayed, including the reflexive form (`se lever`, `alzarsi`);
  EN `text` is the bare infinitive (`go`, not `to go`). Conjugated forms are stored without subject pronouns.
- Search and duplicate detection ignore case, accents, punctuation, a leading article, and verb markers
  (`to`, `se`/`s'`, `-se`, `-si`). Duplicates compare whole words (all adjective forms), search ranks
  exact > prefix > word prefix > substring.
- No literary tenses: no French *passé simple*, no Italian *passato remoto*.
- No standalone past participle for FR / ES / IT: it is visible in the compound past.
- Compound pasts include agreement where relevant (ex. `sono andato/a`, `suis allé(e)`).
- **Spanish = Spain variety:** *vosotros* forms, peninsular vocabulary (*coche*, *ordenador*).
- **English = American** (spelling and vocabulary: *color*, *apartment*, *gotten*).
- Imperative: affirmative and negative, 3 persons (2sg, 1pl, 2pl). Negative forms are stored in full, not derived,
  because ES (subjunctive) and IT 2sg (infinitive) are irregular. No formal imperative (usted / Lei) for now.
- No example sentences.

Pronoun labels per language (display only, not stored):
FR `je, tu, il/elle, nous, vous, ils/elles` · IT `io, tu, lui/lei, noi, voi, loro` ·
ES `yo, tú, él/ella, nosotros, vosotros, ellos/ellas`.

## 6. Sync and offline strategy

- Firestore persistent local cache with multi-tab support. The app reads from the local cache first.
- **Cost-aware delta sync (important):** the dictionary will grow to several thousand entries and the free tier
  has a daily read quota. Do **not** re-listen to the whole collection on every app open. Load entries from the
  local cache, then listen only to documents with `updatedAt > lastSyncedAt`. Deletions are soft (`deleted: true`)
  so they propagate through the delta query. Verify Firestore's current caching and billing behaviour in the docs
  before implementing, and explain the trade-offs to me.
- Offline writes (manual add/edit/delete, mastered toggle) are queued by Firestore and synced on reconnect.
- Offline, the AI translation button is **disabled** with a short French message. No queueing of AI requests.
- Search runs client-side on the cached entries (fine for thousands of entries).

## 7. Features and screens

### 7.1 Dictionary (home)
- One search bar that searches the 4 languages at once, with language filter chips (🇫🇷 🇬🇧 🇪🇸 🇮🇹, bundled SVG flags).
- Search is case-insensitive, accent-insensitive, and ignores articles.
- Type filter (noun / verb / adjective / expression).
- Compact list; each row shows the entry in the 4 languages with flags.

### 7.2 Entry detail
- The 4 languages on **one screen**, each with its flag.
- Grammar details (gender, article, plural endings, adjective forms) are shown **discreetly**:
  lighter font weight or italic, so the main word stands out.
- **Verbs:** the 4 infinitives side by side. Tapping one opens that language's conjugation
  (all its tenses). Conjugations are never compared across languages.
- Text-to-speech button per translation (Web Speech API). Hide it when no voice is available for that language.
- Mastered switch, Edit, Delete (with confirmation).

### 7.3 Add / edit entry
- Two modes: **manual** or **AI**.
- The entry can be started from **any** of the 4 languages.
- **Duplicate check:** before saving (and before calling the AI), if the typed word already exists in that
  language (normalized comparison), warn and offer to open the existing entry.
- **AI mode:** I type a word in one language (type is optional; the AI detects it and I can change it).
  The function returns a **complete** entry: translations in the 3 other languages, type, gender, articles,
  plurals, adjective forms, full conjugations. The result opens in a **review screen where every field is
  editable**. Nothing is saved until I validate.
- **Manual mode:** same form, all fields editable, including every conjugation cell.
- Validation: at least one translation in each of the 4 languages is required.

### 7.4 Quiz
**Setup screen**, in this order:
1. Source language (one of the 4).
2. Target languages: one, two or all three of the others.
3. Type filters (noun / verb / adjective / expression).
4. Exclude mastered entries (on/off).
5. Order: random, or most recently added first.
6. Number of cards (fixed for the session).

**Session:**
- The card shows the entry in the source language (all its translations).
- Below it, one face-down card per selected target language. I can flip them one by one or all at once.
- Swipe right = "je connais", swipe left = "à réviser". Swiping is allowed without flipping.
- Knowledge is **global per entry**: one unknown language means the whole entry goes to "à réviser".
- "À réviser" cards come back **once** at the end of the session, then the session ends.
- Nothing is persisted between sessions except the manual mastered switch. No stats.
- **Desktop controls:** mouse drag to swipe, plus keyboard: `←` / `→` to swipe, `Space` to flip all,
  `1` / `2` / `3` to flip a single card.
- Simple end screen, then back to the dictionary or a new quiz.

### 7.5 Settings
- Export the whole dictionary as JSON; import a JSON export (validated with Zod, with a preview before writing).
- Sign out.

## 8. UI guidelines
- Mobile-first, responsive and comfortable on desktop. Fast to use daily: few taps per action.
- Visual and clean. Flags identify languages everywhere.
- **Flags:** flag emojis do **not** render on Windows (they show "FR", "IT"…). Use SVG flags (bundled, offline)
  instead of emoji.
- Accessible: sufficient contrast in both themes, visible focus states, swipe actions also reachable by buttons.

## 9. AI function (`netlify/functions/translate`)
- Input: `{ sourceLang, text, type? }` plus the Firebase ID token in the `Authorization` header.
- Verifies the token and owner UID, then calls Gemini with a **structured JSON output schema**.
- The response is validated with the same Zod schema as entries; on invalid output, return a clear error.
- The prompt must enforce: Spain Spanish, American English, the exact tenses of section 5, compound pasts with
  agreement, no literary tenses, several translations only when meanings genuinely differ.
- Errors (quota, network, invalid output) are shown to me in French, without losing what I typed.
- Unit-test the function with a mocked Gemini client.

## 10. Roadmap (one step at a time, approval before each)
0. **Setup:** Vite + React + TS strict, ESLint, Prettier, Vitest, Playwright, PWA plugin, Netlify config,
   GitHub Actions CI, `.env.example`, README skeleton.
1. **Domain:** Zod schemas and TS types for entries, normalization/search helpers, duplicate detection. Unit tests.
2. **Firebase:** Google auth, Firestore with persistent cache, security rules + rules tests in the emulator,
   delta sync with soft deletes.
3. **Dictionary read:** home list, search, filters, entry detail (with dev seed data).
4. **Manual CRUD:** add / edit / delete, mastered switch, duplicate warning.
5. **Conjugations:** infinitives side by side, per-language conjugation view, editable conjugation form.
6. **AI:** Netlify function, review screen, offline-disabled state.
7. **Quiz:** setup screen, cards, flip, swipe (touch + mouse + keyboard), end-of-session review pile.
8. **Extras:** text-to-speech, JSON export/import.
9. **Polish:** offline E2E test, accessibility pass, README for the portfolio
   (architecture diagram, security model, offline/sync strategy, how to run tests).

## 11. Status
- Step 0 (Setup): **done** (2026-10-04). Node 24 LTS for CI/Netlify, pnpm 12. Content-Security-Policy
  header deferred to step 2 (needs the Firebase origins).
- Step 1 (Domain): **done** (2026-10-04). Zod 4 schemas, normalization, search index, duplicate detection,
  realistic fixtures in `src/test/fixtures.ts` (reusable as dev seed data in step 3).
- Step 2 (Firebase): **done** (2026-10-04), except the production check of redirect sign-in through the
  Netlify `/__/auth` proxy, which needs the Netlify site (set `VITE_FIREBASE_AUTH_DOMAIN` to the site domain
  there and add it to Firebase Auth authorized domains). Firestore project `salva-dico` (eur3), rules deployed
  with `pnpm exec firebase deploy --only firestore`. CSP is a build-time `<meta>` tag (`csp.ts`).
  Local Java 21 for the emulator: Temurin in `~/.local/share/java/` (Homebrew has no Intel bottles).
- Step 3 (Dictionary read): **done** (2026-10-04). Alphabetical list (French collation), URL-backed
  filters, progressive rendering (100 rows + IntersectionObserver, `content-visibility`), entry detail.
  Dev data lives in the emulators only (`pnpm dev:emulators`, `scripts/seed-emulator.ts`); E2E tests run on
  a seeded emulator build. English flag = British flag (owner's choice, despite American English content).
- Step 4 (Manual CRUD): **done** (2026-10-04). Data router (`createBrowserRouter`, `useBlocker` for unsaved
  changes, French error page). Editor for nouns, adjectives and expressions with live grammar hints (gender
  from article, plural article, adjective forms) and duplicate warnings; verbs are edited in step 5.
  Writes return immediately (offline-friendly); server rejections surface as notifications. PWA messages
  are notifications at the top so they never cover the add or save buttons.
- Step 5 (Conjugations): **done** (2026-10-04). Conjugation page per verb and language
  (`/entries/:id/conjugation/:lang/:index`), native tense names with the French equivalent, pronouns added
  at display (French "j'" elision). Verbs are editable: one collapsible section per tense, sections with
  errors reopen on save. No regular-verb generator (owner's choice: the AI of step 6 fills conjugations).
- Next step: 6 (AI).

## 12. Future ideas (not in scope now — do not implement, but avoid blocking them)
- **Latin American Spanish variants:** optional `region?: 'es' | 'latam'` on Spanish translations,
  badge display (ex. *coche* 🇪🇸 · *carro* 🌎), quiz setting "accepted variant", conjugation toggle
  *vosotros* → *ustedes*, optional *voseo* present forms. Prefer additive schema changes via `schemaVersion`.
