# Phase 9 Full Roadmap

_Last updated: 2025-11-23_

## Snapshot
- **Focus:** Realtime Supabase sync, group experience polish, and beta deployment readiness.
- **Environment:** Next.js 15 App Router + Supabase (auth, realtime, analytics) + Vercel.
- **Branch:** `phase-9-group-up-w-pr` (synced to `main`).
- **Recent checks:** `npm run lint` ✅ · `npm run build` ✅.
- **Deployment:** Vercel beta environment live with synced `.env.local` variables (2025-11-21 confirmation).

## Status Summary

### To be developed
- Marketing subscription CTA: create `src/app/dinnerdecider/subscribe/page.js` and guard it with `subscribeEnabled` in `src/lib/launchFlags.js`; reuse Buttondown submission flow from `src/app/dinnerdecider/launch/page.js`.

### In development
- Telemetry emitters: connect `src/lib/track.js` events (`group_finalize`, reroll, errors) to `src/app/api/session-metrics/route.js` so Supabase `session_metrics` (see `supabase/phase9_schema.sql`) captures realtime analytics.
- Supabase RLS validation: run privilege checks against `src/app/admin/analytics/page.js` and document adjustments in `docs/Phase_9/P9_Revised_Supabase_Schema.md`.

### Backlog
- Stripe live checkout flow: `src/lib/payments.js` and `src/app/dinnerdecider/upgrade/page.js` stay mocked until finance approves production keys and webhooks.
- R2 keyword blending opt-out: certain combos (e.g., Italian → Fine dining) inherit "steakhouse seafood" dinner keywords in `src/lib/fetchNearbyRestaurants.js`, yielding mismatched cuisines—see `docs/Phase_9/P9_Testing.md` (Run 3) for reproduction notes. The 2025-11-21 boolean normalization ensures fallback anchors only activate when `specialModeEnabled === true`, but UX still needs an explicit opt-out design.
- Host-configurable group timer: surface a per-session round-duration control (default 5 minutes) so the host can extend/shorten voting windows without code changes.

### Tabled
- Referral incentive refresh: defer updates to `src/lib/referrals.js` and `src/app/dinnerdecider/refer/page.js` pending marketing offer matrix (target Phase 10).

- Group session countdown guard: continue two-client verification for `src/app/dinnerdecider/group/[code]/page.js` (round resets + `autoFinalizeRef` + `timerExpired` prompt) with persistence through `/api/group-session/state/route.js`; log captures via `scripts/captureTestLog.ps1`.
- Latest regression logs (`docs/Phase_9/logs/2025-11-20_094229_test3_auth_flow.log`, `docs/Phase_9/logs/2025-11-20_195045_test3_auth_flow.log`) confirm hydration is fixed and timer expiry no longer auto-finalizes; retain for reference.
- Fresh QA run (`docs/Phase_9/logs/2025-11-21_135629_test4_group_party.log`) confirms group creation/join/share flows now QA-pass on anonymous browsers. Latest code patch (2025-11-21) relaxes shortlist ownership handoff and shifts voting to a per-participant ledger; rerun capture to verify guest rounds propagate and likes no longer auto-finalize before updating `docs/Phase_9/P9_Testing.md` with outcomes.
- Evening rerun (`docs/Phase_9/logs/2025-11-21_171811_test4_group_party.log`) after clearing stray background processes shows shortlist overrides and per-client vote isolation persist; use next QA run to confirm ledger hydration fixes and shortlist merge adjustments.
- Late-night rerun (`docs/Phase_9/logs/2025-11-21_201349_test4_group_party.log`) confirms timer expiry hits ~90s under load, guest rerolls still overwrite host votes, and Places keywords respect the special-mode toggle status; retest now that rounds last five minutes.
- 2025-11-23 plan-ahead variation (`docs/Phase_9/logs/2025-11-23_055908_test4_group_party.log`) highlights zero-result Burger filters in Edge privacy and timezone API 502s; document browser limitations and broaden filters when the shortlist collapses.
- 2025-11-23 dual-browser retest (`docs/Phase_9/logs/2025-11-23_073626_test4_group_party.log`) shows guest rerolls appended without wiping host picks but host hydration is still one-directional until a rename kicks off a broadcast; duplicate `Trader Joe's` keys persist.
- R2 keyword blending anomaly (Italian/Mexican pulling steakhouse terms) remains under investigation; backlog entry active until opt-in/out mechanism is defined.

### Complete (awaiting testing confirmation)
- Vercel beta deployment checklist: `.env` sync and analytics toggles in `vercel.json` / `next.config.mjs` complete with environment live as of 2025-11-21; capture `/`, `/dinnerdecider/randomize`, `/dinnerdecider/group/[code]` smoke test logs against the beta URL and append to `docs/Phase_9/P9_Testing.md` for final confirmation.

