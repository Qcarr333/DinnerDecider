# DEV_HANDOFF_README

## Project Overview

DinnerDecider is a Next.js 15 app using the App Router with Tailwind CSS, Framer Motion, and Vercel Analytics. It integrates Supabase (auth/data), OpenAI (recommendations/UX copy), Stripe (payments), and Google Maps/Places APIs (restaurant data). Phase 9 adds Plan Ahead overrides, expanded Google Places filtering (cafes, desserts, bar-only "Drinks" mode), and Supabase-backed login/profile screens.

Purpose: AI-powered restaurant picker with combo filters (R1), unique-restaurant rotation/reroll (R2), and a path for premium features (upgrades, referrals, profiles).

## Completed Phases

- Phase 1: Base architecture, story flow, and R1 → R2 data handling.
- Phase 2: Supabase auth, user context, localStorage caching.
- Phase 3: OpenAI & Google Maps API integration.
- Phase 4: SEO, analytics dashboard, sitemap/robots, conversion banner.
- Phase 5: Monetization mock, referrals/promos, profile cleanup.
- Phase 6: R2 unique restaurant filtering, banner dismiss persistence, clean CHANGELOG/README_DEV.

## Runtime & Service Connections

- **Supabase** – browser client helper at `src/lib/supabaseBrowser.js`, server/service client at `src/lib/supabaseServer.js`. Realtime group flow (`src/app/dinnerdecider/group/[code]/page.js`) uses Supabase presence + broadcast.
- **Google Maps / Places** – helper logic in `src/lib/fetchNearbyRestaurants.js`; API routes live under `src/app/api/places/*` (autocomplete, details, timezone).
- **OpenAI** – orchestrated in `src/lib/aiRecommender.js` and served via `/api/openai/suggest`.
- **Weather / OpenWeather** – `/api/weather/route.js` uses `OPENWEATHER_API_KEY` for mood hints.
- **Stripe (placeholder)** – scaffolding in `src/lib/payments.js` and `/dinnerdecider/upgrade`; still mock-only.

## Environment & Secrets

