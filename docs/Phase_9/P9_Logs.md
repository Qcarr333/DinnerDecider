# Phase 9 Activity Log

## 2025-11-16 18:08
- Captured next actions for Phase 9: resolve group vote merge logic and presence tracking.
- Plan profile linking & RLS review for dashboard integration.
- Queue Vercel beta deployment tasks (env sync, manual deploy, smoke tests).

## 2025-11-17 22:51
- Supabase instance reactivated after idle pause; ready for realtime/profile work.
- Supabase schema copied into `docs/Phase_9/P9_Supabase_Schema.md` for reference.
- Vercel beta deployment checklist item closed after manual deploy completion.

## 2025-11-17 23:48
- Built Plan Ahead flow: new `/dinnerdecider/plan` tab, Supabase-friendly overrides in context, and plan-aware fetch logic (skips open-now gating).
- Added Google Places helpers for manual place lookup (autocomplete, details, timezone) and surfaced Plan Ahead state across dashboard/header/output.
- Expanded Places query filters for cafes/desserts and introduced Drinks vibe toggle with bar-only fetch mode.

## 2025-11-18 01:42
- Shipped `/dinnerdecider/login` with Supabase email/password signup, opt-in notifications, and user agreement summary.
- Modernized header/profile navigation to surface auth state and sign-out button.
- Rebuilt `/dinnerdecider/profile` around Supabase profiles: notification form, membership placeholders, Plan Ahead snapshot, and saved restaurant list.

## 2025-11-18 10:05
- Populated `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` to re-enable Supabase auth locally ahead of QA.
- Confirmed Supabase browser client now initializes in `DinnerContext` (tracked via `supabaseConfigured` state) for login/profile flows.

## 2025-11-19 09:12
- Added `supabase/scripts/seedUsers.mjs` and `npm run seed:users` helper for provisioning test accounts (`u001`-`u005`, `p001`-`p003`, etc.).
- Script auto-upserts `profiles` rows with tier metadata and updates auth user metadata for QA cohorts.

## 2025-11-19 11:47
- Ran `npm run seed:users`; verified Supabase `auth.users` + `profiles` populated (see docs/Seed_users/Table_With_users.png + `_rows.png`).
- Captured revised schema snapshot in `docs/Phase_9/P9_Revised_Supabase_Schema.md` for handoff reference.

## 2025-11-19 21:45
- Supabase auth QA re-run with seeded accounts: login/signup, profile sync, and premium indicator all confirmed ✅ (see `docs/Phase_9/logs/2025-11-19_214442_test3_auth_flow.log`).
- Vercel beta project updated: pulled latest `main`, synced `.env.local` vars, and verified live deploy in beta environment.
- Group session realtime smoke test (two anonymous browsers) shows presence + plan flow sync working; voting still auto-declares winner on first like → flagged for follow-up fix.

## 2025-11-20 09:30
- Implemented round guard for group sessions (`src/app/dinnerdecider/group/[code]/page.js` roundId + `autoFinalizeRef`) and coordinated persistence via `/api/group-session/state/route.js`; scheduled regression test capture in `docs/Phase_9/logs/`.
- Added hydration-safe session bootstrap (`createEmptySession` + `loadSession` guard) to `src/app/dinnerdecider/group/[code]/page.js` after QA surfaced a mismatch when shortlist data loads from `localStorage` mid-render.
- Catalogued Phase 9 status matrix: telemetry wiring (`src/lib/track.js` → `src/app/api/session-metrics/route.js`) marked In Development; `/dinnerdecider/subscribe` landing page flagged To Be Developed with launch flag in `src/lib/launchFlags.js`.
- Documented backlog/tabled items (Stripe live checkout in `src/lib/payments.js`, referral refresh in `src/lib/referrals.js`) and signoff items (Plan Ahead + Supabase auth) across `DEV_HANDOFF_README.md` and `P9_Full_Roadmap.md` for downstream handoff.

## 2025-11-20 19:50
- Captured follow-up two-browser QA run (`docs/Phase_9/logs/2025-11-20_195045_test3_auth_flow.log`) to validate the hydration fix and reassess group voting.
- Hydration warning no longer appears, confirming the `createEmptySession` + deferred `loadSession` change in `src/app/dinnerdecider/group/[code]/page.js`.
- First shortlist sync succeeds, but second fetch returns zero results—investigate filter construction in `src/lib/fetchNearbyRestaurants.js` and group-session persistence in `/api/group-session/state/route.js`.
- Voting still finalizes on the first "Like"; plan to adjust `handleVote` / realtime broadcasts so winners require explicit "Finalize votes" or consensus logic.

## 2025-11-20 22:15
- Removed automatic finalize-on-timer in `src/app/dinnerdecider/group/[code]/page.js`; timer expiry now broadcasts a `timer_expired` event and shows a prompt while keeping votes open until someone clicks "Finalize".
- Added `timerExpired` warnings and broadcast handling so all clients share the expired state without forcing a winner; manual finalize resets the warning.
- Next step: rerun two-browser QA to confirm winners no longer lock after the first like and to observe second-round shortlist propagation.

