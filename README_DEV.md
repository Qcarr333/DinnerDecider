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
│    ├── ConversionBanner.jsx
│    └── ConversionBanner.jsx
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
   ```bash
   git clone https://github.com/Qcarr333/DinnerDecider.git
   cd DinnerDecider
   npm install
   npm run dev
   ```

2. Create `.env.local` in the root directory:

   ```
   NEXT_PUBLIC_GOOGLE_API_KEY=your_key
   NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
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

## 🔒 Security Rules

* Never expose API keys or secrets in code.
* Limit Google Places API by referrer (`*.dinnerdecider.app`).
* Supabase policies must enforce `auth.uid` checks.
* Rotate keys monthly via Vercel or GitHub Secrets.

---

## 🧠 Key Flows

| Flow          | Description                                                     |
| ------------- | --------------------------------------------------------------- |
| R1 Randomizer | Generates combo (Region → Experience → Specialized → Distance). |
| R2 Fetch      | Calls Google Places API using combo keyword & radius.           |
| Filter        | Excludes non-operational, <4★, bars/clubs, duplicates.          |
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

* `npx lighthouse http://localhost:3000/dinnerdecider --view`

---

## 📊 Debug & Logs

Console logs are semantic:

```
🌀 R1 Combo Generated
🎯 R2 Filter Applied
✅ Filtered 15/23
🚫 Excluded: bar/night_club
🍽️ R2 Restaurants Returned
```

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
