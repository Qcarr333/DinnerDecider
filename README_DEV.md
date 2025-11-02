# 🍽️ DinnerDecider Developer Handbook

---

## 📦 Project Overview
DinnerDecider is a Next.js 15 (App Router) + Supabase + Stripe + Google Places + OpenAI project.  
It helps users decide what and where to eat using randomized and AI-guided restaurant selections.

---

## 🧱 Tech Stack
| Layer | Technology |
|-------|-------------|
| Frontend | React (Next.js 15 App Router) |
| Styling | Tailwind CSS + Framer Motion |
| Backend APIs | Supabase (planned), Google Places |
| Payments | Stripe (mock → live in Phase 9) |
| Hosting | Vercel |
| Analytics | Vercel Analytics + local dd_events |
| QA | Playwright + Lighthouse CI (Phase 13) |

---

## 🧩 Folder Structure
````

/src
├── app/
│    ├── dinnerdecider/
│    │    ├── page.js (dashboard)
│    │    ├── fetch/page.js
│    │    ├── randomize/page.js
│    │    ├── output/page.js
│    │    ├── refer/page.js
│    │    ├── upgrade/page.js
│    │    └── profile/page.js
│    ├── admin/analytics/page.js
│    └── landing/page.js
├── components/
│    ├── Header.jsx
│    ├── BetaBanner.jsx
│    ├── ConversionBanner.jsx
│    └── FiltersGrid.jsx
├── lib/
│    ├── fetchNearbyRestaurants.js
│    ├── aiRecommender.js
│    ├── payments.js
│    ├── referrals.js
│    ├── notifications.js
│    ├── track.js
│    └── analyticsDashboard.js
├── context/
│    └── DinnerContext.jsx
└── public/
├── og-dinnerdecider.jpg
└── press-kit/

````

---

## ⚙️ Local Setup
1. Clone the repository:
   ```powershell
   git clone https://github.com/Qcarr333/DinnerDecider.git
   cd DinnerDecider
   npm install
   npm run dev
   ```
   The development server now defaults to http://localhost:3003.

2. Create `.env.local` in the root directory:

   ```
   NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_key
   NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
   NEXT_PUBLIC_BUTTONDOWN_TOKEN=...
   NEXT_PUBLIC_SITE_URL=http://localhost:3003
   NEXT_PUBLIC_DEV_ORIGIN=http://localhost:3003
   OPENAI_API_KEY=sk-...
   OPENWEATHER_API_KEY=...
   SUPABASE_URL=https://xyz.supabase.co
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=... # optional for local writes
   # Optional flags
   NEXT_PUBLIC_BETA_MODE=true
   NEXT_PUBLIC_LAUNCH_DATE=2025-10-19
   NEXT_PUBLIC_LAUNCH_CHANNELS=twitter,producthunt
   ```
3. Add any new keys to **Vercel Project Settings → Environment Variables**.
4. Never commit `.env.local`.

---

## 🔁 Development Workflow

1. Always create feature branches:

   ```
   git checkout -b feature/<short-description>
   ```
2. After completing work:

   * Update CHANGELOG.md
   * Commit and push
   * Open PR for review (or Vercel deploy preview)
3. Once merged → Vercel auto-deploys.

---

## 🪟 Run Locally (Windows)

Tested on Windows PowerShell 5.1 and Windows Terminal. All commands below assume PowerShell as the shell.

1. Confirm prerequisites:

   ```powershell
   node -v   # Expect >= 20.x
   npm -v
   ```

   If Node.js is missing or outdated, install the latest LTS from https://nodejs.org.

2. Install dependencies and start the dev server:

   ```powershell
   npm install
   npm run dev
   ```

3. Open the app:

   http://localhost:3003 (port 3000 deprecated)

4. Verify key routes:

   - /dinnerdecider
   - /dinnerdecider/fetch
   - /dinnerdecider/randomize
   - /dinnerdecider/output

5. Create `.env.local` at the project root with your own keys. This file is ignored by Git and must never be committed.

6. Optional quality checks before committing:

   ```powershell
   npm run lint
   npm run build
   ```

7. Common troubleshooting:

   - Git line endings: `.gitattributes` forces LF in the repo while keeping PowerShell `.ps1` scripts as CRLF. If warnings persist, run `git config core.autocrlf false` (repo scope).
   - Port already in use: close other dev servers or run `$env:PORT=3004; npm run dev` in the same PowerShell session (defaults to 3003).
   - Missing keys: ensure `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` is set; the Places fetch will fail without it.
   - Slow install: if npm is slow on first run, try `npm ci` on CI and `npm cache verify` locally if needed.

---

## 🔒 Security Rules

