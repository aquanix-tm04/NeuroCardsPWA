# NeuroCards — Project Handoff Document

> **Purpose:** This document gives the next Bolt.ai agent everything needed to continue developing NeuroCards from its current state — architecture, file map, database schema, conventions, known issues, and verified status.

---

## 1. Project Overview

NeuroCards is a bilingual (Persian / English) neuroscience flashcard PWA with spaced repetition (SM-2 algorithm), cloud sync via Supabase, and an offline-first architecture. It targets mobile phones and tablets.

**Status as of 2026-11-18:** All planned features are implemented. Typecheck, build, and lint all pass (0 errors, 3 pre-existing harmless warnings).

### Core features (all complete)

- Email/password authentication via Supabase Auth (open sign-up)
- Offline-first: local SQLite (sql.js + IndexedDB) is primary; cloud sync is an overlay
- Cloud sync between devices (last-write-wins via `updated_at` timestamps)
- One-time transfer of local device data to cloud account on first sign-in
- SM-2 spaced repetition with confidence rating (1-5) before grading
- Strict automatic answer checking (requires ~90% of key phrases; Persian/English aware)
- Fill-in-the-blank card type
- Image support (2-3 per card, canvas-compressed, pinch-to-zoom viewer)
- Flag unclear cards for later review
- Daily goal with progress bar, streak tracking with one-day-per-week forgiveness
- Statistics screen with retention rate, 14-day review bar chart, 14-day retention line chart, per-deck breakdown, activity heatmap, leech cards
- Account deletion, privacy notice at sign-up, "continue offline" mode
- CSV import/export, JSON export
- LaTeX rendering (KaTeX), RTL/LTR bilingual UI, dark/light/auto theme

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript 5.5 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS 3.4 |
| Icons | lucide-react |
| Local DB | sql.js (SQLite WASM) persisted to IndexedDB |
| Cloud DB | Supabase (PostgreSQL + RLS + Storage) |
| Auth | Supabase Auth (email/password) |
| Math rendering | KaTeX |
| CSV parsing | PapaParse |
| Fonts | @fontsource/vazirmatn (Persian) |

**Key dependencies:** `@supabase/supabase-js`, `sql.js`, `katex`, `papaparse`, `lucide-react`.

**Path alias:** `@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`).

---

## 3. File Map