### Complete with signoff
- Supabase auth + profile overhaul (`src/app/dinnerdecider/login/page.js`, `src/app/dinnerdecider/profile/page.js`, `supabase/scripts/seedUsers.mjs`) signed off in `docs/Phase_9/logs/2025-11-19_214442_test3_auth_flow.log`.
- Plan Ahead overrides and Drinks vibe filtering (`src/app/dinnerdecider/plan/page.js`, `src/context/DinnerContext.jsx`, `src/lib/fetchNearbyRestaurants.js`) approved per `docs/Phase_9/logs/2025-11-18_215117_test2_plan_ahead_retake.log`.

## Outstanding Actions
1. Finish telemetry wiring (`src/lib/track.js` → `src/app/api/session-metrics/route.js`) and push inserts into `session_metrics` for rerolls and votes.
2. Execute RLS audit for admin analytics queries and note results in `docs/Phase_9/P9_Revised_Supabase_Schema.md`.
3. Capture beta smoke tests for `/`, `/dinnerdecider/randomize`, `/dinnerdecider/group/[code]` and attach logs to `docs/Phase_9/P9_Testing.md`.
4. Stand up `/dinnerdecider/subscribe` landing page using launch flag gating and route traffic through Buttondown.

## Recent Progress Log
| Date | Item | Outcome |
| :--- | :--- | :------ |
| 2025-11-16 | Cleaned git history (removed `.next`, `node_modules`, `.env.local`); promoted branch to `main`. | ✅ Completed |
| 2025-11-16 | Updated `src/data/foodTypes.js` (African → Puerto Rican). | ✅ Completed |
| 2025-11-16 | Sanitized `.env.local.example` and documented Vercel beta deployment steps in `README_DEV.md`. | ✅ Completed |
| 2025-11-16 | Verified lint/build pipeline prior to branch promotion. | ✅ Completed |
| 2025-11-18 | Implemented Supabase auth screens (`/dinnerdecider/login`) and rebuilt profile dashboard around Supabase profiles. | ✅ Completed |
| 2025-11-21 | Confirmed Vercel beta environment live with synced env vars; captured latest group QA log for voting fixes. | 🚧 In progress |
| 2025-11-21 | Added dashboard special-dinner toggle with persisted context state and fetch signal wiring. | ✅ Completed |
| 2025-11-21 | Killed stray background shells ahead of QA capture; normalized `specialModeEnabled` handling so fallback anchors respect the toggle. | ✅ Completed |
| 2025-11-22 | Captured late-night dual-browser QA with console logs; documented timer expiry behaviour and toggle impact. | 🚧 In progress |
| 2025-11-22 | Extended group round timer to five minutes via `DEFAULT_ROUND_DURATION_SECONDS`; queued host-configurable timer UX. | ✅ Completed |
| 2025-11-23 | Logged Test4 Group Party reruns (plan-ahead variation + retest); guest shortlist still fails to reach host, Plan Ahead current-location now passes in Chrome incognito but Edge privacy remains flaky. | 🚧 In progress |

## Testing & QA Tracking
- **Automated:** `npm run lint`, `npm run build` (last run 2025-11-16) – both passed.
- **Manual smoke tests:** Pending → `/`, `/dinnerdecider/randomize`, `/dinnerdecider/group/[code]`, `/dinnerdecider/launch`; log results under `docs/Phase_9/logs/`.
- **Realtime QA:** Pending verification of the round reset fix; run two-browser session and document in `docs/Phase_9/logs/`.

## Deployment Checklist (Beta)
- [ ] Add Vercel project note: "Phase 9 Beta Build — Supabase Group Voting Sync Live".
- [x] Populate environment variables (prod + preview) from local `.env.local`.
- [ ] Confirm Supabase service role keys stored only in Vercel environment.
- [x] Trigger manual deploy of `main`; monitor build logs.
- [ ] Validate OpenAI and Google Maps integrations via Vercel deployment.

## Risks & Watchlist
- **Realtime race conditions:** Vote tally overwrites remain possible until merge logic is finalized.
- **Auth / RLS gaps:** Profiles dashboard depends on correct role policies; blockage could delay analytics rollout.
- **External API limits:** Expanded Places queries (bars/cafes) may increase quota usage; monitor once changes ship.

## Next Checkpoints
- Revisit telemetry wiring and RLS audit outcomes next working session.
- Schedule Vercel beta smoke run post-env sync and publish results to `docs/Phase_9/P9_Testing.md`.
- Draft realtime QA checklist referencing `src/app/dinnerdecider/group/[code]/page.js` steps and capture logs in `docs/Phase_9/logs/`.