* Never expose API keys or secrets in code.
* Limit Google Places API by referrer (`*.dinnerdecider.app`).
* Supabase policies must enforce `auth.uid` checks.
* Rotate keys monthly via Vercel or GitHub Secrets.

---

## 🧠 Phase 7 Contextual Intelligence Setup
- **API routes**: `/api/weather` (OpenWeather pull + 30 min cache), `/api/preferences` (Supabase `user_prefs` upsert), `/api/openai/suggest` (OpenAI + local fallback JSON response).
- **Environment**: set `OPENAI_API_KEY`, `OPENWEATHER_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (optionally `SUPABASE_SERVICE_ROLE_KEY` for writes) alongside existing public keys.
- **Time context**: `getTimeCategory()` in `src/utils/timeContext.js` powers mood/weather/time blending and logs `time_category_*` analytics on transitions.
- **Weather hinting**: API returns `{ bucket, condition, weatherHint, temperatureC/F }` and is cached per lat/lng in-memory for 30 minutes.
- **Preferences table**: ensure Supabase has
   ```sql
   create table if not exists user_prefs (
      id uuid primary key default uuid_generate_v4(),
      user_id uuid references auth.users(id) on delete cascade,
      likes text[],
      dislikes text[],
      updated_at timestamp default now()
   );
   ```
- **Analytics taps**: new events `time_category_detected`, `time_context_applied`, `brunch_mode_triggered`, `late_night_mode_triggered`, and `ai_suggestion_generated` fuel the admin dashboard.

> ✅ Phase 7/8.5 backlog validated — CI PASS (2025-10-19)

---

## 🧠 Key Flows

| Flow          | Description                                                     |
| ------------- | --------------------------------------------------------------- |
| R1 Randomizer | Generates combo (Region → Experience → Specialized → Distance). |
| R2 Fetch      | Calls Google Places API using combo keyword & radius; hydrates rotation queue for session dedupe. |
| Filter        | Excludes non-operational, <4★, bars/clubs, duplicates; respects Don’t Care wildcards. |
| Feedback      | Saves 👍/👎 signals to localStorage (weights).                  |
| Auto Pick     | Premium feature uses AI recommender (mood, weather, history).   |

---

## 🧩 Testing

**Manual QA Path:**
`/dinnerdecider → /fetch → /randomize → /output`

**Automated QA (Phase 13):**

* `npm i playwright @axe-core/playwright`
* Run smoke suite:

  ```bash
  npx playwright test
  ```

**Accessibility QA:**

* `npx lighthouse http://localhost:3003/dinnerdecider --view`

---

## 📊 Debug & Logs

Console logs are semantic:

```
🌀 R1 Combo Generated
🧭 Active Filters → { region: { mode: 'custom', values: [...] }, ... }
🔑 Applied Keywords → italian brunch cozy
📏 Radius → { radius: 8000, source: 'combo' }
🎯 R2 Filter Applied: { summaryLabels: {...}, comboFilters: {...} }
🍽️ R2 Restaurants Returned: [ 'Bella Vita Italian Bistro', ... ]
🏷️ R2 returnedPlaceIDs → [ 'mock-italian-1', ... ]
R2 Dedup: { shown: 2, remaining: 3 }
```

### Live API Debugging (Phase 8.9)
- `🌐 [API CALL]` / `📦 [API RESPONSE]` emit in the server console for Google Places, including keyword, radius, and returned venue names.
- `/api/places` now proxies Places traffic server-side (bypasses browser CORS). Client requests POST `{ lat, lng, filters, selectedCombo, signals }` and the server logs full metadata.
- `🌦️ [API CALL]` / `🌈 [API RESPONSE]` wrap OpenWeather requests with latency metrics (`durationMs`) for validation.
- Weather API responses include `durationMs`; cached hits surface `cached: true` earlier in the handler for easy diffing.
- Set `NEXT_PUBLIC_DEV_ORIGIN` if you need to allow a non-default localhost origin for testing external viewers.

---

## 🧭 Product Phases (Summary)

1–6 → Core architecture, design, monetization.
7 → AI refinement (mood/weather/prefs).
8 → Group & viral expansion.
9 → Monetization 2.0 + Stripe live.
10 → PWA + performance polish.
11 → UI delight & dark mode.
12 → Continuous learning.
13 → QA + accessibility.
14 → Public launch.

---

## 🪪 Credits

**Product Owner:** Q. S. Carter  
**Lead Developer (AI):** [AI Agent or GitHub Copilot Chat]  
**Repository:** [https://github.com/Qcarr333/DinnerDecider](https://github.com/Qcarr333/DinnerDecider)  
**Hosting:** [https://dinnerdecider.app](https://dinnerdecider.app) (Vercel)