```
src/
├── App.tsx                    # Root: AuthProvider > AppProvider > NavProvider > Shell
├── main.tsx                   # Entry point
├── index.css                  # Tailwind + custom styles (flip-card, heat-cell, animations)
├── vite-env.d.ts              # Vite env type declarations (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
│
├── context/
│   ├── AppContext.tsx         # App settings (lang, theme, fontSize, settings map)
│   ├── AuthContext.tsx        # Auth state machine (loading/authenticated/unauthenticated)
│   └── NavContext.tsx         # Hash-based router (home, deck, study, quiz, stats, settings, import)
│
├── db/
│   ├── database.ts            # sql.js init, IndexedDB persistence, query helpers (exec/run/queryAll/queryOne/uid)
│   ├── repos.ts               # CRUD: decks, cards, card_images, flagged cards, seed data, bulk sync export
│   ├── sm2.ts                 # SM-2 algorithm, recordReview, previewIntervals, getDueCards, getAllCardsWithDeck
│   ├── stats.ts               # All statistics queries (accuracy, retention, streaks, heatmap, per-deck, trends)
│   ├── settings.ts            # Key-value settings store with defaults
│   └── types.ts               # TypeScript interfaces (Deck, Card, Review, CardImage, Rating, etc.)
│
├── lib/
│   ├── supabase.ts            # Supabase client singleton (null if env vars missing)
│   ├── sync.ts                # Cloud sync: push, pull, fullSync, transferLocalToCloud, deleteCloudAccount, online watcher
│   ├── answerCheck.ts         # Auto answer checking: key phrase extraction, tokenization, 90% threshold
│   ├── images.ts              # Image compression (canvas), upload/download/delete from Supabase Storage
│   ├── i18n.ts                # Bilingual dictionary (fa/en) + t() function
│   ├── normalize.ts           # Persian/Arabic text normalization, digit conversion, LaTeX stripping
│   ├── latex.ts               # LaTeX content rendering helper
│   ├── csv.ts                 # CSV import/export utilities
│   ├── theme.ts               # Theme (light/dark/auto), language (fa/en), font size application
│   └── reminder.ts            # Daily reminder notification watcher
│
├── components/
│   ├── TopBar.tsx             # Header bar with sync indicator (when authenticated)
│   ├── TabBar.tsx             # Bottom tab navigation (home, study, quiz, stats, settings)
│   ├── SyncIndicator.tsx      # Sync status badge (synced/syncing/error/offline)
│   ├── ImageZoom.tsx          # Full-screen pinch-to-zoom image viewer
│   ├── CardImages.tsx         # Card image grid display
│   ├── LatexContent.tsx       # Renders text with LaTeX math
│   ├── Modal.tsx              # Reusable modal dialog
│   ├── EmptyState.tsx         # Empty state placeholder
│   └── Loading.tsx            # Loading spinner
│
└── screens/
    ├── AuthScreen.tsx         # Sign-in / sign-up / reset-password with privacy notice + continue offline
    ├── TransferScreen.tsx     # One-time local-to-cloud data transfer on first sign-in
    ├── HomeScreen.tsx         # Deck list, daily goal progress bar, flagged cards section
    ├── DeckDetailScreen.tsx   # Deck detail: card list, add/edit card modal, card type selector, image upload
    ├── StudyScreen.tsx        # Flashcard study: flip, confidence check, grade buttons with interval previews, flag
    ├── QuizScreen.tsx         # Quiz: MCQ, type-in (auto-checked), true/false
    ├── StatsScreen.tsx        # Statistics: metrics, charts, heatmap, per-deck, leech cards
    ├── SettingsScreen.tsx     # Settings: language, theme, font size, study/quiz defaults, data export, account
    └── ImportScreen.tsx       # CSV import with preview and deck assignment

supabase/
└── migrations/
    └── 20261112120730_create_neurocards_schema.sql   # Full schema (6 tables + RLS + storage bucket)

public/
├── sw.js                      # Service worker for PWA offline
├── manifest.webmanifest       # PWA manifest
├── sql-wasm.wasm              # SQLite WASM binary
└── icon.svg                   # App icon
```

---

## 4. Database Architecture

### 4.1 Local Database (SQLite via sql.js)

The app is **offline-first**. All reads/writes go to a local SQLite database (sql.js compiled to WASM, persisted to IndexedDB). Cloud sync runs as an overlay layer on top.

**Schema (local SQLite):**

| Table | Columns | Notes |
|---|---|---|
| `decks` | id, name, created_at, updated_at, synced | `seed-neuro-deck` is the default seed deck ID |
| `cards` | id, deck_id, question, answer, card_type, blank_answer, flagged, created_at, updated_at, synced | card_type: 'standard' \| 'blank' |
| `reviews` | id, card_id, rating, confidence, reviewed_at, next_due, synced | rating: 1-4, confidence: 1-5 (nullable) |
| `card_images` | id, card_id, storage_path, display_order, created_at, synced | |
| `settings` | key, value | Key-value app settings |
| `tags` | id, name | (Legacy, currently unused by UI) |
| `card_tags` | card_id, tag_id | (Legacy, currently unused by UI) |

**Migration system:** `database.ts` runs `SCHEMA_SQL` on every init (idempotent with `IF NOT EXISTS`), then tries `MIGRATION_SQL` (ALTER TABLE statements) in a try/catch — columns that already exist are silently skipped.

**Query helpers** (`database.ts`): `exec()`, `run()`, `queryOne<T>()`, `queryAll<T>()`, `uid(prefix)`. All use sql.js prepared statements. `run()` triggers a debounced persist to IndexedDB.

### 4.2 Cloud Database (Supabase PostgreSQL)

**6 tables, all with RLS enabled, owner-scoped to `auth.uid()`:**

