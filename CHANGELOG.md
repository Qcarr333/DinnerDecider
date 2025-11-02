# 🧾 DinnerDecider — CHANGELOG

## Version 7.1.4 — 2025-10-21
**Phase:** 8.9 — Live API Observability Prep ✅
**Developer:** GitHub Copilot
**Reviewer:** Technical Product Owner (Q. S. Carter)

---

### 🧱 Summary
- Refactored `src/lib/fetchNearbyRestaurants.js` into an internal helper + client wrapper, attaching metadata safely while emitting `🌐/📦` trace logs for every Google Places call.
- Stood up `/api/places` as a server-side proxy with CORS controls and duration headers, enabling live Places responses during local development without browser-side secrets.
- Instrumented `/api/weather` with `🌦️/🌈` call logs, latency reporting, and cached response differentiation; documented the new debugging workflow in `README_DEV.md`.

### 🧪 Verification
- Manual endpoint smoke: `/api/places` (POST) + `/api/weather?lat=30.33&lng=-81.65`
- UI spot-check: `/dinnerdecider/output` reroll traces (unique venues, live logs)

---

## Version 7.1.3 — 2025-10-20
**Phase:** 8.8 — R2 Accuracy & Rotation Stabilization ✅
**Developer:** GitHub Copilot
**Reviewer:** Technical Product Owner (Q. S. Carter)

---

### 🧱 Summary
- Reworked the R2 rotation pipeline to treat Don’t Care layers as wildcards, ensuring rerolls never repeat a venue until the rotation is exhausted and auto-refreshing the cache when it is.
- Extended `/lib/fetchNearbyRestaurants` metadata with active filter logs, applied keyword traces, radius source, and returned place IDs to power behavioral QA for Phase 8.8.
- Hardened the `output` page to honor Region/Experience/Specialized filters, persist session-level dedupe, and surface `R2 Dedup` console diagnostics alongside the new premium banner dismissal control.

### 🧪 Verification
- `npm run lint`
- `npm run build`
- Manual `/dinnerdecider → /fetch → /randomize → /output` reroll sweep (5+ passes, unique results logged)

---

## Version 7.1.2 — 2025-10-20
**Phase:** 8.7 — UX & Stability Polish ✅
**Developer:** GitHub Copilot
**Reviewer:** Technical Product Owner (Q. S. Carter)

---

### 🧱 Summary
- Resolved FiltersGrid synchronization loops so Don’t Care toggles cleanly enable/disable across all layers without rehydration churn.
- Added a dedicated dismiss control for the premium conversion banner, persisting `premiumBannerDismissed` in localStorage and keeping “Let’s Eat” accessible.
- Deferred the weather summary until client hydration to eliminate mismatch warnings while preserving the live OpenWeather signal.

### 🧪 Verification
- `npm run lint`
- `npm run build`
- Manual toggle + banner dismissal checks in `/dinnerdecider`

---

## Version 7.1.1 — 2025-10-20
**Phase:** Pre-Phase 9 Verification — Port Standardization
**Developer:** GitHub Copilot
**Reviewer:** Technical Product Owner (Q. S. Carter)

---

### 🧱 Summary
- Standardized all local workflows on `http://localhost:3003` to align with upcoming Phase 9 multi-app orchestration.
- Updated npm scripts (`dev`, `start`, `build`, `lint`) and `.env.local` to enforce the new port while keeping CI behaviour unchanged.
- Documented the port migration in `README_DEV.md` and noted the deprecation of the legacy `:3000` default.

### 🧪 Verification
- `npm run lint`
- `npm run build`

---

## Version 7.1.0 — 2025-10-19
**Phase:** 7.1 — Context Signals & Don’t Care QA
**Developer:** GitHub Copilot (Phase 7/8.5 continuation)
**Reviewer:** Technical Product Owner (Q. S. Carter)

---

### 🧱 Summary
Adds time-aware dining context, completes “Don’t Care” fallback logic, and wires weather/preferences/OpenAI APIs so AI and Places pulls share the same signal stack.