- Store secrets in `.env.local` (ignored). Key variables currently expected:
	- `NEXT_PUBLIC_GOOGLE_API_KEY`
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	- `SUPABASE_URL`
	- `SUPABASE_ANON_KEY`
	- `SUPABASE_SERVICE_ROLE_KEY`
	- `OPENAI_API_KEY`
	- `OPENWEATHER_API_KEY`
	- `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (placeholder test values)
	- Optional: `NEXT_PUBLIC_BUTTONDOWN_TOKEN`, `PORT`
- Vercel beta project has these synchronised (Nov 19, 2025). Re-sync whenever keys rotate.
- Dev server runs on port 3003 (`npm run dev`).

## Supabase Schema & Data Flow

- Authoritative schema: `supabase/phase9_schema.sql` (profiles table + policies, session metrics stub, group session events).
- Annotated schema doc: `docs/Phase_9/P9_Revised_Supabase_Schema.md`.
- Group state persistence/API: `src/app/api/group-session/state/route.js` (writes to `group_session_events`).
- Seed script: `supabase/scripts/seedUsers.mjs` (invoked via `npm run seed:users`); seeds QA cohorts (`u00x`, `p00x`, `trial001`).
- Metrics table exists but emitters pending (see roadmap Outstanding Actions #4).

## Documentation & Logs

- **Roadmap / status:** `docs/Phase_9/P9_Full_Roadmap.md`.
- **QA results:** `docs/Phase_9/P9_Testing.md` (links to log captures in `docs/Phase_9/logs/`).
- **Feature notes:** Plan Ahead + Drinks assets under `docs/Phase_9/Features/`; auth screenshots in `docs/Phase_9/Dashboard_Auth/`.
- **Seed evidence:** `docs/Seed_users/`.
- **Handoff log:** this file plus `README_DEV.md` for dev setup details.

## Deployment Status (Nov 19, 2025)

- Vercel beta deployment is active with env vars synced from `.env.local` and `main` as the live branch.
- Pending: document beta smoke-test results (per roadmap action), add monitoring notes, confirm OpenAI/Places quotas post-deploy.
- GitHub Actions workflow `CI` runs lint + build on push/PR; no e2e tests yet.

## Active Risks & Follow-Ups

- **Group session vote auto-finalize (verify fix):** countdown guard added Nov 20—rerun two-browser session and capture a new log before closing the issue.
- **Telemetry:** need to wire client/server emitters into `session_metrics` for rerolls, presence, errors.
- **`/subscribe` experience:** placeholder page needs content + launch flag gating before marketing push.
- **Supabase RLS audit:** ensure admin dashboards retain access with new policies.

## Phase 9 Status Matrix (Nov 20, 2025)

### To be developed
- Marketing subscription CTA: add `src/app/dinnerdecider/subscribe/page.js` with gated copy driven by `src/lib/launchFlags.js.subscribeEnabled` and share CTA hooks from `src/app/dinnerdecider/launch/page.js`.

### In development
- Telemetry emitters: thread `track()` calls in `src/lib/track.js` through `src/app/api/session-metrics/route.js` and persist to the Supabase `session_metrics` table (see schema in `supabase/phase9_schema.sql`).
- Supabase RLS review: document policy adjustments in `docs/Phase_9/P9_Revised_Supabase_Schema.md` after validating admin/dashboard queries that hit `src/app/admin/analytics/page.js`.

### Backlog
- Stripe live checkout: `src/lib/payments.js` and `src/app/dinnerdecider/upgrade/page.js` remain mock-only because production keys and compliance review are pending from finance.
- R2 keyword blending opt-out: when combos like “Italian → Fine dining” execute, `src/lib/fetchNearbyRestaurants.js` still appends legacy dinner keywords (e.g., "steakhouse seafood...") causing mismatched results (see `docs/Phase_9/P9_Testing.md` notes under Run 3).

### Tabled
- Referral rewards refresh: hold updates to `src/lib/referrals.js` and `src/app/dinnerdecider/refer/page.js` until marketing finalizes incentive tiers (ETA Phase 10).

### Testing
- Group session timer guard: validate changes in `src/app/dinnerdecider/group/[code]/page.js` (round reset + `autoFinalizeRef` + `timerExpired` broadcast) with `/api/group-session/state/route.js`; log the regression in `docs/Phase_9/logs/` using `scripts/captureTestLog.ps1`.
- Latest runs (`docs/Phase_9/logs/2025-11-20_094229_test3_auth_flow.log`, `docs/Phase_9/logs/2025-11-20_195045_test3_auth_flow.log`) confirmed hydration stability. Re-test after the new `timer_expired` broadcast to ensure the first "Like" no longer locks a winner and to capture whether second-round shortlists still stall—see `docs/Phase_9/P9_Testing.md` for setup.
- Test4 Group Party (`docs/Phase_9/logs/2025-11-20_201452_test4_group_party.log`) shows timer prompts working, but cross-client vote visibility and shortlist sync remain inconsistent; winner selection may bypass aggregate vote totals. Address these before QA sign-off.

### Complete (awaiting testing confirmation)
- Vercel beta smoke checklist: env sync in `vercel.json` and analytics toggles in `next.config.mjs` completed; run through `/`, `/dinnerdecider/randomize`, and `/dinnerdecider/group/[code]` against the beta URL and capture results in `docs/Phase_9/P9_Testing.md`.

### Complete with signoff
- Plan Ahead overrides (`src/app/dinnerdecider/plan/page.js`, `src/context/DinnerContext.jsx`) and Drinks vibe filtering (`src/lib/fetchNearbyRestaurants.js`) cleared QA on Nov 19 (`docs/Phase_9/logs/2025-11-18_215117_test2_plan_ahead_retake.log`).
- Supabase auth + profile overhaul (`src/app/dinnerdecider/login/page.js`, `src/app/dinnerdecider/profile/page.js`, `supabase/scripts/seedUsers.mjs`) signed off in `docs/Phase_9/logs/2025-11-19_214442_test3_auth_flow.log`.

## Known Constraints

- R2 duplicates mitigated via `place_id` rotation in `fetchNearbyRestaurants.js` and filtering closed venues.
- Repo hygiene: `.gitignore` excludes build artifacts/secret files; large binaries purged earlier.
- Windows newline normalisation handled via `.gitattributes` (prevents CRLF churn).

## Repository & Branch Info

- Remote: https://github.com/Qcarr333/DinnerDecider.git
- Branch: main (tracking origin/main)
- CI/CD: GitHub Actions workflow `CI` (lint + build on push/PR to main)

## Next Recommended Steps

- Run the group session regression (two browser tabs) to confirm the timer guard fix and drop a log in `docs/Phase_9/logs/`.
- Instrument client/server emitters to persist analytics into `session_metrics`, then snapshot dashboards in `docs/Phase_9/`.
- Replace the `/dinnerdecider/subscribe` placeholder with final copy and guard with the appropriate feature flag.
- Run a Supabase RLS regression pass against admin dashboards and document any policy tweaks in `docs/Phase_9/P9_Revised_Supabase_Schema.md`.
- Capture and archive the Vercel beta smoke test, including quota checks for OpenAI/Places and monitoring follow-ups.

## Local Dev Tips

- Install dependencies before running any Next.js scripts. Missing `next` errors usually mean `node_modules` is absent → run `npm install` (or `npm ci`).
- Launch the dev server on port 3003 to avoid conflicts: `npm run dev` (internally executes `next dev -p 3003`).
- Capture QA logs with `pwsh scripts/captureTestLog.ps1 -Command "npm run dev" -LogName "test2_plan_ahead"`; files drop into `docs/Phase_9/logs/` for handoff.
- Seed Supabase test accounts anytime with `npm run seed:users` (uses `supabase/scripts/seedUsers.mjs`; requires service role env vars).
- Key routes to test: `/dinnerdecider`, `/dinnerdecider/randomize`, `/dinnerdecider/plan`, `/dinnerdecider/profile`, `/dinnerdecider/login`, `/dinnerdecider/output`.
- Use Vercel for preview deployments once CI is in place; sync environment variables through Vercel dashboard before deploying.

---

### Nov 19, 2025 Update

- Seed cohorts are available via `npm run seed:users` (requires `.env.local` Supabase keys). Script populates auth + profiles for `u00x` free testers, `p00x` premium testers, and a `trial001` account. Reference screenshots in `docs/Seed_users/` and schema document `docs/Phase_9/P9_Revised_Supabase_Schema.md`.
- Plan Ahead + Drinks vibe features passed QA (see `docs/Phase_9/P9_Testing.md` and logs under `docs/Phase_9/logs/`).
- QA tooling: use `scripts/captureTestLog.ps1` to stream terminal output into dated logs, and updated P9 roadmap highlights remaining Phase 9 items (group vote merge/presence, metrics table, `/subscribe` copy, Vercel deploy tasks).
- Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) must be present before running the seed script or auth features.