| Table | Purpose | Key columns |
|---|---|---|
| `decks` | User flashcard decks | id, name, user_id (DEFAULT auth.uid()), created_at, updated_at |
| `cards` | Flashcards | id, deck_id, user_id, question, answer, card_type, blank_answer, flagged, created_at, updated_at |
| `card_images` | Image metadata | id, card_id, user_id, storage_path, display_order, created_at |
| `reviews` | Review records | id, card_id, user_id, rating, confidence, reviewed_at, next_due |
| `user_settings` | Per-user settings | user_id, key, value, updated_at (PK: user_id + key) |
| `review_overrides` | Manual answer overrides | id, card_id, user_id, user_answer, stored_answer, was_correct, created_at |

**RLS pattern (all tables):** 4 separate policies per table (SELECT/INSERT/UPDATE/DELETE), scoped `TO authenticated` with `auth.uid() = user_id`. `user_id` columns `DEFAULT auth.uid()` so client inserts without passing user_id succeed. Grants: SELECT/INSERT/UPDATE/DELETE to `authenticated` only.

**Storage:** `card-images` bucket (public read). Upload/delete policies scoped to `auth.uid()::text` folder prefix. Image path pattern: `{userId}/{cardId}/{timestamp}.jpg`.

**Migration file:** `supabase/migrations/20261112120730_create_neurocards_schema.sql` — already applied to the live database. The migration is idempotent (uses `IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`).

### 4.3 Sync Architecture

`src/lib/sync.ts` implements last-write-wins sync:

- **`pushLocalToCloud()`** — Upserts all local decks/cards/reviews to Supabase. Reviews are filtered to `synced = 0` for efficiency. Marks rows as `synced = 1` after successful upload.
- **`pullCloudToLocal()`** — Fetches cloud rows. For decks/cards, compares `updated_at` timestamps: cloud wins if newer. For reviews, inserts only if the review ID doesn't exist locally (reviews are append-only, never updated).
- **`fullSync()`** — Push then pull. Called on app load (when authenticated) and on `online` event.
- **`transferLocalToCloud()`** — One-time transfer on first sign-in. The seed deck (`seed-neuro-deck`) gets a new UUID to avoid conflicts with other devices that have the same seed. Regular decks are upserted with their existing IDs.
- **`deleteCloudAccount()`** — Deletes all user rows from reviews, cards, decks, user_settings (cascading FKs handle the rest).
- **`initOnlineWatcher()`** — Listens for browser `online`/`offline` events; triggers `fullSync()` on reconnection.

**Sync status state machine:** `idle → syncing → synced | error | offline`. Listener pattern via `onSyncStatusChange()`.

---

## 5. Key Algorithms

### 5.1 SM-2 Spaced Repetition (`src/db/sm2.ts`)

- Rating scale: 1=Again, 2=Hard, 3=Good, 4=Easy
- `sm2(prev, rating, now)` — Computes next interval based on ease factor, repetitions, and rating. Ease minimum 1.3. Again resets repetitions to 0.
- `getCardState(cardId)` — Reconstructs SM-2 state by replaying all review history for a card.
- `recordReview(cardId, rating, confidence?)` — Records a review and computes next due date.
- `previewIntervals(cardId)` — Returns human-readable interval labels ("1d", "6d", etc.) for each possible rating, shown on grade buttons.
- `getDueCards(deckId?, limit?)` — Returns cards where `next_due <= now` or never reviewed.

### 5.2 Auto Answer Checking (`src/lib/answerCheck.ts`)

- `checkAnswer(userAnswer, storedAnswer)` → `{ correct, score, matched, missed }`
- Extracts key phrases from the stored answer (splits by sentences, extracts meaningful words/phrases, ignores stopwords)
- Tokenizes both answers with Persian/Arabic normalization (ي→ی, ك→ک, digit conversion)
- Per-phrase match threshold: 60% of phrase tokens must appear in user answer
- Overall correctness threshold: **90%** of key phrases must match
- LaTeX markup is stripped before comparison
- User can override the auto-check result ("This was correct" button in QuizScreen)