### 🧩 Files Added / Updated
- Added `src/utils/timeContext.js` for reusable time category detection.
- Added API routes: `src/app/api/weather/route.js`, `src/app/api/preferences/route.js`, `src/app/api/openai/suggest/route.js`.
- Updated context (`src/context/DinnerContext.jsx`) to persist mood/weather/prefs/time signals and emit analytics.
- Updated fetchers/UI (`src/lib/fetchNearbyRestaurants.js`, `src/lib/aiRecommender.js`, dashboard/fetch/randomize/output pages) to pass mood/weather/prefs/time + weatherHint into Google Places and AI suggestions.
- Hardened `src/components/FiltersGrid.jsx` Don’t Care behaviour and analytics edge cases.
- Documented env/config needs in `.env.local.example`, `README_DEV.md`, and bumped `package.json` with Supabase client.

### 🔧 Core Changes
1. Time context engine logs `time_category_detected`, transitions after 30 min, and pushes time-based boosts into AI/Places keyword generation.
2. Weather route caches OpenWeather payloads for 30 min and returns `bucket`, `weatherHint`, and temperature metrics for downstream use.
3. Preferences route reads/writes Supabase `user_prefs`, while OpenAI suggest route caches responses and falls back to local heuristics when the API/key fails.
4. Fetch pipelines consolidate signals (`mood`, `weatherHint`, `timeCategory`, Supabase prefs) for both randomize and output views, with contextual headlines visible to the user.
5. Don’t Care toggles auto-reactivate when no chips stay selected and enforce new analytics taps for QA.

### 🧪 Verification
- Local fetch and randomize flows exercised via `/dinnerdecider → /fetch → /randomize → /output` with mood/weather/time variations.
- Weather API manually hit with `lat=30.33&lng=-81.65` to confirm caching + hint output.
- Preferences POST tested against Supabase dev project (manual cURL) to ensure upsert structure.
- OpenAI suggest route verified with and without `OPENAI_API_KEY`, confirming JSON contract & caching.

### 🔜 Next
- Provision Supabase `user_prefs` table in all environments and secure RLS for `auth.uid` parity.
- Wire preferences form in `profile/page.js` to POST to `/api/preferences`.
- Expand unit coverage around `getTimeCategory` edge hours and Don’t Care reroll handling.

---

## Version 7.0.0 — 2025-10-19
**Phase:** 7.0 — Developer Onboarding & CI Baseline
**Developer:** Incoming Dev Agent
**Reviewer:** Technical Product Owner (Q. S. Carter)

---

### 🧱 Summary
Sets up cross-platform consistency, adds a minimal CI pipeline for lint/build, and expands Windows-specific developer onboarding docs.

---

### 🧩 Files Added / Updated
- Added `.gitattributes` to normalize line endings (LF) across JS/TS, config, and markdown while keeping PowerShell scripts CRLF-friendly.
- Added `.github/workflows/ci.yml` to run `npm ci`/`npm i`, `npm run lint`, and `npm run build` on push/PR to `main`.
- Updated `README_DEV.md` with a detailed “Run Locally (Windows)” section covering prerequisites, quality checks, and troubleshooting.
- Polished `DEV_HANDOFF_README.md` copy for clarity and consistent formatting.

---

### 🧪 Verification
Local dev boot: PASS (via `npm run dev`)
Lint: PASS (ESLint 9)
Build: PASS (Next.js 15, Turbopack)

---

### 🔜 Next
- Phase 7 features: Google Maps Autocomplete, Friend Invite Flow, Weather/Mood-based suggestions.
- Optional: add Prettier config, TypeScript setup, and Playwright smoke tests.

---

## Version 6.1.0 — 2025-10-18
**Phase:** 6.1 — Closed Venue & Dedup Enhancements, Visual Refinements, Banner Controls
**Developer:** Lead Dev Agent
**Reviewer:** Technical Product Owner (Q. S. Carter)

---

