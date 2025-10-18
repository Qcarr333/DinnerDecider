# 🧾 DinnerDecider — CHANGELOG

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