### 5.3 Streak Calculation (`src/db/stats.ts`)

- `getStreakDays()` — Current streak counting backward from today. Allows one skipped day per week (gap of exactly 2 days is forgiven once, then streak breaks).
- `getLongestStreak()` — Scans all review dates forward, same forgiveness rule, returns the longest run.

---

## 6. Routing & Navigation

Hash-based router in `src/context/NavContext.tsx`:

| Route | URL | Screen |
|---|---|---|
| home | `#/` | HomeScreen |
| deck | `#/deck/{id}` | DeckDetailScreen |
| study | `#/study` or `#/study/{deckId}` | StudyScreen |
| quiz | `#/quiz` or `#/quiz/{deckId}` | QuizScreen |
| stats | `#/stats` | StatsScreen |
| settings | `#/settings` | SettingsScreen |
| import | `#/import` | ImportScreen |

Bottom TabBar shows on: home, study, quiz, stats, settings.

**App boot flow** (`App.tsx`):
1. AuthProvider checks session → state is `loading` / `authenticated` / `unauthenticated`
2. If `unauthenticated` and not in offline mode → AuthScreen (with "continue offline" button)
3. If `authenticated` and transfer not done → TransferScreen (one-time)
4. Otherwise → main app shell with TabBar
5. On authentication: `initOnlineWatcher()` + `fullSync()` start

---

## 7. Settings & Defaults

`src/db/settings.ts` — key-value store in local SQLite `settings` table.

| Key | Default | Description |
|---|---|---|
| `lang` | `fa` | UI language (fa/en) |
| `theme` | `auto` | light/dark/auto |
| `font_size` | `md` | small/medium/lg |
| `study_direction` | `forward` | forward (Q→A) / reverse (A→Q) / both |
| `daily_limit` | `50` | Max new cards per day |
| `daily_goal` | `20` | Daily review goal for progress bar |
| `show_timer` | `0` | Show study timer |
| `quiz_type` | `mcq` | mcq / typeIn / trueFalse |
| `quiz_count` | `10` | Questions per quiz |
| `quiz_shuffle` | `1` | Shuffle quiz questions |
| `reminder_time` | `` | Daily reminder time |
| `reminder_enabled` | `0` | Enable daily reminder |

Cloud settings sync to `user_settings` table (key/value/updated_at).

---

## 8. Conventions

### Code style
- TypeScript with explicit types on all function parameters
- Import path alias: `@/` → `src/`
- React hooks: `useApp()` for app context, `useAuth()` for auth, `useNav()` for navigation
- `onAuthStateChange` uses async IIFE pattern to avoid deadlock (per Supabase guidelines)
- Supabase client is `null` if env vars are missing — all cloud code checks `if (!supabase) return` gracefully
- No comments unless the "why" is non-obvious
- Tailwind CSS for all styling; custom classes defined in `index.css` (card-surface, primary-btn, ghost-btn, flip-card, heat-cell, etc.)

### i18n
- All user-facing strings go through `t('key')` from `useApp()`
- Dictionary in `src/lib/i18n.ts` with `{ fa: string, en: string }` entries
- Numbers displayed with `toPersianDigits()` when `lang === 'fa'`

### Database work (Supabase)
- Use `mcp__supabase__apply_migration` for all DDL (never raw SQL, never Supabase CLI)
- Use `mcp__supabase__execute_sql` for DML diagnostics
- RLS: 4 policies per table (one per CRUD verb), `TO authenticated`, `auth.uid() = user_id`
- `user_id` columns: `DEFAULT auth.uid()` so client inserts work without passing user_id
- Always `GRANT` verbs to `authenticated` in the same migration

---

## 9. Environment Variables

Required in `.env` (already provisioned by Bolt):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Server-side (for edge functions, not currently used):
```
SUPABASE_URL=<same>
SUPABASE_ANON_KEY=<same>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_DB_URL=<postgres-connection-string>
```

The app gracefully degrades to offline-only mode if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set.

---