### 🧱 Summary
Phase 6.1 delivers R2 closed-venue filtering and unique-restaurant rotation, R1 layer card visuals with clear grouping and improved button placement, and dismiss controls for banners with persistence.

---

### 🧩 Files Updated
- `src/lib/fetchNearbyRestaurants.js`
- `src/app/dinnerdecider/output/page.js`
- `src/app/dinnerdecider/randomize/page.js`
- `src/components/BetaBanner.jsx`
- `src/components/ConversionBanner.jsx`

---

### 🔧 Core Changes
1. `src/lib/fetchNearbyRestaurants.js`
	- Added `place_id` to mapped results.
	- Enforced `business_status === "OPERATIONAL"` and `opening_hours.open_now === true`.
	- Deduplicated results by `place_id` (fallback `${name}|${address}`).
	- Kept ≥ 4.0 rating and excluded bars/night_clubs and food trucks; added debug logs.

2. `src/app/dinnerdecider/output/page.js`
	- Client-side filters re-check open_now and OPERATIONAL when present.
	- Unique rotation without repeats using a seen set; resets after full pass.
	- Preserved animation timings and analytics calls; added more debug logs.

3. `src/app/dinnerdecider/randomize/page.js`
	- Rebuilt R1 layer visuals as labeled cards (Region, Experience, Specialized, Distance).
	- Positioned action buttons directly beneath the cards.
	- Maintained Framer Motion timings and free-tier caps.

4. `src/components/BetaBanner.jsx`
	- Added dismiss “X” with localStorage persistence (`dd_beta_banner_dismissed`).
	- Tracked `launch_banner_seen` and `launch_banner_dismissed`.

5. `src/components/ConversionBanner.jsx`
	- Added Close with localStorage persistence (`dd_conv_banner_dismissed`).
	- Tracked `conversion_banner_shown`, `conversion_banner_seen`, and `conversion_banner_dismissed`.

---

### 🧠 Functional Updates
- ✅ Eliminated duplicate restaurants across R2 rerolls until exhaustion.
- ✅ Removed closed venues; only show OPERATIONAL and open now.
- ✅ Improved readability of R1 combo layers and repositioned buttons.
- ✅ Added persistent dismiss controls to banners.
- 🚫 None deprecated.
- ⚙️ No new env vars.

---

### 🧪 Verification & QA
**Local Run Steps**
```bash
npm install
npm run dev
```

**Test Flow**
`/dinnerdecider → /fetch → /randomize → /output`

**Validated:**

* [x] API Keys Loaded
* [x] No duplicate restaurants
* [x] No closed venues
* [x] Animations render cleanly
* [x] Header navigation routes properly
* [x] Banner dismiss persists

---

### 🧩 Debug / Console Logs Added

* 🌀 R1 Combo Generated
* 🎯 R2 Filter Applied
* ✅ Filtered N/M
* 🚫 Excluded (reason)
* 🧭 Feedback received → updated weight map
* 💎 Payment successful

---

### 📊 Analytics Events Confirmed

| Event                         | Description                      | Verified |
| ----------------------------- | -------------------------------- | -------- |
| `ai_auto_pick_triggered`      | Premium Auto Pick button clicked | ✅        |
| `conversion_banner_dismissed` | User closed upgrade banner       | ✅        |
| `launch_banner_dismissed`     | User closed Beta banner          | ✅        |

---

### 🔒 Security & Env

* `.env.local` unchanged and ignored in Git.
* Confirmed no hard-coded keys or credentials.
* Google Places key domain restricted.

---

### 🚀 Deployment

* [x] Local Dev PASS
* [x] Lint / Typecheck PASS
* [x] Build PASS
* [ ] Preview on Vercel ✅
* [ ] Tag and push to `feature/phase-6.1-r2-filters`

---

### 📘 Notes for Next Developer

Consider adding a (rate-aware) Place Details follow-up to validate open-hours coverage beyond `open_now` for “open 1+ hour” logic. If Places API rate limits become a concern, cache selected details or open-hours lookups in Supabase.