## 2025-11-20 22:40
- Logged Test4 Group Party run (`docs/Phase_9/logs/2025-11-20_201452_test4_group_party.log`): timer banner works, but cross-client vote visibility is inconsistent and the chosen winner may ignore aggregate scores.
- Observed that the guest’s second shortlist never reaches the host; investigate version gating in `broadcast("state")` handling and ownership checks in `applyShortlist`.
- Noted R2 keyword blending anomaly (Italian/Fine Dining and Mexican combos inherit “steakhouse…” keywords); added to backlog for opt-in/out design.

## 2025-11-21 09:15
- Relaxed shortlist ownership guard in `src/app/dinnerdecider/group/[code]/page.js`; non-owners can take over after 15s of inactivity, ensuring new rounds propagate.
- Updated realtime vote/state merges to accept equal-version updates so simultaneous likes don't get dropped. Expect cross-client vote totals to stay aligned in the next QA run.

## 2025-11-21 13:56
- Vercel beta deployment confirmed live with synced `.env.local` variables; main branch matches the beta environment configuration.
- Ran follow-up two-browser QA capture (`docs/Phase_9/logs/2025-11-21_135629_test4_group_party.log`) now that Supabase realtime is stable. Group creation, invite, rename, and first shortlist sync all pass across both anonymous browsers.
- Guest-generated shortlists still fail to appear for the host on subsequent rounds, and "Don't care" selections can return zero results; investigate `applyShortlist` ownership handoff and Places query defaults.
- Voting regression persists: any "Like" immediately finalizes the winner locally, so aggregate votes never surface—`handleVote` merge/broadcast remains the top fix before QA signoff.

## 2025-11-21 16:05
- Reworked group shortlist takeover to allow immediate ownership when a participant produces a fresh restaurant list; guard still enforces 15s inactivity if the list is unchanged.
- Added per-participant vote ledgering with realtime merge guards so likes/passes aggregate across browsers without auto-finalizing. Broadcast payloads now carry participant scores instead of overwriting totals.
- Normalized session snapshots (localStorage + Supabase state) to hydrate ledger/vote data consistently and prevent stale winner flashes.

## 2025-11-21 18:05
- Audited running processes with `Get-Process` and stopped lingering `powershell` instances (IDs 23932, 14812) to eliminate background noise before QA capture.
- Confirmed only the active VS Code shell remains so log timestamps align with test actions.

## 2025-11-21 18:28
- Introduced the “Special Dinner” toggle on the dashboard (`src/app/dinnerdecider/page.js`) and surfaced persistence via `DinnerContext` (`specialModeEnabled`).
- Propagated the flag through `/dinnerdecider/fetch` signals so Places queries can opt into premium keyword anchors when users enable the mode.

## 2025-11-21 18:42
- Normalized the `specialModeEnabled` signal in `src/lib/fetchNearbyRestaurants.js` so only explicit true values enable fallback anchors.
- Oracle fallback metadata now records the toggle accurately; reroll logging confirms “steakhouse/chef table” anchors stay disabled when the toggle is off.

## 2025-11-22 00:15
- Replayed group QA (log: `docs/Phase_9/logs/2025-11-21_201349_test4_group_party.log`) while capturing per-browser console output.
- Confirmed Places keyword assembly respects the “Special Dinner” toggle and that timer expiry hits ~90s; flagged need for longer rounds and host-configurable duration.

## 2025-11-22 00:32
- Increased group round duration to five minutes by introducing `DEFAULT_ROUND_DURATION_SECONDS` in `src/app/dinnerdecider/group/[code]/page.js` and resetting timers with the new constant.
- Documented follow-up to make the timer host-configurable in future iterations.

## 2025-11-23 06:53
- Captured log `docs/Phase_9/logs/2025-11-23_055908_test4_group_party.log` while running the plan-ahead variation (Jacksonville + Burger filter) across Edge privacy and Chrome incognito.
- Guest flow hit “No restaurants found” after Randomize, confirming the specialized Burger filter still collapses to zero results under privacy-mode coordinates.
- Plan Ahead “Use current location” returned a `/api/places/timezone` 502 in Edge privacy; captured screenshot (`Plan_Ahead_Current_Location.png`) for reference and flagged browser-permission caveat in the testing ledger.
- Noted that “Nearby” distance surfaced out-of-radius restaurants in Edge; will retest in non-private browsers before adjusting fetch radius logic.

## 2025-11-23 07:36
- Logged `docs/Phase_9/logs/2025-11-23_073626_test4_group_party.log` for the follow-up dual-browser run without Plan Ahead enabled.
- Guest reroll appended to their board without wiping host picks, but the host still failed to receive the guest shortlist until a rename event fired; Supabase now shows two session rows rather than duplicating every broadcast.
- React continues to warn about duplicate `Trader Joe's` keys—dedupe guard remains pending.
- Chrome incognito confirmed the Plan Ahead “Use current location” path now succeeds with browser timezone fallback; Edge privacy discrepancy documented for future QA.