## 10. Verified Status (2026-11-18)

| Check | Result |
|---|---|
| TypeScript typecheck (`tsc --noEmit`) | PASSED |
| Production build (`vite build`) | PASSED |
| ESLint (`eslint .`) | 0 errors, 3 warnings |
| Supabase migration applied | Yes — all 6 tables + RLS + storage bucket live |

**The 3 lint warnings** are `react-refresh/only-export-components` on `AppContext.tsx`, `AuthContext.tsx`, and `NavContext.tsx`. These are standard for context files that export both a Provider component and a `useXxx()` hook — not actionable without splitting context files unnecessarily.

---

## 11. Known Minor Issues & Potential Improvements

1. **`getDueTodayCount` in stats.ts vs `countDueToday` in sm2.ts** — Two functions with identical logic. Could be consolidated to a single source.

2. **`isTablet` in StudyScreen** — The variable is computed (`window.innerWidth >= 768`) but the grid layout uses `grid-cols-4` for both tablet and phone. The conditional `${isTablet ? 'grid-cols-4' : 'grid-cols-4'}` is a no-op.

3. **`tags` / `card_tags` tables** — Exist in the local schema but are not used by any UI. Could be removed or implemented as a tagging feature.

4. **Bundle size** — The main JS chunk is ~578 KB (gzip: 179 KB). Code-splitting with dynamic imports could reduce this. The main contributors are sql.js (WASM), KaTeX, and Supabase client.

5. **Sync is not real-time** — Sync runs on app load and on `online` event only. Supabase Realtime subscriptions could enable live multi-device sync.

6. **Image sync** — Card images are uploaded to Supabase Storage on creation, but the `card_images` local table sync flag (`synced` column) is not used by the sync module. Images are only synced on the initial transfer. Subsequent image additions on device A won't appear on device B without a manual full sync trigger.

7. **No edge functions deployed** — The app uses no edge functions. Account deletion deletes data rows but does not delete the auth user (Supabase doesn't allow client-side user deletion; this would need an edge function with service role key).

8. **Seed deck transfer** — The transfer logic generates a new UUID for the seed deck to avoid conflicts. This means the seed deck will have different IDs on different devices after transfer, which is correct but means the `seed-neuro-deck` ID is only valid pre-transfer.

---

## 12. How to Continue Development

### Running commands
```bash
npm run dev        # Start dev server (blocked in Bolt environment — runs automatically)
npm run build      # Production build (verify before finishing work)
npm run lint       # ESLint check
npm run typecheck  # TypeScript check (no emit)
```

### Before making changes
1. Read the file you're about to modify with the Read tool (not grep/cat)
2. Match existing conventions (naming, imports, styling patterns)
3. Check `src/lib/i18n.ts` for existing translation keys before adding new ones
4. Use `@/` path alias for all imports from `src/`

### When adding a new screen
1. Create `src/screens/NewScreen.tsx`
2. Add route type to `NavContext.tsx` (Route union + parseHash + routeToHash + routeTab)
3. Add to `Screen` switch in `App.tsx`
4. Add to `TAB_ROUTES` set if it should show the TabBar

### When adding database tables or columns
1. Load the `bolt-database` skill first (required by project rules)
2. Write the migration SQL and apply with `mcp__supabase__apply_migration`
3. Also add the table/columns to the local SQLite schema in `database.ts` (`SCHEMA_SQL` or `MIGRATION_SQL`)
4. Add TypeScript interfaces to `db/types.ts`
5. Add CRUD functions to `db/repos.ts`
6. Add RLS policies (4 per table) and grants in the migration

### When modifying sync logic
- Always check `if (!supabase) return` at the top of cloud functions
- Use `setStatus()` to update the sync status state machine
- Mark rows as `synced = 1` after successful cloud operations
- Use `maybeSingle()` for zero-or-one queries, never `single()`

### Build verification
- Always run `npm run build` before finishing — fix any errors
- Run `npm run lint` — fix all errors (warnings in context files are acceptable)
- The project has no test suite; verification is via typecheck + build + lint
