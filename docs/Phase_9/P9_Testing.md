### 2025-11-21 – Group Session QA (Test4 Group Party, late-night re-run)

- **Log:** `docs/Phase_9/logs/2025-11-21_201349_test4_group_party.log`
- **Participants:** Two private browser sessions (Edge + Chrome in incognito), both anonymous.
- **Status:**
  - QA Pass — invite and rename flow, presence list, and first shortlist broadcast remain stable.
  - Partial ✅ — live voting reflects local likes/passes, but guest rerolls still displace the host’s shortlist and ledger.
  - ❌ — timer banner triggers around 90s, showing “Timer expired…” while both testers are mid-vote; finalize continues to pick the highest *local* score (no merged tally).
  - ❌ — guest shortlist takes ownership when their flow completes, wiping host votes (see `Group_Likes12.png`).
- **Key Signals & Consoles:**
  - Timer logs show repeated `group_broadcast_timer_expired` events at ~90s; a code change on 2025-11-22 extends rounds to 300s by default.
  - Fetch logs show `specialModeEnabled: false` and keywords like “Italian In My City cafe bakery …” confirming the toggle avoids steakhouse anchors when off.
  - Console captures (`group_channel_*` events) confirm realtime handshakes, vote broadcasts, and timer expiry notifications on both clients.
- **Explanations:**
  - Google Places is invoked automatically when `/dinnerdecider/fetch` mounts; R1 still composes shortlist combos, while R2 (Places) preloads results without an extra button.
  - The short timer likely triggers shortlist takeover: once the host’s timer flags expired, the next guest shortlist replaces the board. The new 5-minute default plus eventual host-configurable timer should mitigate this.
- **Follow-ups:**
  1. Re-run QA after the 5-minute timer patch and ledger persistence adjustments to verify guest rerolls no longer overwrite host entries.
  2. Design host-configurable round duration (default 5 min) so slower devices can coordinate without forced expiry.
  3. Audit shortlist ownership guard so guest lists merge/appends instead of replacing the host board unless explicitly reset.


### 2025-11-23 – Group Session QA (Test4 Group Party, retest)

- **Log:** `docs/Phase_9/logs/2025-11-23_073626_test4_group_party.log`
- **Participants:** Host + guest running dual browsers (plan ahead disabled).
- **Status:**
  - Partial — guest rerolls now append on their own dashboard without wiping host picks, but the host still never receives the guest’s shortlist until a rename/presence update arrives.
  - ✅ Supabase session rows stabilized at two per group (initial + latest) instead of duplicating every refresh.
  - ⚠️ React still warns about duplicate `Trader Joe's` keys when the API returns multiple branches; dedupe guard remains outstanding.
- **Follow-ups:**
  - Track down why `group_channel_subscribed` + `state` broadcasts fail to hydrate the host when version numbers tie; likely need to broadcast merged snapshots immediately after append.
  - Add deterministic per-place IDs (placeId + vicinity) to guarantee unique React keys and avoid duplicate cards.
  - Capture Supabase channel payloads during the rename workaround to confirm which event triggers the host refresh.

### 2025-11-23 – Plan Ahead precise-location check

- **Log:** `docs/Phase_9/logs/2025-11-23_073626_test4_group_party.log`
- **Scenario:** Chrome incognito retest of “Use current location” toggle.
- **Outcome:** Pass — fallback to browser timezone info kept Plan Ahead enabled even though Edge privacy mode earlier blocked geolocation; note conclusion to re-test Edge with geolocation permissions enabled before closing.

### 2025-11-23 – Group Session QA (Test4 Group Party, plan-ahead variation)

- **Log:** `docs/Phase_9/logs/2025-11-23_055908_test4_group_party.log`
- **Scenario:** Host enabled Plan Ahead (Jacksonville, FL + Burger specialized filter); guest joined via Edge privacy window.
- **Status:**
  - ❌ Guest flow aborted with “No restaurants found” during Randomize despite valid host shortlist; likely over-filtering combined with privacy-mode geolocation jitter.
  - ⚠️ Plan Ahead “Use current location” threw a 502 from `/api/places/timezone` in Edge privacy; Chrome incognito reproductions later passed.
  - ⚠️ “Nearby” distance option surfaced restaurants well outside the expected radius when Edge masked the precise location; needs follow-up testing in standard browsers before code changes.
- **Follow-ups:**
  - Audit Burger specialized keyword combo and add a fallback to broaden filters when Zero-results hits.
  - Improve Plan Ahead current-location UX: display fallback message when timezone API fails (now implemented) and document browser permission requirements.
  - Re-run nearby radius checks outside privacy mode; if misalignment persists, capture Places responses for analysis.

### 2025-11-22 – Group Session QA (Test4 Group Party, morning regression)

- **Logs:**
  - `docs/Phase_9/logs/2025-11-22_090613_test4_group_party.log`
  - `docs/Phase_9/logs/2025-11-22_093415_test4_group_party.log`
- **Participants:** Guest 1 (Edge) and Guest 2 (Chrome incognito), anonymous sessions.
- **Status:**
  - QA Pass — Guest 1’s initial shortlist and votes appeared for both clients before Guest 2 ran their flow.
  - ❌ — Guest 2’s flow did not ingest Guest 1’s restaurants; each board became siloed until Guest 2 refreshed, after which only Guest 1’s data remained.
  - ❌ — Subsequent Guest 2 reroll overwrote the board again, erasing Guest 1’s picks and votes; renaming a guest triggered the same takeover, confirming merge conflicts.
  - ❌ — Duplicate restaurant entries (Trader Joe’s) triggered React key warnings, signalling dedupe gaps when identical venue names arrive.
  - ⚠️ — Oracle fallback injected a supermarket when Google Places returned zero matches for “family friendly + budget friendly”.
- **Console / Supabase insights:**
  - `group_broadcast_state` events show version increments without merged ledgers; Supabase `group_sessions` table recorded multiple rows per run, implying state persisted but overwrote on merge.
  - Rename broadcasts (`group_channel_send_state_on_join`) pushed entire restaurant arrays to peers, confirming why remote boards reset.
  - Background suggestions toggle stayed on “Breakfast” despite flow updates (`still_stuck_in_background_mode.png`), indicating the time-of-day signal failed to propagate.
- **Notes captured:**
  1. Timer UI should surface longer durations (30–60 minutes), locked for non-premium members with a toast, while premium hosts can adjust.
  2. On the group landing page, repurpose the “Your name” input to name the group, adopt readable text color, and align “Join group” button styling with “Create group”.
  3. Investigate Supabase writes (multiple `group_sessions` rows) for stale-state collisions versus realtime merge order.
  4. Fix the background meal-suggestion toggle so Breakfast/Lunch/Dinner selections apply consistently.
- **Follow-ups:**
  1. Patch shortlist merging so new fetches append while preserving existing entries/votes; verify Supabase persistence merges rather than replaces.
  2. Add dedupe guard using `place_id` (or fallback composite key) to avoid duplicate React keys and consolidate identical venues.
  3. Validate DinnerContext time-of-day pipeline and ensure background suggestion toggle reflects the latest state.
  4. Scope UX updates for group creation screen and premium timer configuration (captured in roadmap backlog).


**Raw tester notes (retained verbatim):**

> Nov-22-8:06am testing
> no log
> Test 2 Guest1 creates the group and sends it to Guest2 who opens it before any flows are run, guest 1 does the flow and then the restaurants from group1 flow appears on guest1 they did not appear on guest2 board (this was incorrect the flow should appear on both boards dyamically), since guest2 didnt see guest1's flow they did not see any voting(the voting is live between the 2 dashboards). guest2 goes through the flow and guest2's restuarants from the flow appear on the guest2 board still did not see guest1 flow or pics (Group_Likes13) (should appear on the board along with guest1 restaurants), boards were not connected (boards should be connected and should not does not wipe out the existing votes or existing restaurants) upon refresh of guest2 board it showed only guest1's flow and pics, guest2 ran through the flow again and it whiped out the guest2 board showing only their flow (should be dyanmic showing all restuarnts picked by group memebers and all of their picks). (should be that both guest1 and guest2 see the restaurant flows output from guest1 and guest2 on the group dashboard, each can vote on the restaurants can be seen dynamically.) but what actually happened guest2 group dashboard was not connected to guest1 group dashboard during this test which should not happen they should be dynamically synced to each otehr restaurant the existing pull and votest of guest1 should arrive and stay on guest2 board when guest2 runs the flow the restaurants should be added to both board and existing voting maintained.
>
> Log : C:\Application Development Projects\DinnerDecider\docs\Phase_9\logs\2025-11-22_093415_test4_group_party.log
> Test 3 is test 1 but without initial votes added in (so add restaurants from both guest1 and guest2 then the voting can begin)
> This did the same as before kept them independent of each other, I did notice that when I updated a user's name that the dashboard flowed from the user to the others but it overwrote their existing information (guest1 had finished the flow, guest had finished their flow they were not dynamically connected [incorrect they should be] when I changed name of guest to guest2, all of guest's group dashboard information flowed downstream onto guest1's dashboard and clearing out guest1's flow and picks)(Group_Likes16.png, and Group_Likes17.png)
>
> Notes :
> 1. lets add a note to build in the timer functionality for a specific amount of time (maybe an 30 minutes or an hour) show it on the group dashboard but have it locked for not premium members and have a toast identifing feature is premium only but only allow a premium member who opens the group to have access to change the time on the group dashboard they create. only allow premium to change it up to 
> 2. On the group page (group_landing.png and group_landing2.png) where a user creates a group there is a your name bar above the create group button, this should be to add a name to a new group to get created the functionality entering anything doesn't change the actual user name in the group, so why not use this container to just name the group itself when creating a group, additionally the text in the containers is white which is hard to see when using the screen lets change the text to the same color as the rest of the text outside of buttons on the page, lets also change the Join group button to be the same color as the create group button
> 3. Is the reason this is not working because of supabase? I added a screenshot from the group_sessions supabase table and it seems like there is 4 entries for test 3 (group_Likes_Supa.png)
> 4. Also the background (breakfast, lunch, dinner) suggestions toggle I believe is not working see image (still_stuck_in_background_mode.png)
>
> logs : C:\Application Development Projects\DinnerDecider\docs\Phase_9\logs\2025-11-22_090613_test4_group_party.log
> Test 1 Guest1 creates group and completes the flow and votes then guest2 opens the group, the sees guest1 flow restaurants and choices(this passed), Guest2 completes the flow and but does not see guest1's flow or votes (this failed guest2 should see both guest1 and guest2 flow restaurants and choices after they comple their flow). Currently this step guest2 is overriding guest 1's votes and restaurants, the timer is no longer an issue which is helping the testing but I believe part of the issue is guest2 flow just wiping out the information in the existing pull either because an item from the existing flow is in the new flow and just resetting the dashboard or just overwriting all items on the dashboard (Which I do not want). Both of the guests restaurant pulls should be visible with their restaurants and like/pass selections after each and every concectutive pull. finalized was dyamic across the group and when selected even though each group member (guest1 and guest2) could not see the other members votes was still able to actualize the restaurant that had the highest votes and produce it on both guest1 and guest2 dashboard as the winner.
>
> test 1 guest1 console logs: 
> C:\Application Development Projects\DinnerDecider\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:25630 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
> :3003/favicon.ico:1   Failed to load resource: the server responded with a status of 404 (Not Found)
> C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:216 🕒 TimeContext → Breakfast
> script.debug.js:1 [Vercel Web Analytics] Debug mode is enabled by default in development. No requests will be sent to the server.
> script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group Object
> script.debug.js:1 [Vercel Speed Insights] Debug mode is enabled by default in development. No requests will be sent to the server.
> C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
> C\...

QA Sign-Off Tests


.\scripts\captureTestLog.ps1 -Command "npm run dev" -LogName "test4_group_party"

**1.** Plan Ahead overrides: verify autocomplete → place details → timezone fetch, confirm saved override changes dashboard headline and fetch results, then clear override and ensure state resets.
**2.** Supabase auth flow: create account with email/password, confirm profile auto-populates, update notification prefs + phone, sign out/in, and ensure profile data persists across reload.
**3.** DinnerContext sync: with env vars present, reload app to confirm supabaseConfigured flips true, observe login/profile routes rendering correctly, and ensure anonymous sessions still function when Supabase is unreachable.
**4.** Drinks + expanded Places: toggle “Drinks” vibe and confirm bar-only results, run standard moods to confirm cafes/dessert spots appear, and spot-check that meta flags show relaxed type filtering without regression.


**Terminal Log Capture**

- Quick command: `npm run dev 2>&1 | Tee-Object -FilePath "docs/Phase_9/logs/$(Get-Date -Format 'yyyy-MM-dd_HHmm')_test2_auth.log"`
- Script helper: `pwsh scripts/captureTestLog.ps1 -Command "npm run dev" -LogName "test2_plan_ahead"`
- Name files with ISO date + test label so they align with the sections below.
- Link the saved log path directly under the matching test entry.


Test 1:
Ran npm install:

terminal output:
PS C:\Application Development Projects\DinnerDecider> npm install

added 399 packages, and audited 400 packages in 2m

136 packages are looking for funding
  run `npm fund` for details

2 moderate severity vulnerabilities

To address all issues, run:
  npm audit fix

Run `npm audit` for details.


Ran npm run dev

Opened localhost:3003

Error:
console: 
## Error Type
Build Error

## Error Message
  × Nullish coalescing operator(??) requires parens when mixing with logical operators

## Build Output
./src/context/DinnerContext.jsx
Error:   × Nullish coalescing operator(??) requires parens when mixing with logical operators
     ╭─[C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:477:1]
 474 │     const insights = updates.insights === undefined ? profile?.insights ?? null : updates.insights;
 475 │     const payload = {
 476 │       userId: authUser.id,
 477 │       username: updates.username ?? profile?.username ?? authUser.email?.split("@")[0] || "Foodie",
     ·                 ──────────────────────────────────────────────────────────────────────────────────
 478 │       tier: updates.tier ?? profile?.tier ?? "free",
 479 │       aiSummary: updates.aiSummary ?? profile?.aiSummary ?? null,
 480 │       preferences,
     ╰────

Caused by:
    Syntax Error

Next.js version: 15.5.4 (Webpack)


Terminal:
PS C:\Application Development Projects\DinnerDecider> npm run dev

> dinnerdecider@0.1.0 dev
> next dev -p 3003

   ▲ Next.js 15.5.4
   - Local:        http://localhost:3003
   - Network:      http://192.168.1.229:3003
   - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 3.2s
 ○ Compiling /dinnerdecider/group ...
 ⨯ ./src/context/DinnerContext.jsx
Error:   × Nullish coalescing operator(??) requires parens when mixing with logical operators
     ╭─[C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:477:1]
 477 │       username: updates.username ?? profile?.username ?? authUser.email?.split("@")[0] || "Foodie",
     ·                 ──────────────────────────────────────────────────────────────────────────────────
 478 │       tier: updates.tier ?? profile?.tier ?? "free",
 479 │       aiSummary: updates.aiSummary ?? profile?.aiSummary ?? null,
 480 │       preferences,
     ╰────

Caused by:
    Syntax Error

Import trace for requested module:
./src/context/DinnerContext.jsx
./src/components/Header.jsx
 ⨯ ./src/context/DinnerContext.jsx
Error:   × Nullish coalescing operator(??) requires parens when mixing with logical operators
     ╭─[C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:477:1]
 474 │     const insights = updates.insights === undefined ? profile?.insights ?? null : updates.insights;
 475 │     const payload = {
 476 │       userId: authUser.id,
 477 │       username: updates.username ?? profile?.username ?? authUser.email?.split("@")[0] || "Foodie",
     ·                 ──────────────────────────────────────────────────────────────────────────────────
 478 │       tier: updates.tier ?? profile?.tier ?? "free",
 479 │       aiSummary: updates.aiSummary ?? profile?.aiSummary ?? null,
 480 │       preferences,
     ╰────

Caused by:
    Syntax Error

Import trace for requested module:
./src/context/DinnerContext.jsx
./src/components/Header.jsx
 ⨯ ./src/context/DinnerContext.jsx
Error:   × Nullish coalescing operator(??) requires parens when mixing with logical operators
     ╭─[C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:477:1]
 474 │     const insights = updates.insights === undefined ? profile?.insights ?? null : updates.insights;
 475 │     const payload = {
 476 │       userId: authUser.id,
 477 │       username: updates.username ?? profile?.username ?? authUser.email?.split("@")[0] || "Foodie",
     ·                 ──────────────────────────────────────────────────────────────────────────────────
 478 │       tier: updates.tier ?? profile?.tier ?? "free",
 479 │       aiSummary: updates.aiSummary ?? profile?.aiSummary ?? null,
 480 │       preferences,
     ╰────

Caused by:
    Syntax Error

Import trace for requested module:
./src/context/DinnerContext.jsx
./src/components/Header.jsx
 GET /dinnerdecider/group 500 in 23330ms
 GET / 500 in 22870ms
<w> [webpack.cache.PackFileCacheStrategy] Caching failed for pack: Error: ENOENT: no such file or directory, rename 'C:\Application Development Projects\DinnerDecider\.next\cache\webpack\client-development-fallback\0.pack.gz_' -> 'C:\Application Development Projects\DinnerDecider\.next\cache\webpack\client-development-fallback\0.pack.gz'





QA Sign-Off Tests

**1. Plan ahead parameters** Plan Ahead overrides: verify autocomplete → place details → timezone fetch, confirm saved override changes dashboard headline and fetch results, then clear override and ensure state resets.
**1. Plan ahead test**
**2. Auth flow parameters** Supabase auth flow: create account with email/password, confirm profile auto-populates, update notification prefs + phone, sign out/in, and ensure profile data persists across reload.
**2. Auth flow test**
**3. DinerContext Sync parameters** DinnerContext sync: with env vars present, reload app to confirm supabaseConfigured flips true, observe login/profile routes rendering correctly, and ensure anonymous sessions still function when Supabase is unreachable.
**3. DinerContext Sync test**

Pending: login still blocked; revisit Supabase auth once environment is finalized.
**4. Drinks + expanded Places parameters** Drinks + expanded Places: toggle “Drinks” vibe and confirm bar-only results, run standard moods to confirm cafes/dessert spots appear, and spot-check that meta flags show relaxed type filtering without regression.
**4. Drinks + expanded Places test**


Test2:
**1. Plan ahead parameters** Plan Ahead overrides: verify autocomplete → place details → timezone fetch, confirm saved override changes dashboard headline and fetch results, then clear override and ensure state resets.
**1. Plan ahead test**
- Button moves user to plan ahead landing page (image in docs\Phase_9\Features\Plan_Ahead_Landing.png)
- from Plan ahead landing page back to dashboard bring user back to dashboard
- date picker and time picker all worked out fine and all items that were selected populated in the correct areas

Retake results (11/18, ~23:05):
- Plan Ahead override applied successfully with `/api/places/details` 200 responses; selections persisted to dashboard headline and fetch flow.
- Log: `docs/Phase_9/logs/2025-11-18_230553_test2_plan_ahead_retake3.log` (shows repeated autocomplete + details 200s).
- QA status: ✅ Pass

- I will finish the testing after the issue below is addressed.

- search pulled US City, State, street, and international items (error below)

-- Error when place is item selected in the plan ahead landing page the error said "location look up failed" and "Could not load details for that place. try another search" I got this error in console:
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\plan\page.js:160 
        
        
       POST http://localhost:3003/api/places/details 404 (Not Found)
handleSelectSuggestion @ C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\plan\page.js:160
onClick @ C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\plan\page.js:344
executeDispatch @ react-dom-client.development.js:16971
runWithFiberInDEV @ react-dom-client.development.js:872
processDispatchQueue @ react-dom-client.development.js:17021
eval @ react-dom-client.development.js:17622
batchedUpdates$1 @ react-dom-client.development.js:3312
dispatchEventForPluginEventSystem @ react-dom-client.development.js:17175
dispatchEvent @ react-dom-client.development.js:21358
dispatchDiscreteEvent @ react-dom-client.development.js:21326
<button>
exports.jsxDEV @ react-jsx-dev-runtime.development.js:323
eval @ C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\plan\page.js:342
PlanAheadPage @ C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\plan\page.js:340
react_stack_bottom_frame @ react-dom-client.development.js:23584
renderWithHooksAgain @ react-dom-client.development.js:6893
renderWithHooks @ react-dom-client.development.js:6805
updateFunctionComponent @ react-dom-client.development.js:9247
beginWork @ react-dom-client.development.js:10858
runWithFiberInDEV @ react-dom-client.development.js:872
performUnitOfWork @ react-dom-client.development.js:15727
workLoopSync @ react-dom-client.development.js:15547
renderRootSync @ react-dom-client.development.js:15527
performWorkOnRoot @ react-dom-client.development.js:14991
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16816
performWorkUntilDeadline @ scheduler.development.js:45
Show 21 more frames
Show less
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\plan\page.js:179 plan_ahead_select_error Error: details_failed
    at handleSelectSuggestion (C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\plan\page.js:165:26)


Terminal for the first test:
PS C:\Application Development Projects\DinnerDecider> npm run dev

> dinnerdecider@0.1.0 dev
> next dev -p 3003

   ▲ Next.js 15.5.4
   - Local:        http://localhost:3003
   - Network:      http://192.168.1.229:3003
   - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 4.7s
 ○ Compiling /dinnerdecider/group ...
 ✓ Compiled / in 5.8s (1557 modules)
 GET /dinnerdecider/group 200 in 6347ms
 GET / 200 in 4780ms
 ○ Compiling /dinnerdecider ...
 ✓ Compiled /dinnerdecider in 9.6s (4842 modules)
 GET /dinnerdecider 200 in 10937ms
 GET /dinnerdecider 200 in 101ms
 ○ Compiling /api/weather ...
 ✓ Compiled /api/weather in 1564ms (4862 modules)
🌦️ [API CALL] {
  endpoint: 'https://api.openweathermap.org/data/2.5/weather?lat=30.1236224&lon=-81.4874624&appid=9c15a2bb51e846b962f47874861f0ecd&units=metric',
  lat: 30.1236224,
  lng: -81.4874624
}
🌈 [API RESPONSE] {
  status: 200,
  ok: true,
  durationMs: 216,
  condition: 'clear sky',
  temperatureC: 25.55,
  humidity: 60
}
 GET /api/weather?lat=30.1236224&lng=-81.4874624 200 in 1979ms
 ○ Compiling /dinnerdecider/plan ...
 ✓ Compiled /dinnerdecider/plan in 2.8s (4845 modules)
 GET /dinnerdecider/plan 200 in 3657ms
 ✓ Compiled in 2s (2355 modules)
 GET /dinnerdecider/plan 200 in 267ms
 GET /dinnerdecider 200 in 315ms
 GET /dinnerdecider/plan 200 in 56ms
Saved log: `docs/Phase_9/logs/2025-11-18_test2_plan_ahead.log`

Retake (capture script):
- Command: `./scripts/captureTestLog.ps1 -Command "npm run dev" -LogName "test2_plan_ahead_retake"`
- Saved log: `docs/Phase_9/logs/2025-11-18_201439_test2_plan_ahead_retake.log`
- Result summary: `/api/places/autocomplete` responding 200, but `/api/places/details` returning HTTP 502 (`details_failed`). Browser console reports Google Places API denial; investigate API key restrictions/billing before re-testing.
 ○ Compiling /api/places/autocomplete ...
 ✓ Compiled /api/places/autocomplete in 2.9s (4878 modules)
 GET /dinnerdecider/plan 200 in 1413ms
 POST /api/places/autocomplete 200 in 5271ms
 POST /api/places/autocomplete 200 in 289ms
 POST /api/places/autocomplete 200 in 224ms
 POST /api/places/autocomplete 200 in 203ms
 POST /api/places/autocomplete 200 in 215ms
 POST /api/places/autocomplete 200 in 203ms
 POST /api/places/autocomplete 200 in 251ms
 POST /api/places/autocomplete 200 in 133ms
 POST /api/places/autocomplete 200 in 270ms
 POST /api/places/autocomplete 200 in 374ms
 ○ Compiling /api/places/details ...
 ✓ Compiled /api/places/details in 1941ms (4866 modules)
 POST /api/places/autocomplete 200 in 1922ms
 POST /api/places/details 404 in 2231ms
 POST /api/places/details 404 in 223ms
 POST /api/places/autocomplete 200 in 226ms
 POST /api/places/autocomplete 200 in 188ms
 POST /api/places/autocomplete 200 in 201ms
 POST /api/places/details 404 in 79ms
 POST /api/places/autocomplete 200 in 146ms
 GET /dinnerdecider 200 in 461ms





**2. Auth flow parameters** Supabase auth flow: create account with email/password, confirm profile auto-populates, update notification prefs + phone, sign out/in, and ensure profile data persists across reload.
**2. Auth flow test**
see docs\phase_9\Features\Sign_in_landing_issue.png
Terminal :
 ○ Compiling /dinnerdecider/login ...
 ✓ Compiled /dinnerdecider/login in 2.8s (4866 modules)
 GET /dinnerdecider/login 200 in 3587ms
 ✓ Compiled in 829ms (2357 modules)
 GET /dinnerdecider/login 200 in 359ms
 GET /dinnerdecider/login 200 in 59ms
 ✓ Compiled in 921ms (2357 modules)
 GET /dinnerdecider/login 200 in 94ms

Console:

handleSelectSuggestion @ C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\plan\page.js:179
await in handleSelectSuggestion
onClick @ C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\plan\page.js:344
executeDispatch @ react-dom-client.development.js:16971
runWithFiberInDEV @ react-dom-client.development.js:872
processDispatchQueue @ react-dom-client.development.js:17021
eval @ react-dom-client.development.js:17622
batchedUpdates$1 @ react-dom-client.development.js:3312
dispatchEventForPluginEventSystem @ react-dom-client.development.js:17175
dispatchEvent @ react-dom-client.development.js:21358
dispatchDiscreteEvent @ react-dom-client.development.js:21326
<button>
exports.jsxDEV @ react-jsx-dev-runtime.development.js:323
eval @ C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\plan\page.js:342
PlanAheadPage @ C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\plan\page.js:340
react_stack_bottom_frame @ react-dom-client.development.js:23584
renderWithHooksAgain @ react-dom-client.development.js:6893
renderWithHooks @ react-dom-client.development.js:6805
updateFunctionComponent @ react-dom-client.development.js:9247
beginWork @ react-dom-client.development.js:10858
runWithFiberInDEV @ react-dom-client.development.js:872
performUnitOfWork @ react-dom-client.development.js:15727
workLoopSync @ react-dom-client.development.js:15547
renderRootSync @ react-dom-client.development.js:15527
performWorkOnRoot @ react-dom-client.development.js:14991
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16816
performWorkUntilDeadline @ scheduler.development.js:45
Show 21 more frames
Show less
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider {o: 'http://localhost:3003/dinnerdecider', sv: '0.1.3', sdkn: '@vercel/analytics/react', sdkv: '1.5.0', ts: 1763490431250, …}
2hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 89ms
report-hmr-latency.js:14 [Fast Refresh] done in 921ms
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/login {o: 'http://localhost:3003/dinnerdecider/login', sv: '0.1.3', sdkn: '@vercel/analytics/react', sdkv: '1.5.0', ts: 1763490864317, …}
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 964ms
script.debug.js:1 [Vercel Speed Insights] [vitals] {speed: '4g', metrics: Array(2), scriptVersion: '0.1.3', sdkName: '@vercel/speed-insights/next', sdkVersion: '1.2.0'}






see docs\phase_9\Features\Sign_in_landing_issue.png
**3. DinerContext Sync parameters** DinnerContext sync: with env vars present, reload app to confirm supabaseConfigured flips true, observe login/profile routes rendering correctly, and ensure anonymous sessions still function when Supabase is unreachable.
**3. DinerContext Sync test**

See test2 item 2 cannot login.


**4. Drinks + expanded Places parameters** Drinks + expanded Places: toggle “Drinks” vibe and confirm bar-only results, run standard moods to confirm cafes/dessert spots appear, and spot-check that meta flags show relaxed type filtering without regression.
**4. Drinks + expanded Places test**
- First attempt did not work but the rerun worked, not QA validated until multiple attempts correctly are validated
- Latest run: drinks vibe returned 13 results with bar-only filters; R2 meta shows correct drink keywords and `drinkMode: true` (see log above).
- QA status: ✅ Pass

Console :
[Vercel Web Analytics] Debug mode is enabled by default in development. No requests will be sent to the server.
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/ Object
script.debug.js:1 [Vercel Speed Insights] Debug mode is enabled by default in development. No requests will be sent to the server.
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 4085ms
script.debug.js:1 [Vercel Speed Insights] [vitals] Object
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider Object
2C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:198 🕒 TimeContext → Snack
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 1315ms
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 975ms
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/fetch Object
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 850ms
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 3435ms
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\randomize\page.js:115 🌀 R1 Combo Generated: {region: null, experience: null, specialized: null, distance: null}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\randomize\page.js:115 🌀 R1 Combo Generated: {region: null, experience: null, specialized: null, distance: null}
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 2251ms
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:125 🎯 R2 Query Based On: {region: null, experience: null, specialized: null, distance: null}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:242 🎯 R2 Filter Applied: {summaryLabels: {…}, comboFilters: {…}}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:243 🍽️ R2 Restaurants Returned: ['The Food Oracles are stumped 😱!']
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:287 🧪 R2 Meta Snapshot: {keyword: 'cocktail bar wine bar speakeasy taproom drinks cocktail brewery whiskey bar', radius: 5000, radiusSource: 'default', activeFilters: {…}, placeIds: Array(1), …}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:302 R2 Dedup: {shown: 1, remaining: 0}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:125 🎯 R2 Query Based On: {region: null, experience: null, specialized: null, distance: null}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:242 🎯 R2 Filter Applied: {summaryLabels: {…}, comboFilters: {…}}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:243 🍽️ R2 Restaurants Returned: ['The Food Oracles are stumped 😱!']
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:302 R2 Dedup: {shown: 1, remaining: 0}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:242 🎯 R2 Filter Applied: {summaryLabels: {…}, comboFilters: {…}}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:243 🍽️ R2 Restaurants Returned: ['The Food Oracles are stumped 😱!']
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:242 🎯 R2 Filter Applied: {summaryLabels: {…}, comboFilters: {…}}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:243 🍽️ R2 Restaurants Returned: ['The Food Oracles are stumped 😱!']


Terminal :


PS C:\Application Development Projects\DinnerDecider> npm run dev

> dinnerdecider@0.1.0 dev
> next dev -p 3003

   ▲ Next.js 15.5.4
   - Local:        http://localhost:3003
   - Network:      http://192.168.1.229:3003
   - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 7s
 ○ Compiling / ...
 ✓ Compiled / in 3.4s (614 modules)
 GET / 200 in 4013ms
 ○ Compiling /dinnerdecider ...
 ✓ Compiled /dinnerdecider in 4.6s (4849 modules)
 GET /dinnerdecider 200 in 4906ms
 GET /dinnerdecider 200 in 66ms
 ○ Compiling /api/weather ...
 ✓ Compiled /api/weather in 1232ms (4855 modules)
🌦️ [API CALL] {
  endpoint: 'https://api.openweathermap.org/data/2.5/weather?lat=30.1236224&lon=-81.4874624&appid=9c15a2bb51e846b962f47874861f0ecd&units=metric',
  lat: 30.1236224,
  lng: -81.4874624
}
🌈 [API RESPONSE] {
  status: 200,
  ok: true,
  durationMs: 202,
  condition: 'clear sky',
  temperatureC: 25.18,
  humidity: 63
}
 GET /api/weather?lat=30.1236224&lng=-81.4874624 200 in 1630ms
 ○ Compiling /dinnerdecider/fetch ...
 ✓ Compiled /dinnerdecider/fetch in 1223ms (4864 modules)
 GET /dinnerdecider/fetch 200 in 1375ms
 ○ Compiling /api/places ...
 ✓ Compiled /api/places in 786ms (4869 modules)
🛰️ [/api/places] Proxying Places request {
  lat: 30.1236224,
  lng: -81.4874624,
  hasFilters: true,
  hasCombo: false,
  signals: {
    mood: 'drinks',
    weather: {
      bucket: null,
      condition: 'clear sky',
      temperatureC: 25.2,
      temperatureF: 77.3,
      humidity: 63,
      weatherHint: 'clear',
      source: 'openweather',
      durationMs: 202,
      lat: 30.1236224,
      lng: -81.4874624,
      fetchedAt: 1763500540357
    },
    prefs: { likes: [], dislikes: [] },
    timeCategory: 'Snack',
    weatherHint: 'clear',
    planAheadEnabled: false,
    drinkMode: true
  }
}
[fetchNearbyRestaurants] coords: { lat: 30.1236224, lng: -81.4874624 } filters: {
  region: { mode: 'any', selected: [] },
  experience: { mode: 'any', selected: [] },
  specialized: { mode: 'any', selected: [] },
  distance: { mode: 'any', selected: [] }
} selectedCombo: null signals: {
  mood: 'drinks',
  weather: {
    bucket: null,
    condition: 'clear sky',
    temperatureC: 25.2,
    temperatureF: 77.3,
    humidity: 63,
    weatherHint: 'clear',
    source: 'openweather',
    durationMs: 202,
    lat: 30.1236224,
    lng: -81.4874624,
    fetchedAt: 1763500540357
  },
  prefs: { likes: [], dislikes: [] },
  timeCategory: 'Snack',
  weatherHint: 'clear',
  planAheadEnabled: false,
  drinkMode: true
}
🧭 Active Filters → {
  region: { mode: 'any', values: [ '*' ] },
  experience: { mode: 'any', values: [ '*' ] },
  specialized: { mode: 'any', values: [ '*' ] },
  distance: { mode: 'any', values: [ '*' ] }
}
🔑 Applied Keywords → cocktail bar wine bar speakeasy taproom drinks cocktail brewery whiskey bar
📏 Radius → { radius: 5000, radiusSource: 'default' }
🧮 Query Complexity → 11
⚠️ Query too complex; consider trimming signals. {
  keyword: 'cocktail bar wine bar speakeasy taproom drinks cocktail brewery whiskey bar',    
  score: 11
}
🎯 Using R1 combo for query: null
🌐 [API CALL] {
  endpoint: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=30.1236224%2C-81.4874624&radius=5000&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE&type=bar&opennow=true&keyword=cocktail+bar+wine+bar+speakeasy+taproom+drinks+cocktail+brewery+whiskey+bar',        
  filters: {
    region: { mode: 'any', values: [Array] },
    experience: { mode: 'any', values: [Array] },
    specialized: { mode: 'any', values: [Array] },
    distance: { mode: 'any', values: [Array] }
  },
  keyword: 'cocktail bar wine bar speakeasy taproom drinks cocktail brewery whiskey bar',    
  location: { lat: 30.1236224, lng: -81.4874624 },
  radius: 5000,
  mood: 'drinks',
  weather: null,
  weatherHint: 'clear',
  timeCategory: 'Snack',
  drinkMode: true,
  planAheadEnabled: false
}
🛰️ [/api/places] Proxying Places request {
  lat: 30.1236224,
  lng: -81.4874624,
  hasFilters: true,
  hasCombo: false,
  signals: {
    mood: 'drinks',
    weather: {
      bucket: null,
      condition: 'clear sky',
      temperatureC: 25.2,
      temperatureF: 77.3,
      humidity: 63,
      weatherHint: 'clear',
      source: 'openweather',
      durationMs: 202,
      lat: 30.1236224,
      lng: -81.4874624,
      fetchedAt: 1763500540357
    },
    prefs: { likes: [], dislikes: [] },
    timeCategory: 'Snack',
    weatherHint: 'clear',
    planAheadEnabled: false,
    drinkMode: true
  }
}
[fetchNearbyRestaurants] coords: { lat: 30.1236224, lng: -81.4874624 } filters: {
  region: { mode: 'any', selected: [] },
  experience: { mode: 'any', selected: [] },
  specialized: { mode: 'any', selected: [] },
  distance: { mode: 'any', selected: [] }
} selectedCombo: null signals: {
  mood: 'drinks',
  weather: {
    bucket: null,
    condition: 'clear sky',
    temperatureC: 25.2,
    temperatureF: 77.3,
    humidity: 63,
    weatherHint: 'clear',
    source: 'openweather',
    durationMs: 202,
    lat: 30.1236224,
    lng: -81.4874624,
    fetchedAt: 1763500540357
  },
  prefs: { likes: [], dislikes: [] },
  timeCategory: 'Snack',
  weatherHint: 'clear',
  planAheadEnabled: false,
  drinkMode: true
}
🧭 Active Filters → {
  region: { mode: 'any', values: [ '*' ] },
  experience: { mode: 'any', values: [ '*' ] },
  specialized: { mode: 'any', values: [ '*' ] },
  distance: { mode: 'any', values: [ '*' ] }
}
🔑 Applied Keywords → cocktail bar wine bar speakeasy taproom drinks cocktail brewery whiskey bar
📏 Radius → { radius: 5000, radiusSource: 'default' }
🧮 Query Complexity → 11
⚠️ Query too complex; consider trimming signals. {
  keyword: 'cocktail bar wine bar speakeasy taproom drinks cocktail brewery whiskey bar',    
  score: 11
}
🎯 Using R1 combo for query: null
🌐 [API CALL] {
  endpoint: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=30.1236224%2C-81.4874624&radius=5000&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE&type=bar&opennow=true&keyword=cocktail+bar+wine+bar+speakeasy+taproom+drinks+cocktail+brewery+whiskey+bar',        
  filters: {
    region: { mode: 'any', values: [Array] },
    experience: { mode: 'any', values: [Array] },
    specialized: { mode: 'any', values: [Array] },
    distance: { mode: 'any', values: [Array] }
  },
  keyword: 'cocktail bar wine bar speakeasy taproom drinks cocktail brewery whiskey bar',    
  location: { lat: 30.1236224, lng: -81.4874624 },
  radius: 5000,
  mood: 'drinks',
  weather: null,
  weatherHint: 'clear',
  timeCategory: 'Snack',
  drinkMode: true,
  planAheadEnabled: false
}
📦 [API RESPONSE] { status: 200, ok: true, total: 0, sample: [] }
✅ Filtered 0/0 restaurants []
🚫 Excluded results: []
🏷️ R2 returnedPlaceIDs → []
📊 R2 Dedup Summary → { dedupedCount: 0, originalCount: 0 }
[fetchNearbyRestaurants] No live matches found — showing Oracle fallback.
📦 [API RESPONSE] { status: 200, ok: true, total: 0, sample: [] }
✅ Filtered 0/0 restaurants []
🚫 Excluded results: []
🏷️ R2 returnedPlaceIDs → []
📊 R2 Dedup Summary → { dedupedCount: 0, originalCount: 0 }
[fetchNearbyRestaurants] No live matches found — showing Oracle fallback.
 POST /api/places 200 in 2473ms
 POST /api/places 200 in 2597ms
 ○ Compiling /dinnerdecider/randomize ...
 ✓ Compiled /dinnerdecider/randomize in 3.3s (4876 modules)
 GET /dinnerdecider/randomize 200 in 3975ms
 ○ Compiling /dinnerdecider/output ...
 ✓ Compiled /dinnerdecider/output in 3.1s (4916 modules)
 GET /dinnerdecider/output 200 in 3410ms
🛰️ [/api/places] Proxying Places request {
  lat: 30.1236224,
  lng: -81.4874624,
  hasFilters: true,
  hasCombo: true,
  signals: {
    mood: 'drinks',
    weather: {
      bucket: null,
      condition: 'clear sky',
      temperatureC: 25.2,
      temperatureF: 77.3,
      humidity: 63,
      weatherHint: 'clear',
      source: 'openweather',
      durationMs: 202,
      lat: 30.1236224,
      lng: -81.4874624,
      fetchedAt: 1763500540357
    },
    prefs: { likes: [], dislikes: [] },
    timeCategory: 'Snack',
    weatherHint: 'clear',
    planAheadEnabled: false,
    drinkMode: true
  }
}
[fetchNearbyRestaurants] coords: { lat: 30.1236224, lng: -81.4874624 } filters: {
  region: { mode: 'any', selected: [] },
  experience: { mode: 'any', selected: [] },
  specialized: { mode: 'any', selected: [] },
  distance: { mode: 'any', selected: [] }
} selectedCombo: { region: null, experience: null, specialized: null, distance: null } signals: {
  mood: 'drinks',
  weather: {
    bucket: null,
    condition: 'clear sky',
    temperatureC: 25.2,
    temperatureF: 77.3,
    humidity: 63,
    weatherHint: 'clear',
    source: 'openweather',
    durationMs: 202,
    lat: 30.1236224,
    lng: -81.4874624,
    fetchedAt: 1763500540357
  },
  prefs: { likes: [], dislikes: [] },
  timeCategory: 'Snack',
  weatherHint: 'clear',
  planAheadEnabled: false,
  drinkMode: true
}
🧭 Active Filters → {
  region: { mode: 'any', values: [ '*' ] },
  experience: { mode: 'any', values: [ '*' ] },
  specialized: { mode: 'any', values: [ '*' ] },
  distance: { mode: 'any', values: [ '*' ] }
}
🔑 Applied Keywords → cocktail bar wine bar speakeasy taproom drinks cocktail brewery whiskey bar
📏 Radius → { radius: 5000, radiusSource: 'default' }
🧮 Query Complexity → 11
⚠️ Query too complex; consider trimming signals. {
  keyword: 'cocktail bar wine bar speakeasy taproom drinks cocktail brewery whiskey bar',    
  score: 11
}
🎯 Using R1 combo for query: { region: null, experience: null, specialized: null, distance: null }
🌐 [API CALL] {
  endpoint: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=30.1236224%2C-81.4874624&radius=5000&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE&type=bar&opennow=true&keyword=cocktail+bar+wine+bar+speakeasy+taproom+drinks+cocktail+brewery+whiskey+bar',        
  filters: {
    region: { mode: 'any', values: [Array] },
    experience: { mode: 'any', values: [Array] },
    specialized: { mode: 'any', values: [Array] },
    distance: { mode: 'any', values: [Array] }
  },
  keyword: 'cocktail bar wine bar speakeasy taproom drinks cocktail brewery whiskey bar',    
  location: { lat: 30.1236224, lng: -81.4874624 },
  radius: 5000,
  mood: 'drinks',
  weather: null,
  weatherHint: 'clear',
  timeCategory: 'Snack',
  drinkMode: true,
  planAheadEnabled: false
}
🛰️ [/api/places] Proxying Places request {
  lat: 30.1236224,
  lng: -81.4874624,
  hasFilters: true,
  hasCombo: true,
  signals: {
    mood: 'drinks',
    weather: {
      bucket: null,
      condition: 'clear sky',
      temperatureC: 25.2,
      temperatureF: 77.3,
      humidity: 63,
      weatherHint: 'clear',
      source: 'openweather',
      durationMs: 202,
      lat: 30.1236224,
      lng: -81.4874624,
      fetchedAt: 1763500540357
    },
    prefs: { likes: [], dislikes: [] },
    timeCategory: 'Snack',
    weatherHint: 'clear',
    planAheadEnabled: false,
    drinkMode: true
  }
}
[fetchNearbyRestaurants] coords: { lat: 30.1236224, lng: -81.4874624 } filters: {
  region: { mode: 'any', selected: [] },
  experience: { mode: 'any', selected: [] },
  specialized: { mode: 'any', selected: [] },
  distance: { mode: 'any', selected: [] }
} selectedCombo: { region: null, experience: null, specialized: null, distance: null } signals: {
  mood: 'drinks',
  weather: {
    bucket: null,
    condition: 'clear sky',
    temperatureC: 25.2,
    temperatureF: 77.3,
    humidity: 63,
    weatherHint: 'clear',
    source: 'openweather',
    durationMs: 202,
    lat: 30.1236224,
    lng: -81.4874624,
    fetchedAt: 1763500540357
  },
  prefs: { likes: [], dislikes: [] },
  timeCategory: 'Snack',
  weatherHint: 'clear',
  planAheadEnabled: false,
  drinkMode: true
}
🧭 Active Filters → {
  region: { mode: 'any', values: [ '*' ] },
  experience: { mode: 'any', values: [ '*' ] },
  specialized: { mode: 'any', values: [ '*' ] },
  distance: { mode: 'any', values: [ '*' ] }
}
🔑 Applied Keywords → cocktail bar wine bar speakeasy taproom drinks cocktail brewery whiskey bar
📏 Radius → { radius: 5000, radiusSource: 'default' }
🧮 Query Complexity → 11
⚠️ Query too complex; consider trimming signals. {
  keyword: 'cocktail bar wine bar speakeasy taproom drinks cocktail brewery whiskey bar',    
  score: 11
}
🎯 Using R1 combo for query: { region: null, experience: null, specialized: null, distance: null }
🌐 [API CALL] {
  endpoint: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=30.1236224%2C-81.4874624&radius=5000&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE&type=bar&opennow=true&keyword=cocktail+bar+wine+bar+speakeasy+taproom+drinks+cocktail+brewery+whiskey+bar',        
  filters: {
    region: { mode: 'any', values: [Array] },
    experience: { mode: 'any', values: [Array] },
    specialized: { mode: 'any', values: [Array] },
    distance: { mode: 'any', values: [Array] }
  },
  keyword: 'cocktail bar wine bar speakeasy taproom drinks cocktail brewery whiskey bar',    
  location: { lat: 30.1236224, lng: -81.4874624 },
  radius: 5000,
  mood: 'drinks',
  weather: null,
  weatherHint: 'clear',
  timeCategory: 'Snack',
  drinkMode: true,
  planAheadEnabled: false
}
📦 [API RESPONSE] { status: 200, ok: true, total: 0, sample: [] }
✅ Filtered 0/0 restaurants []
🚫 Excluded results: []
🏷️ R2 returnedPlaceIDs → []
📊 R2 Dedup Summary → { dedupedCount: 0, originalCount: 0 }
[fetchNearbyRestaurants] No live matches found — showing Oracle fallback.
📦 [API RESPONSE] { status: 200, ok: true, total: 0, sample: [] }
✅ Filtered 0/0 restaurants []
🚫 Excluded results: []
🏷️ R2 returnedPlaceIDs → []
📊 R2 Dedup Summary → { dedupedCount: 0, originalCount: 0 }
[fetchNearbyRestaurants] No live matches found — showing Oracle fallback.
 POST /api/places 200 in 828ms
 POST /api/places 200 in 918ms






#4 attempt 2 and 3 :
Console :
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\randomize\page.js:115 🌀 R1 Combo Generated: {region: null, experience: null, specialized: null, distance: null}
C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:198 🕒 TimeContext → Snack
script.debug.js:1 [Vercel Web Analytics] Debug mode is enabled by default in development. No requests will be sent to the server.
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/randomize {o: 'http://localhost:3003/dinnerdecider/randomize', sv: '0.1.3', sdkn: '@vercel/analytics/react', sdkv: '1.5.0', ts: 1763500712180, …}
script.debug.js:1 [Vercel Speed Insights] Debug mode is enabled by default in development. No requests will be sent to the server.
script.debug.js:1 [Vercel Speed Insights] [vitals] {speed: '4g', metrics: Array(4), scriptVersion: '0.1.3', sdkName: '@vercel/speed-insights/next', sdkVersion: '1.2.0'}
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider {o: 'http://localhost:3003/dinnerdecider', sv: '0.1.3', sdkn: '@vercel/analytics/react', sdkv: '1.5.0', ts: 1763500714294, …}
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/fetch {o: 'http://localhost:3003/dinnerdecider/fetch', sv: '0.1.3', sdkn: '@vercel/analytics/react', sdkv: '1.5.0', ts: 1763500718904, …}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\randomize\page.js:115 🌀 R1 Combo Generated: {region: null, experience: null, specialized: null, distance: 'near'}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\randomize\page.js:115 🌀 R1 Combo Generated: {region: null, experience: null, specialized: null, distance: 'close'}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:125 🎯 R2 Query Based On: {region: null, experience: null, specialized: null, distance: 'close'}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:242 🎯 R2 Filter Applied: {summaryLabels: {…}, comboFilters: {…}}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:243 🍽️ R2 Restaurants Returned: (3) ['Coastal Wine & Tapas', 'Really Good Beer Stop', 'Toast With Cocktails']
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:287 🧪 R2 Meta Snapshot: {keyword: 'cocktail bar wine bar speakeasy taproom Next Door Close By drinks cocktail brewery whiskey bar', radius: 8000, radiusSource: 'filters', activeFilters: {…}, placeIds: Array(3), …}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:302 R2 Dedup: {shown: 1, remaining: 2}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:125 🎯 R2 Query Based On: {region: null, experience: null, specialized: null, distance: 'close'}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:242 🎯 R2 Filter Applied: {summaryLabels: {…}, comboFilters: {…}}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:243 🍽️ R2 Restaurants Returned: (3) ['Coastal Wine & Tapas', 'Really Good Beer Stop', 'Toast With Cocktails']
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:302 R2 Dedup: {shown: 1, remaining: 2}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:242 🎯 R2 Filter Applied: {summaryLabels: {…}, comboFilters: {…}}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:243 🍽️ R2 Restaurants Returned: (2) ['Toast With Cocktails', "Fionn MacCool's Irish Pub & Restaurant"]
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:287 🧪 R2 Meta Snapshot: {keyword: 'cocktail bar wine bar speakeasy taproom Close By drinks cocktail brewery whiskey bar', radius: 8000, radiusSource: 'combo', activeFilters: {…}, placeIds: Array(2), …}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:302 R2 Dedup: {shown: 1, remaining: 1}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:242 🎯 R2 Filter Applied: {summaryLabels: {…}, comboFilters: {…}}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\output\page.js:243 🍽️ R2 Restaurants Returned: (2) ['Toast With Cocktails', "Fionn MacCool's Irish Pub & Restaurant"]




Terminal:
ail brewery whiskey bar
📏 Radius → { radius: 8000, radiusSource: 'filters' }
🧮 Query Complexity → 15
⚠️ Query too complex; consider trimming signals. {
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door Close By drinks cocktail brewery whiskey bar',
  score: 15
}
🎯 Using R1 combo for query: null
🌐 [API CALL] {
  endpoint: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=30.1236224%2C-81.4874624&radius=8000&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE&type=bar&opennow=true&keyword=cocktail+bar+wine+bar+speakeasy+taproom+Next+Door+Close+By+drinks+cocktail+brewery+whiskey+bar',
  filters: {
    region: { mode: 'any', values: [Array] },
    experience: { mode: 'any', values: [Array] },
    specialized: { mode: 'any', values: [Array] },
    distance: { mode: 'custom', values: [Array] }
  },
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door Close By drinks cocktail brewery whiskey bar',
  location: { lat: 30.1236224, lng: -81.4874624 },
  radius: 8000,
  mood: 'drinks',
  weather: null,
  weatherHint: 'clear',
  timeCategory: 'Snack',
  drinkMode: true,
  planAheadEnabled: false
}
🛰️ [/api/places] Proxying Places request {
  lat: 30.1236224,
  lng: -81.4874624,
  hasFilters: true,
  hasCombo: false,
  signals: {
    mood: 'drinks',
    weather: {
      bucket: null,
      condition: 'clear sky',
      temperatureC: 25.2,
      temperatureF: 77.3,
      humidity: 63,
      weatherHint: 'clear',
      source: 'openweather',
      durationMs: 202,
      lat: 30.1236224,
      lng: -81.4874624,
      fetchedAt: 1763500540357
    },
    prefs: { likes: [], dislikes: [] },
    timeCategory: 'Snack',
    weatherHint: 'clear',
    planAheadEnabled: false,
    drinkMode: true
  }
}
[fetchNearbyRestaurants] coords: { lat: 30.1236224, lng: -81.4874624 } filters: {
  region: { mode: 'any', selected: [] },
  experience: { mode: 'any', selected: [] },
  specialized: { mode: 'any', selected: [] },
  distance: { mode: 'custom', selected: [ 'near', 'close' ] }
} selectedCombo: null signals: {
  mood: 'drinks',
  weather: {
    bucket: null,
    condition: 'clear sky',
    temperatureC: 25.2,
    temperatureF: 77.3,
    humidity: 63,
    weatherHint: 'clear',
    source: 'openweather',
    durationMs: 202,
    lat: 30.1236224,
    lng: -81.4874624,
    fetchedAt: 1763500540357
  },
  prefs: { likes: [], dislikes: [] },
  timeCategory: 'Snack',
  weatherHint: 'clear',
  planAheadEnabled: false,
  drinkMode: true
}
🧭 Active Filters → {
  region: { mode: 'any', values: [ '*' ] },
  experience: { mode: 'any', values: [ '*' ] },
  specialized: { mode: 'any', values: [ '*' ] },
  distance: { mode: 'custom', values: [ 'Next Door', 'Close By' ] }
}
🔑 Applied Keywords → cocktail bar wine bar speakeasy taproom Next Door Close By drinks cocktail brewery whiskey bar
📏 Radius → { radius: 8000, radiusSource: 'filters' }
🧮 Query Complexity → 15
⚠️ Query too complex; consider trimming signals. {
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door Close By drinks cocktail brewery whiskey bar',
  score: 15
}
🎯 Using R1 combo for query: null
🌐 [API CALL] {
  endpoint: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=30.1236224%2C-81.4874624&radius=8000&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE&type=bar&opennow=true&keyword=cocktail+bar+wine+bar+speakeasy+taproom+Next+Door+Close+By+drinks+cocktail+brewery+whiskey+bar',
  filters: {
    region: { mode: 'any', values: [Array] },
    experience: { mode: 'any', values: [Array] },
    specialized: { mode: 'any', values: [Array] },
    distance: { mode: 'custom', values: [Array] }
  },
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door Close By drinks cocktail brewery whiskey bar',
  location: { lat: 30.1236224, lng: -81.4874624 },
  radius: 8000,
  mood: 'drinks',
  weather: null,
  weatherHint: 'clear',
  timeCategory: 'Snack',
  drinkMode: true,
  planAheadEnabled: false
}
📦 [API RESPONSE] { status: 200, ok: true, total: 1, sample: [ "Miller's Ale House" ] }
✅ Filtered 1/1 restaurants [ "Miller's Ale House (4.2)" ]
🚫 Excluded results: []
🏷️ R2 returnedPlaceIDs → [ 'ChIJDXqGyHm15YgRsk_d2xNZJ3g' ]
📊 R2 Dedup Summary → { dedupedCount: 1, originalCount: 1 }
 POST /api/places 200 in 1313ms
📦 [API RESPONSE] {
  status: 200,
  ok: true,
  total: 3,
  sample: [
    'Coastal Wine & Tapas',
    'Really Good Beer Stop',
    'Toast With Cocktails'
  ]
}
✅ Filtered 3/3 restaurants [
  'Coastal Wine & Tapas (4.7)',
  'Really Good Beer Stop (4.5)',
  'Toast With Cocktails (5)'
]
🚫 Excluded results: []
🏷️ R2 returnedPlaceIDs → [
  'ChIJB6yfZ50x5IgRsPv-LXJlaQ8',
  'ChIJT_RFCOAx5IgRAQ8vh4KkPqw',
  'ChIJW4dpUlYt5IgRBC4Al3f6WgY'
]
📊 R2 Dedup Summary → { dedupedCount: 3, originalCount: 3 }
 POST /api/places 200 in 1868ms
 GET /dinnerdecider/randomize 200 in 52ms
 GET /dinnerdecider/output 200 in 63ms
🛰️ [/api/places] Proxying Places request {
  lat: 30.1236224,
  lng: -81.4874624,
  hasFilters: true,
  hasCombo: true,
  signals: {
    mood: 'drinks',
    weather: {
      bucket: null,
      condition: 'clear sky',
      temperatureC: 25.2,
      temperatureF: 77.3,
      humidity: 63,
      weatherHint: 'clear',
      source: 'openweather',
      durationMs: 202,
      lat: 30.1236224,
      lng: -81.4874624,
      fetchedAt: 1763500540357
    },
    prefs: { likes: [], dislikes: [] },
    timeCategory: 'Snack',
    weatherHint: 'clear',
    planAheadEnabled: false,
    drinkMode: true
  }
}
[fetchNearbyRestaurants] coords: { lat: 30.1236224, lng: -81.4874624 } filters: {
  region: { mode: 'any', selected: [] },
  experience: { mode: 'any', selected: [] },
  specialized: { mode: 'any', selected: [] },
  distance: { mode: 'custom', selected: [ 'near', 'close' ] }
} selectedCombo: { region: null, experience: null, specialized: null, distance: 'near' } signals: {
  mood: 'drinks',
  weather: {
    bucket: null,
    condition: 'clear sky',
    temperatureC: 25.2,
    temperatureF: 77.3,
    humidity: 63,
    weatherHint: 'clear',
    source: 'openweather',
    durationMs: 202,
    lat: 30.1236224,
    lng: -81.4874624,
    fetchedAt: 1763500540357
  },
  prefs: { likes: [], dislikes: [] },
  timeCategory: 'Snack',
  weatherHint: 'clear',
  planAheadEnabled: false,
  drinkMode: true
}
🧭 Active Filters → {
  region: { mode: 'any', values: [ '*' ] },
  experience: { mode: 'any', values: [ '*' ] },
  specialized: { mode: 'any', values: [ '*' ] },
  distance: { mode: 'custom', values: [ 'Next Door' ] }
}
🔑 Applied Keywords → cocktail bar wine bar speakeasy taproom Next Door drinks cocktail brewery whiskey bar
📏 Radius → { radius: 3000, radiusSource: 'combo' }
🧮 Query Complexity → 13
⚠️ Query too complex; consider trimming signals. {
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door drinks cocktail brewery whiskey bar',
  score: 13
}
🎯 Using R1 combo for query: { region: null, experience: null, specialized: null, distance: 'near' }
🌐 [API CALL] {
  endpoint: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=30.1236224%2C-81.4874624&radius=3000&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE&type=bar&opennow=true&keyword=cocktail+bar+wine+bar+speakeasy+taproom+Next+Door+drinks+cocktail+brewery+whiskey+bar',
  filters: {
    region: { mode: 'any', values: [Array] },
    experience: { mode: 'any', values: [Array] },
    specialized: { mode: 'any', values: [Array] },
    distance: { mode: 'custom', values: [Array] }
  },
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door drinks cocktail brewery whiskey bar',
  location: { lat: 30.1236224, lng: -81.4874624 },
  radius: 3000,
  mood: 'drinks',
  weather: null,
  weatherHint: 'clear',
  timeCategory: 'Snack',
  drinkMode: true,
  planAheadEnabled: false
}
🛰️ [/api/places] Proxying Places request {
  lat: 30.1236224,
  lng: -81.4874624,
  hasFilters: true,
  hasCombo: true,
  signals: {
    mood: 'drinks',
    weather: {
      bucket: null,
      condition: 'clear sky',
      temperatureC: 25.2,
      temperatureF: 77.3,
      humidity: 63,
      weatherHint: 'clear',
      source: 'openweather',
      durationMs: 202,
      lat: 30.1236224,
      lng: -81.4874624,
      fetchedAt: 1763500540357
    },
    prefs: { likes: [], dislikes: [] },
    timeCategory: 'Snack',
    weatherHint: 'clear',
    planAheadEnabled: false,
    drinkMode: true
  }
}
[fetchNearbyRestaurants] coords: { lat: 30.1236224, lng: -81.4874624 } filters: {
  region: { mode: 'any', selected: [] },
  experience: { mode: 'any', selected: [] },
  specialized: { mode: 'any', selected: [] },
  distance: { mode: 'custom', selected: [ 'near', 'close' ] }
} selectedCombo: { region: null, experience: null, specialized: null, distance: 'near' } signals: {
  mood: 'drinks',
  weather: {
    bucket: null,
    condition: 'clear sky',
    temperatureC: 25.2,
    temperatureF: 77.3,
    humidity: 63,
    weatherHint: 'clear',
    source: 'openweather',
    durationMs: 202,
    lat: 30.1236224,
    lng: -81.4874624,
    fetchedAt: 1763500540357
  },
  prefs: { likes: [], dislikes: [] },
  timeCategory: 'Snack',
  weatherHint: 'clear',
  planAheadEnabled: false,
  drinkMode: true
}
🧭 Active Filters → {
  region: { mode: 'any', values: [ '*' ] },
  experience: { mode: 'any', values: [ '*' ] },
  specialized: { mode: 'any', values: [ '*' ] },
  distance: { mode: 'custom', values: [ 'Next Door' ] }
}
🔑 Applied Keywords → cocktail bar wine bar speakeasy taproom Next Door drinks cocktail brewery whiskey bar
📏 Radius → { radius: 3000, radiusSource: 'combo' }
🧮 Query Complexity → 13
⚠️ Query too complex; consider trimming signals. {
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door drinks cocktail brewery whiskey bar',
  score: 13
}
🎯 Using R1 combo for query: { region: null, experience: null, specialized: null, distance: 'near' }
🌐 [API CALL] {
  endpoint: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=30.1236224%2C-81.4874624&radius=3000&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE&type=bar&opennow=true&keyword=cocktail+bar+wine+bar+speakeasy+taproom+Next+Door+drinks+cocktail+brewery+whiskey+bar',
  filters: {
    region: { mode: 'any', values: [Array] },
    experience: { mode: 'any', values: [Array] },
    specialized: { mode: 'any', values: [Array] },
    distance: { mode: 'custom', values: [Array] }
  },
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door drinks cocktail brewery whiskey bar',
  location: { lat: 30.1236224, lng: -81.4874624 },
  radius: 3000,
  mood: 'drinks',
  weather: null,
  weatherHint: 'clear',
  timeCategory: 'Snack',
  drinkMode: true,
  planAheadEnabled: false
}
📦 [API RESPONSE] { status: 200, ok: true, total: 0, sample: [] }
✅ Filtered 0/0 restaurants []
🚫 Excluded results: []
🏷️ R2 returnedPlaceIDs → []
📊 R2 Dedup Summary → { dedupedCount: 0, originalCount: 0 }
[fetchNearbyRestaurants] No live matches found — showing Oracle fallback.
📦 [API RESPONSE] { status: 200, ok: true, total: 0, sample: [] }
✅ Filtered 0/0 restaurants []
🚫 Excluded results: []
🏷️ R2 returnedPlaceIDs → []
📊 R2 Dedup Summary → { dedupedCount: 0, originalCount: 0 }
[fetchNearbyRestaurants] No live matches found — showing Oracle fallback.
 POST /api/places 200 in 1578ms
 POST /api/places 200 in 1684ms
 GET /dinnerdecider 200 in 62ms
 GET /dinnerdecider/fetch 200 in 36ms
🛰️ [/api/places] Proxying Places request {
  lat: 30.1236224,
  lng: -81.4874624,
  hasFilters: true,
  hasCombo: false,
  signals: {
    mood: 'drinks',
    weather: {
      bucket: null,
      condition: 'clear sky',
      temperatureC: 25.2,
      temperatureF: 77.3,
      humidity: 63,
      weatherHint: 'clear',
      source: 'openweather',
      durationMs: 202,
      lat: 30.1236224,
      lng: -81.4874624,
      fetchedAt: 1763500540357
    },
    prefs: { likes: [], dislikes: [] },
    timeCategory: 'Snack',
    weatherHint: 'clear',
    planAheadEnabled: false,
    drinkMode: true
  }
}
[fetchNearbyRestaurants] coords: { lat: 30.1236224, lng: -81.4874624 } filters: {
  region: { mode: 'any', selected: [] },
  experience: { mode: 'any', selected: [] },
  specialized: { mode: 'any', selected: [] },
  distance: { mode: 'custom', selected: [ 'near' ] }
} selectedCombo: null signals: {
  mood: 'drinks',
  weather: {
    bucket: null,
    condition: 'clear sky',
    temperatureC: 25.2,
    temperatureF: 77.3,
    humidity: 63,
    weatherHint: 'clear',
    source: 'openweather',
    durationMs: 202,
    lat: 30.1236224,
    lng: -81.4874624,
    fetchedAt: 1763500540357
  },
  prefs: { likes: [], dislikes: [] },
  timeCategory: 'Snack',
  weatherHint: 'clear',
  planAheadEnabled: false,
  drinkMode: true
}
🧭 Active Filters → {
  region: { mode: 'any', values: [ '*' ] },
  experience: { mode: 'any', values: [ '*' ] },
  specialized: { mode: 'any', values: [ '*' ] },
  distance: { mode: 'custom', values: [ 'Next Door' ] }
}
🔑 Applied Keywords → cocktail bar wine bar speakeasy taproom Next Door drinks cocktail brewery whiskey bar
📏 Radius → { radius: 3000, radiusSource: 'filters' }
🧮 Query Complexity → 13
⚠️ Query too complex; consider trimming signals. {
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door drinks cocktail brewery whiskey bar',
  score: 13
}
🎯 Using R1 combo for query: null
🌐 [API CALL] {
  endpoint: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=30.1236224%2C-81.4874624&radius=3000&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE&type=bar&opennow=true&keyword=cocktail+bar+wine+bar+speakeasy+taproom+Next+Door+drinks+cocktail+brewery+whiskey+bar',
  filters: {
    region: { mode: 'any', values: [Array] },
    experience: { mode: 'any', values: [Array] },
    specialized: { mode: 'any', values: [Array] },
    distance: { mode: 'custom', values: [Array] }
  },
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door drinks cocktail brewery whiskey bar',
  location: { lat: 30.1236224, lng: -81.4874624 },
  radius: 3000,
  mood: 'drinks',
  weather: null,
  weatherHint: 'clear',
  timeCategory: 'Snack',
  drinkMode: true,
  planAheadEnabled: false
}
🛰️ [/api/places] Proxying Places request {
  lat: 30.1236224,
  lng: -81.4874624,
  hasFilters: true,
  hasCombo: false,
  signals: {
    mood: 'drinks',
    weather: {
      bucket: null,
      condition: 'clear sky',
      temperatureC: 25.2,
      temperatureF: 77.3,
      humidity: 63,
      weatherHint: 'clear',
      source: 'openweather',
      durationMs: 202,
      lat: 30.1236224,
      lng: -81.4874624,
      fetchedAt: 1763500540357
    },
    prefs: { likes: [], dislikes: [] },
    timeCategory: 'Snack',
    weatherHint: 'clear',
    planAheadEnabled: false,
    drinkMode: true
  }
}
[fetchNearbyRestaurants] coords: { lat: 30.1236224, lng: -81.4874624 } filters: {
  region: { mode: 'any', selected: [] },
  experience: { mode: 'any', selected: [] },
  specialized: { mode: 'any', selected: [] },
  distance: { mode: 'custom', selected: [ 'near' ] }
} selectedCombo: null signals: {
  mood: 'drinks',
  weather: {
    bucket: null,
    condition: 'clear sky',
    temperatureC: 25.2,
    temperatureF: 77.3,
    humidity: 63,
    weatherHint: 'clear',
    source: 'openweather',
    durationMs: 202,
    lat: 30.1236224,
    lng: -81.4874624,
    fetchedAt: 1763500540357
  },
  prefs: { likes: [], dislikes: [] },
  timeCategory: 'Snack',
  weatherHint: 'clear',
  planAheadEnabled: false,
  drinkMode: true
}
🧭 Active Filters → {
  region: { mode: 'any', values: [ '*' ] },
  experience: { mode: 'any', values: [ '*' ] },
  specialized: { mode: 'any', values: [ '*' ] },
  distance: { mode: 'custom', values: [ 'Next Door' ] }
}
🔑 Applied Keywords → cocktail bar wine bar speakeasy taproom Next Door drinks cocktail brewery whiskey bar
📏 Radius → { radius: 3000, radiusSource: 'filters' }
🧮 Query Complexity → 13
⚠️ Query too complex; consider trimming signals. {
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door drinks cocktail brewery whiskey bar',
  score: 13
}
🎯 Using R1 combo for query: null
🌐 [API CALL] {
  endpoint: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=30.1236224%2C-81.4874624&radius=3000&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE&type=bar&opennow=true&keyword=cocktail+bar+wine+bar+speakeasy+taproom+Next+Door+drinks+cocktail+brewery+whiskey+bar',
  filters: {
    region: { mode: 'any', values: [Array] },
    experience: { mode: 'any', values: [Array] },
    specialized: { mode: 'any', values: [Array] },
    distance: { mode: 'custom', values: [Array] }
  },
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door drinks cocktail brewery whiskey bar',
  location: { lat: 30.1236224, lng: -81.4874624 },
  radius: 3000,
  mood: 'drinks',
  weather: null,
  weatherHint: 'clear',
  timeCategory: 'Snack',
  drinkMode: true,
  planAheadEnabled: false
}
📦 [API RESPONSE] { status: 200, ok: true, total: 0, sample: [] }
✅ Filtered 0/0 restaurants []
🚫 Excluded results: []
🏷️ R2 returnedPlaceIDs → []
📊 R2 Dedup Summary → { dedupedCount: 0, originalCount: 0 }
[fetchNearbyRestaurants] No live matches found — showing Oracle fallback.
📦 [API RESPONSE] { status: 200, ok: true, total: 0, sample: [] }
✅ Filtered 0/0 restaurants []
🚫 Excluded results: []
🏷️ R2 returnedPlaceIDs → []
📊 R2 Dedup Summary → { dedupedCount: 0, originalCount: 0 }
[fetchNearbyRestaurants] No live matches found — showing Oracle fallback.
 POST /api/places 200 in 416ms
 POST /api/places 200 in 482ms
 GET /dinnerdecider/randomize 200 in 33ms
 GET /dinnerdecider/randomize 200 in 1237ms
 GET /dinnerdecider 200 in 47ms
 GET /dinnerdecider/fetch 200 in 42ms
🛰️ [/api/places] Proxying Places request {
  lat: 30.1236224,
  lng: -81.4874624,
  hasFilters: true,
  hasCombo: false,
  signals: {
    mood: 'drinks',
    weather: {
      bucket: null,
      condition: 'clear sky',
      temperatureC: 25.2,
      temperatureF: 77.3,
      humidity: 63,
      weatherHint: 'clear',
      source: 'openweather',
      durationMs: 202,
      lat: 30.1236224,
      lng: -81.4874624,
      fetchedAt: 1763500540357
    },
    prefs: { likes: [], dislikes: [] },
    timeCategory: 'Snack',
    weatherHint: 'clear',
    planAheadEnabled: false,
    drinkMode: true
  }
}
[fetchNearbyRestaurants] coords: { lat: 30.1236224, lng: -81.4874624 } filters: {
  region: { mode: 'any', selected: [] },
  experience: { mode: 'any', selected: [] },
  specialized: { mode: 'any', selected: [] },
  distance: { mode: 'custom', selected: [ 'near', 'close' ] }
} selectedCombo: null signals: {
  mood: 'drinks',
  weather: {
    bucket: null,
    condition: 'clear sky',
    temperatureC: 25.2,
    temperatureF: 77.3,
    humidity: 63,
    weatherHint: 'clear',
    source: 'openweather',
    durationMs: 202,
    lat: 30.1236224,
    lng: -81.4874624,
    fetchedAt: 1763500540357
  },
  prefs: { likes: [], dislikes: [] },
  timeCategory: 'Snack',
  weatherHint: 'clear',
  planAheadEnabled: false,
  drinkMode: true
}
🧭 Active Filters → {
  region: { mode: 'any', values: [ '*' ] },
  experience: { mode: 'any', values: [ '*' ] },
  specialized: { mode: 'any', values: [ '*' ] },
  distance: { mode: 'custom', values: [ 'Next Door', 'Close By' ] }
}
🔑 Applied Keywords → cocktail bar wine bar speakeasy taproom Next Door Close By drinks cocktail brewery whiskey bar
📏 Radius → { radius: 8000, radiusSource: 'filters' }
🧮 Query Complexity → 15
⚠️ Query too complex; consider trimming signals. {
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door Close By drinks cocktail brewery whiskey bar',
  score: 15
}
🎯 Using R1 combo for query: null
🌐 [API CALL] {
  endpoint: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=30.1236224%2C-81.4874624&radius=8000&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE&type=bar&opennow=true&keyword=cocktail+bar+wine+bar+speakeasy+taproom+Next+Door+Close+By+drinks+cocktail+brewery+whiskey+bar',
  filters: {
    region: { mode: 'any', values: [Array] },
    experience: { mode: 'any', values: [Array] },
    specialized: { mode: 'any', values: [Array] },
    distance: { mode: 'custom', values: [Array] }
  },
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door Close By drinks cocktail brewery whiskey bar',
  location: { lat: 30.1236224, lng: -81.4874624 },
  radius: 8000,
  mood: 'drinks',
  weather: null,
  weatherHint: 'clear',
  timeCategory: 'Snack',
  drinkMode: true,
  planAheadEnabled: false
}
🛰️ [/api/places] Proxying Places request {
  lat: 30.1236224,
  lng: -81.4874624,
  hasFilters: true,
  hasCombo: false,
  signals: {
    mood: 'drinks',
    weather: {
      bucket: null,
      condition: 'clear sky',
      temperatureC: 25.2,
      temperatureF: 77.3,
      humidity: 63,
      weatherHint: 'clear',
      source: 'openweather',
      durationMs: 202,
      lat: 30.1236224,
      lng: -81.4874624,
      fetchedAt: 1763500540357
    },
    prefs: { likes: [], dislikes: [] },
    timeCategory: 'Snack',
    weatherHint: 'clear',
    planAheadEnabled: false,
    drinkMode: true
  }
}
[fetchNearbyRestaurants] coords: { lat: 30.1236224, lng: -81.4874624 } filters: {
  region: { mode: 'any', selected: [] },
  experience: { mode: 'any', selected: [] },
  specialized: { mode: 'any', selected: [] },
  distance: { mode: 'custom', selected: [ 'near', 'close' ] }
} selectedCombo: null signals: {
  mood: 'drinks',
  weather: {
    bucket: null,
    condition: 'clear sky',
    temperatureC: 25.2,
    temperatureF: 77.3,
    humidity: 63,
    weatherHint: 'clear',
    source: 'openweather',
    durationMs: 202,
    lat: 30.1236224,
    lng: -81.4874624,
    fetchedAt: 1763500540357
  },
  prefs: { likes: [], dislikes: [] },
  timeCategory: 'Snack',
  weatherHint: 'clear',
  planAheadEnabled: false,
  drinkMode: true
}
🧭 Active Filters → {
  region: { mode: 'any', values: [ '*' ] },
  experience: { mode: 'any', values: [ '*' ] },
  specialized: { mode: 'any', values: [ '*' ] },
  distance: { mode: 'custom', values: [ 'Next Door', 'Close By' ] }
}
🔑 Applied Keywords → cocktail bar wine bar speakeasy taproom Next Door Close By drinks cocktail brewery whiskey bar
📏 Radius → { radius: 8000, radiusSource: 'filters' }
🧮 Query Complexity → 15
⚠️ Query too complex; consider trimming signals. {
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door Close By drinks cocktail brewery whiskey bar',
  score: 15
}
🎯 Using R1 combo for query: null
🌐 [API CALL] {
  endpoint: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=30.1236224%2C-81.4874624&radius=8000&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE&type=bar&opennow=true&keyword=cocktail+bar+wine+bar+speakeasy+taproom+Next+Door+Close+By+drinks+cocktail+brewery+whiskey+bar',
  filters: {
    region: { mode: 'any', values: [Array] },
    experience: { mode: 'any', values: [Array] },
    specialized: { mode: 'any', values: [Array] },
    distance: { mode: 'custom', values: [Array] }
  },
  keyword: 'cocktail bar wine bar speakeasy taproom Next Door Close By drinks cocktail brewery whiskey bar',
  location: { lat: 30.1236224, lng: -81.4874624 },
  radius: 8000,
  mood: 'drinks',
  weather: null,
  weatherHint: 'clear',
  timeCategory: 'Snack',
  drinkMode: true,
  planAheadEnabled: false
}
📦 [API RESPONSE] {
  status: 200,
  ok: true,
  total: 3,
  sample: [
    'Coastal Wine & Tapas',
    'Really Good Beer Stop',
    'Toast With Cocktails'
  ]
}
✅ Filtered 3/3 restaurants [
  'Coastal Wine & Tapas (4.7)',
  'Really Good Beer Stop (4.5)',
  'Toast With Cocktails (5)'
]
🚫 Excluded results: []
🏷️ R2 returnedPlaceIDs → [
  'ChIJB6yfZ50x5IgRsPv-LXJlaQ8',
  'ChIJT_RFCOAx5IgRAQ8vh4KkPqw',
  'ChIJW4dpUlYt5IgRBC4Al3f6WgY'
]
📊 R2 Dedup Summary → { dedupedCount: 3, originalCount: 3 }
 POST /api/places 200 in 206ms
📦 [API RESPONSE] {
  status: 200,
  ok: true,
  total: 3,
  sample: [
    'Coastal Wine & Tapas',
    'Really Good Beer Stop',
    'Toast With Cocktails'
  ]
}
✅ Filtered 3/3 restaurants [
  'Coastal Wine & Tapas (4.7)',
  'Really Good Beer Stop (4.5)',
  'Toast With Cocktails (5)'
]
🚫 Excluded results: []
🏷️ R2 returnedPlaceIDs → [
  'ChIJB6yfZ50x5IgRsPv-LXJlaQ8',
  'ChIJT_RFCOAx5IgRAQ8vh4KkPqw',
  'ChIJW4dpUlYt5IgRBC4Al3f6WgY'
]
📊 R2 Dedup Summary → { dedupedCount: 3, originalCount: 3 }
 POST /api/places 200 in 317ms
 GET /dinnerdecider/randomize 200 in 47ms
 GET /dinnerdecider/output 200 in 33ms
🛰️ [/api/places] Proxying Places request {
  lat: 30.1236224,
  lng: -81.4874624,
  hasFilters: true,
  hasCombo: true,
  signals: {
    mood: 'drinks',
    weather: {
      bucket: null,
      condition: 'clear sky',
      temperatureC: 25.2,
      temperatureF: 77.3,
      humidity: 63,
      weatherHint: 'clear',
      source: 'openweather',
      durationMs: 202,
      lat: 30.1236224,
      lng: -81.4874624,
      fetchedAt: 1763500540357
    },
    prefs: { likes: [], dislikes: [] },
    timeCategory: 'Snack',
    weatherHint: 'clear',
    planAheadEnabled: false,
    drinkMode: true
  }
}
[fetchNearbyRestaurants] coords: { lat: 30.1236224, lng: -81.4874624 } filters: {
  region: { mode: 'any', selected: [] },
  experience: { mode: 'any', selected: [] },
  specialized: { mode: 'any', selected: [] },
  distance: { mode: 'custom', selected: [ 'near', 'close' ] }
} selectedCombo: {
  region: null,
  experience: null,
  specialized: null,
  distance: 'close'
} signals: {
  mood: 'drinks',
  weather: {
    bucket: null,
    condition: 'clear sky',
    temperatureC: 25.2,
    temperatureF: 77.3,
    humidity: 63,
    weatherHint: 'clear',
    source: 'openweather',
    durationMs: 202,
    lat: 30.1236224,
    lng: -81.4874624,
    fetchedAt: 1763500540357
  },
  prefs: { likes: [], dislikes: [] },
  timeCategory: 'Snack',
  weatherHint: 'clear',
  planAheadEnabled: false,
  drinkMode: true
}
🧭 Active Filters → {
  region: { mode: 'any', values: [ '*' ] },
  experience: { mode: 'any', values: [ '*' ] },
  specialized: { mode: 'any', values: [ '*' ] },
  distance: { mode: 'custom', values: [ 'Close By' ] }
}
🔑 Applied Keywords → cocktail bar wine bar speakeasy taproom Close By drinks cocktail brewery whiskey bar
📏 Radius → { radius: 8000, radiusSource: 'combo' }
🧮 Query Complexity → 13
⚠️ Query too complex; consider trimming signals. {
  keyword: 'cocktail bar wine bar speakeasy taproom Close By drinks cocktail brewery whiskey bar',
  score: 13
}
🎯 Using R1 combo for query: {
  region: null,
  experience: null,
  specialized: null,
  distance: 'close'
}
🌐 [API CALL] {
  endpoint: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=30.1236224%2C-81.4874624&radius=8000&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE&type=bar&opennow=true&keyword=cocktail+bar+wine+bar+speakeasy+taproom+Close+By+drinks+cocktail+brewery+whiskey+bar',
  filters: {
    region: { mode: 'any', values: [Array] },
    experience: { mode: 'any', values: [Array] },
    specialized: { mode: 'any', values: [Array] },
    distance: { mode: 'custom', values: [Array] }
  },
  keyword: 'cocktail bar wine bar speakeasy taproom Close By drinks cocktail brewery whiskey bar',
  location: { lat: 30.1236224, lng: -81.4874624 },
  radius: 8000,
  mood: 'drinks',
  weather: null,
  weatherHint: 'clear',
  timeCategory: 'Snack',
  drinkMode: true,
  planAheadEnabled: false
}
🛰️ [/api/places] Proxying Places request {
  lat: 30.1236224,
  lng: -81.4874624,
  hasFilters: true,
  hasCombo: true,
  signals: {
    mood: 'drinks',
    weather: {
      bucket: null,
      condition: 'clear sky',
      temperatureC: 25.2,
      temperatureF: 77.3,
      humidity: 63,
      weatherHint: 'clear',
      source: 'openweather',
      durationMs: 202,
      lat: 30.1236224,
      lng: -81.4874624,
      fetchedAt: 1763500540357
    },
    prefs: { likes: [], dislikes: [] },
    timeCategory: 'Snack',
    weatherHint: 'clear',
    planAheadEnabled: false,
    drinkMode: true
  }
}
[fetchNearbyRestaurants] coords: { lat: 30.1236224, lng: -81.4874624 } filters: {
  region: { mode: 'any', selected: [] },
  experience: { mode: 'any', selected: [] },
  specialized: { mode: 'any', selected: [] },
  distance: { mode: 'custom', selected: [ 'near', 'close' ] }
} selectedCombo: {
  region: null,
  experience: null,
  specialized: null,
  distance: 'close'
} signals: {
  mood: 'drinks',
  weather: {
    bucket: null,
    condition: 'clear sky',
    temperatureC: 25.2,
    temperatureF: 77.3,
    humidity: 63,
    weatherHint: 'clear',
    source: 'openweather',
    durationMs: 202,
    lat: 30.1236224,
    lng: -81.4874624,
    fetchedAt: 1763500540357
  },
  prefs: { likes: [], dislikes: [] },
  timeCategory: 'Snack',
  weatherHint: 'clear',
  planAheadEnabled: false,
  drinkMode: true
}
🧭 Active Filters → {
  region: { mode: 'any', values: [ '*' ] },
  experience: { mode: 'any', values: [ '*' ] },
  specialized: { mode: 'any', values: [ '*' ] },
  distance: { mode: 'custom', values: [ 'Close By' ] }
}
🔑 Applied Keywords → cocktail bar wine bar speakeasy taproom Close By drinks cocktail brewery whiskey bar
📏 Radius → { radius: 8000, radiusSource: 'combo' }
🧮 Query Complexity → 13
⚠️ Query too complex; consider trimming signals. {
  keyword: 'cocktail bar wine bar speakeasy taproom Close By drinks cocktail brewery whiskey bar',
  score: 13
}
🎯 Using R1 combo for query: {
  region: null,
  experience: null,
  specialized: null,
  distance: 'close'
}
🌐 [API CALL] {
  endpoint: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=30.1236224%2C-81.4874624&radius=8000&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE&type=bar&opennow=true&keyword=cocktail+bar+wine+bar+speakeasy+taproom+Close+By+drinks+cocktail+brewery+whiskey+bar',
  filters: {
    region: { mode: 'any', values: [Array] },
    experience: { mode: 'any', values: [Array] },
    specialized: { mode: 'any', values: [Array] },
    distance: { mode: 'custom', values: [Array] }
  },
  keyword: 'cocktail bar wine bar speakeasy taproom Close By drinks cocktail brewery whiskey bar',
  location: { lat: 30.1236224, lng: -81.4874624 },
  radius: 8000,
  mood: 'drinks',
  weather: null,
  weatherHint: 'clear',
  timeCategory: 'Snack',
  drinkMode: true,
  planAheadEnabled: false
}
📦 [API RESPONSE] {
  status: 200,
  ok: true,
  total: 2,
  sample: [ 'Toast With Cocktails', "Fionn MacCool's Irish Pub & Restaurant" ]
}
✅ Filtered 2/2 restaurants [
  'Toast With Cocktails (5)',
  "Fionn MacCool's Irish Pub & Restaurant (4.5)"
]
🚫 Excluded results: []
🏷️ R2 returnedPlaceIDs → [ 'ChIJW4dpUlYt5IgRBC4Al3f6WgY', 'ChIJY7vR3gcy5IgRmJ-gLkqzcW4' ]    
📊 R2 Dedup Summary → { dedupedCount: 2, originalCount: 2 }
 POST /api/places 200 in 1295ms
📦 [API RESPONSE] {
  status: 200,
  ok: true,
  total: 2,
  sample: [ 'Toast With Cocktails', "Fionn MacCool's Irish Pub & Restaurant" ]
}
✅ Filtered 2/2 restaurants [
  'Toast With Cocktails (5)',
  "Fionn MacCool's Irish Pub & Restaurant (4.5)"
]
🚫 Excluded results: []
🏷️ R2 returnedPlaceIDs → [ 'ChIJW4dpUlYt5IgRBC4Al3f6WgY', 'ChIJY7vR3gcy5IgRmJ-gLkqzcW4' ]    
📊 R2 Dedup Summary → { dedupedCount: 2, originalCount: 2 }
 POST /api/places 200 in 1315ms





Next steps 1. Did not see request_denied
Plan issue network>response images for response (plan_network_response.png) and initaitor (plan_network_initiator.png) can be ffound in docs\phase_9\Features folder:
{
    "error": "INVALID_REQUEST",
    "message": "Error while parsing 'fields' parameter: Unsupported field name 'utc_offset_minutes'. "
}






**2.** Supabase auth flow: create account with email/password, confirm profile auto-populates, update notification prefs + phone, sign out/in, and ensure profile data persists across reload.
QA Pass — 2025-11-19 retest (`docs/Phase_9/logs/2025-11-19_214442_test3_auth_flow.log`). Seeded users authenticated successfully, verification email delivered, and dashboard shows correct tier metadata.

**3.** DinnerContext sync: with env vars present, reload app to confirm supabaseConfigured flips true, observe login/profile routes rendering correctly, and ensure anonymous sessions still function when Supabase is unreachable.

QA Pass — both free and premium profiles sign in cleanly; premium badge (◇) visible after login (see log above).

Historical note: console diagnostics from the blocked 2025-11-19 morning run (pre-fix) retained below for reference (illustrates missing `NEXT_PUBLIC_SUPABASE_*` client vars).



window.__env console Output :


window.process?.env console output:
window.process?.env
undefined
process?.env console output : 
process?.env
VM2291:1 Uncaught ReferenceError: process is not defined
    at <anonymous>:1:1
(anonymous) @ VM2291:1

process?.env?.NEXT_PUBLIC_SUPABASE_URL console output :
VM2295:1 Uncaught ReferenceError: process is not defined
    at <anonymous>:1:1
(anonymous) @ VM2295:1

window.__env?.NEXT_PUBLIC_SUPABASE_URL console output :
window.__env?.NEXT_PUBLIC_SUPABASE_URL
undefined

process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY console output :
VM2303:1 Uncaught ReferenceError: process is not defined
    at <anonymous>:1:1
(anonymous) @ VM2303:1

window.__env?.NEXT_PUBLIC_SUPABASE_ANON_KEY console output :
window.__env?.NEXT_PUBLIC_SUPABASE_ANON_KEY
undefined





QA Sign-Off Tests

**1.** Plan Ahead overrides: verify autocomplete → place details → timezone fetch, confirm saved override changes dashboard headline and fetch results, then clear override and ensure state resets. QA Pass 
**2.** Supabase auth flow: create account with email/password, confirm profile auto-populates, update notification prefs + phone, sign out/in, and ensure profile data persists across reload. QA Pass — see `docs/Phase_9/logs/2025-11-19_214442_test3_auth_flow.log`.
**3.** DinnerContext sync: with env vars present, reload app to confirm supabaseConfigured flips true, observe login/profile routes rendering correctly, and ensure anonymous sessions still function when Supabase is unreachable. QA Pass — both free and premium tiers validated (◇ badge visible post-login).
**4.** Drinks + expanded Places: toggle “Drinks” vibe and confirm bar-only results, run standard moods to confirm cafes/dessert spots appear, and spot-check that meta flags show relaxed type filtering without regression. QA Pass





### 2025-11-20 – Group Session Regression Runs (In Progress)

#### Run 1 – 09:42
- **Log:** `docs/Phase_9/logs/2025-11-20_094229_test3_auth_flow.log`
- **Scenario:** Two anonymous browsers joined group `/dinnerdecider/group/P3Q95B`. User 1 completed the standard fetch → randomize → output flow; shortlist synced to User 2. Presence list and display name updates reflected in real time.
- **Findings:**
  - Hydration mismatch warning when shortlist renders (stack trace points to `src/app/dinnerdecider/group/[code]/page.js` ~729). Root cause: server HTML rendered the "Waiting on picks" card while the client immediately mounted the restaurant grid from `localStorage`.
  - First "Like" still auto-selects a winner. `handleVote` dispatch plus realtime broadcast immediately flips to the Winner card before other participants can react.
  - User 2 running "Don't care" filters surfaced zero results and threw an error toast on User 1’s screen; inspect Google Places payloads captured in the log.
- **Action items:** add hydration-safe bootstrap, decouple vote tally from `finalize`, and reproduce the zero-results error path.

#### Run 2 – 19:50
- **Log:** `docs/Phase_9/logs/2025-11-20_195045_test3_auth_flow.log`
- **Scenario:** Re-test after hydration guard update. New group `/dinnerdecider/group/R643E8`; both users remained anonymous. User 1 completed fetch/randomize/output, then User 2 repeated the flow with "Don't care" selections.
- **Findings:**
  - Hydration warning did **not** reappear, confirming the `createEmptySession` + deferred `loadSession` patch stabilised the initial render.
  - Group creation, invite, presence list, and first shortlist sync all pass. User 2 saw User 1’s results immediately.
  - Second round did not propagate: logs show repeated zero-result Google Places responses, leaving User 1’s shortlist unchanged.
  - Voting still auto-selects the first liked restaurant as the winner without waiting for `Finalize` (see screenshots `docs/Phase_9/Features/Group_Likes.png` and `Group_Finalize.png`).
- **Action items:**
  1. Investigate empty result sets when subsequent shortlists push to `session.restaurants`; compare payloads in `docs/Phase_9/logs/2025-11-20_195045_test3_auth_flow.log` with `src/lib/fetchNearbyRestaurants.js` query construction.
  2. Rework vote handling so `broadcast("vote")` merges scores across members without triggering `broadcast("finalize")` until users explicitly click "Finalize votes" or the timer elapses with consensus.
  3. Capture another two-browser log after the vote logic fix to move this workstream toward QA acceptance.

#### Run 3 – 20:14 (Test4 Group Party)
- **Log:** `docs/Phase_9/logs/2025-11-20_201452_test4_group_party.log`
- **Scenario:** Two anonymous browsers swapped host roles. Round 1 shortlist synced both ways; round 2 playlists stalled on the guest view even though the creator saw fresh restaurants. Timer-expired banner appeared after the first round; refreshing cleared it.
- **Findings:**
  - Timer prompt displays correctly, but each participant can only see their own vote chips. Finalize selects a winner, yet the chosen restaurant seems detached from the highest combined score.
  - When the guest generated a new shortlist, the host never saw the updated restaurants. Logs show `session.restaurants` stays unchanged despite API responses delivering results.
  - R2 keyword selection occasionally skews the Places request: e.g., Italian → Fine dining returns Mexican venues because the keywords array inherits "steakhouse seafood chef table farm to table" from the “special dinner” notes. Same effect observed for Mexican → Close By.
- **Action items:**
  1. Diff `handleVote` and broadcast merge logic so vote tallies share cross-client visibility; ensure `session.votes` merges rather than overwriting local state.
  2. Investigate why subsequent shortlist broadcasts do not update `session.restaurants` for non-owners—suspect `sessionRef.current` / version gating or `applyShortlist` guard.
  3. Add a backlog item to audit R2 keyword blending (Italian/Mexican combos pulling steakhouse terms) and consider opt-in/out gating for special dinner phrases.

First : Please update logs and Roadmap with the updates and QA signoff from the last test.
Second : As mentioned Vercel is deployed I have synced the main with the env, added the env var from .env.local, and it is live in the beta environment.

Third : Lets begin with the top item group session realtime, now that we have supabase connection up I ran another test with 2 different browsers in incognito/private mode User 1(not signed in) set up a group with one, ran through the flow, the flow appeared, User 1 sent the group ID to the user 2 (not signed in) user 2 opens the group, User 1 shows 2 people in group User 1 and guest, user 2 changes name, user 1 sees new name, user 2 sees the output of user 1 flow, user 2 goes and completes the flow and additional items are addeded to user 1's outputs.
The only thing still not working is the voting, when either user hits like it immediately becomes the winner.





Group session QA test:

User 1 created group QA pass
User 2 received and opened group with User 1 in group QA Pass 
user 1 saw when user 2 joined the group QA Pass
User 1 completed the flow and output arrived in user 2 and user 1 screen in group
- **User 2 had error below in their Group screen**
User 2 ran through the flow with dont care selected for all but didn't get any results
- **User 1 had error below in their Group screen**
User 1 naviagates off group screen and can return (not tested)
User 2 naviagates off group screen and can return (not tested)
Both users can naviage off group screen and can return (not tested)
User 1 hits like button (initial test passed not QA signoff until there are multiple resturants in group vote find screenshot Features\Group_Likes.png)
User 2 hits like button (it does not sign off on winner) (not tested)
A user hits "Finalize votes" button and it signs off on winner and winner is shown on User 1 and User 2 screen (initial test passed not QA signoff until there are multiple resturants in group vote find screenshot Features\Group_Finalize.png)




Hydration error:
## Error Type
Recoverable Error

## Error Message
Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

  ...
    <InnerScrollAndFocusHandler segmentPath={[...]} focusAndScrollRef={{apply:false, ...}}>
      <ErrorBoundary errorComponent={undefined} errorStyles={undefined} errorScripts={undefined}>
        <LoadingBoundary loading={null}>
          <HTTPAccessFallbackBoundary notFound={undefined} forbidden={undefined} unauthorized={undefined}>
            <RedirectBoundary>
              <RedirectErrorBoundary router={{...}}>
                <InnerLayoutRouter url="/dinnerdec..." tree={[...]} cacheNode={{lazyData:null, ...}} segmentPath={[...]}>
                  <SegmentViewNode type="page" pagePath="dinnerdeci...">
                    <SegmentTrieNode>
                    <ClientPageRoot Component={function GroupSessionPage} searchParams={{}} params={{code:"P3Q95B"}}>
                      <GroupSessionPage params={Promise} searchParams={Promise}>
                        <main className="min-h-[100...">
                          <div className="mx-auto ma...">
                            <div>
                            <div>
                            <div>
                            <div
+                             className="grid md:grid-cols-3 gap-4"
-                             className="rounded-xl bg-white/90 backdrop-blur p-6 text-center text-gray-700 border bor..."
                            >
+                             <div className="rounded-xl bg-white shadow p-4 flex flex-col">
-                             <h2 className="text-lg font-semibold text-teal-700">
                            ...
                          ...
                  ...
                ...
      ...



    at div (<anonymous>:null:null)
    at eval (src\app\dinnerdecider\group\[code]\page.js:729:10)
    at Array.map (<anonymous>:null:null)
    at GroupSessionPage (src\app\dinnerdecider\group\[code]\page.js:724:22)

## Code Frame
  727 | 								const negative = score < 0;
  728 | 								return (
> 729 | 									<div key={restaurant.name} className="rounded-xl bg-white shadow p-4 flex flex-col">
      | 									^
  730 | 										<Image
  731 | 											src={restaurant.photo || "/placeholder.jpg"}
  732 | 											alt={restaurant.name}

Next.js version: 15.5.4 (Webpack)







### 2025-11-21 – Group Session QA (Test4 Group Party)

- **Log:** `docs/Phase_9/logs/2025-11-21_135629_test4_group_party.log`
- **Participants:** Two anonymous browsers (User 1 host → share link to User 2).
- **Status:**
  - QA Pass — group creation, invite, rename, and presence list updates reflected on both clients.
  - QA Pass — User 2 received User 1’s initial shortlist with likes/avatars.
  - Blocked — guest-generated shortlists never appeared on the host after round one; refresh collapses back to host-only results (see `docs/Phase_9/Features/group_likes3.png`).
  - Blocked — User 2 “Don’t care” selection returned zero results, leaving User 1’s view unchanged.
  - Blocked — any “Like” immediately finalizes a winner locally; aggregate scores remain hidden and ignore the finalize button (see `docs/Phase_9/Features/group_likes4.png`).
- **Follow-ups:**
  - Inspect `applyShortlist` ownership/timeouts and realtime merge ordering so guest rounds propagate to all members.
  - Rework `handleVote` merge/broadcast to aggregate scores without firing `finalize` until users click “Finalize votes”.
  - Track R2 keyword blending anomaly (Italian/Mexican combos inheriting steakhouse terms) and design opt-in/out control for “special dinner” phrases.
  - Nov 21 patch deployed: shortlist takeover guard now allows immediate ownership on new rounds and vote handling uses a per-participant ledger. Schedule another two-browser capture to confirm the fixes before closing this scenario.

### 2025-11-21 – Group Session QA (Test4 Group Party, evening re-run)

- **Log:** `docs/Phase_9/logs/2025-11-21_171811_test4_group_party.log`
- **Environment:** Two anonymous browsers (host + guest) after terminating stray `powershell` processes (IDs 23932, 14812) to clear background noise; DinnerContext `specialModeEnabled` defaulted to off.
- **Status:**
  - Partial ✅ — group creation, invite flow, and first shortlist broadcast still succeed after the vote-ledger patch.
  - ❌ — guest shortlist generated in round two replaces the host’s board and wipes their votes; host never receives guest entries.
  - ❌ — vote tallies stay local: each participant only sees their likes/passes even after revive, so aggregate scores stay hidden until finalize forces a winner.
  - ⚠️ — finalize still chooses the highest local score and syncs the winner banner, but it relies on last-writer wins rather than merged totals.
- **Observations:**
  - Test 1 (see `Group_Likes5.png`, `Group_Likes6.png`): Guest 1 ran the flow and voted; Guest 2 eventually saw their own shortlist but overwrote Guest 1’s picks. Finalize returned a winner visible to both clients despite the scoped tallies.
  - Test 2 (see `Group_Link7.png`, `Group_Link8.png`): Guest 2 repeated the flow immediately; override reproduced and finalize was not re-tested. Confirms shortlist ownership still flips whenever a guest publishes results.
  - With the toggle off, the fetch logs still showed “steakhouse / chef table” anchors—tracked to the `specialModeEnabled` signal arriving as a truthy string. Normalization fix landed in `src/lib/fetchNearbyRestaurants.js` (see 2025-11-21 18:42 log entry) to limit anchors to true opt-ins.
- **Follow-ups:**
  - Re-test group sessions post-ledger snapshot sync to confirm cross-client tallies merge instead of overwriting.
  - Audit shortlist broadcast payloads so new rounds append instead of replacing the shared board; ensure host retains their picks when guest re-rolls.
  - Validate the special dinner toggle after the boolean normalization patch—repeat fetch with toggle off to confirm fallback anchors stay disabled.










C:\Application Development Projects\DinnerDecider\docs\Phase_9\logs\2025-11-21_201349_test4_group_party.log

Test 2 Both users open the group at the same time guest 1 does the flow and then the restaurants from group1 flow appears on guest1 and guest2 board, the voting is live between the 2 dashboards. guest2 goes through the flow and guest2's restuarants from the flow appear on the board along with guest1 restaurants, does not wipe out the existing votes or existing restaurants. both guest1 and guest2 see the restaurant flows output from guest1 and guest2 on the group dashboard, each can vote on the restaurants can be seen dynamically. guest2 restaurant pull overroad the existing pull and votest of guest1, this should not happen (Group_Likes12.png). Guest 2 restaurant pull should show up in the dashboard along side guest1 pull maintaining voting on guest1 restaruants.




Test 1 Guest1 creates group and completes the flow and votes then guest2 opens the group, the sees guest1 flow restaurants and choices(Group_Likes9.png), completes the flow and sees both guest1 and guest2 flow restaurants and choices. Currently this step guest2 is overriding guest 1's votes and restaurants, I am not sure if it's because of the timer ending the session (which I do not want) or because of the new pull just wiping out the information in the existing pull (Which I do not want). Both of the guests restaurant pulls should be visible with theire restaurants and like/pass selections. did not test finalize

Notes:
Timer is too short need it to be exteneded longer maybe to 5 minutes to test if it is triggering the switch/changeover(Group_Likes10.png) "Timer expired. Review the scores and click Finalize when everyone is ready."
It seems like the process is pulling the restaurants in prior to hitting the R2 button I thought we were only doing the Google map's pull at R2 because R1 was too complicated









Test 1 guest 1 console:
main-app.js?v=1763775536858:1170 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:216 🕒 TimeContext → Dinner
script.debug.js:1 [Vercel Web Analytics] Debug mode is enabled by default in development. No requests will be sent to the server.
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group Object
script.debug.js:1 [Vercel Speed Insights] Debug mode is enabled by default in development. No requests will be sent to the server.
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 3947ms
script.debug.js:1 [Vercel Speed Insights] [vitals] Object
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group/4HVKXZ Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:644 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:644 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:807 group_channel_subscribed Object
hot-reloader-app.js:197 [Fast Refresh] rebuilding
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:822 group_channel_request_state Object
report-hmr-latency.js:14 [Fast Refresh] done in 1542ms
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:644 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:807 group_channel_subscribed Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:822 group_channel_request_state Object
script.debug.js:1 [Vercel Speed Insights] [vitals] {speed: '4g', metrics: Array(2), scriptVersion: '0.1.3', sdkName: '@vercel/speed-insights/next', sdkVersion: '1.2.0'}
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 2517ms
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 1641ms
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 3405ms
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 1420ms
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:762 group_broadcast_request_state {from: 'BYUNBU2V29RT', self: 'VBG9A3K65GBA', restaurants: 1}
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 7828ms
2hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 789ms
report-hmr-latency.js:14 [Fast Refresh] done in 1825ms
script.debug.js:1 [Vercel Speed Insights] [vitals] {speed: '4g', metrics: Array(1), scriptVersion: '0.1.3', sdkName: '@vercel/speed-insights/next', sdkVersion: '1.2.0'}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:734 group_broadcast_state {from: 'BYUNBU2V29RT', version: 4, self: 'VBG9A3K65GBA'}
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 4411ms
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 1534ms


Test 1 guest 2 console:
main-app.js?v=1763775722350:1170 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:644 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:216 🕒 TimeContext → Dinner
script.debug.js:1 [Vercel Web Analytics] Debug mode is enabled by default in development. No requests will be sent to the server.
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group/4HVKXZ Object
script.debug.js:1 [Vercel Speed Insights] Debug mode is enabled by default in development. No requests will be sent to the server.
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:807 group_channel_subscribed Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:822 group_channel_request_state Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:734 group_broadcast_state Object
4HVKXZ:1 [Intervention] Images loaded lazily and replaced with placeholders. Load events are deferred. See https://go.microsoft.com/fwlink/?linkid=2048113
106Tracking Prevention blocked access to storage for <URL>.
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:787 group_broadcast_timer_expired Object
C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 7185ms
2C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 455ms
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 1807ms
script.debug.js:1 [Vercel Speed Insights] [vitals] {speed: '4g', metrics: Array(6), scriptVersion: '0.1.3', sdkName: '@vercel/speed-insights/next', sdkVersion: '1.2.0'}
C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 4434ms
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:787 group_broadcast_timer_expired {from: 'VBG9A3K65GBA', self: 'BYUNBU2V29RT', roundId: 3}
C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 1545ms




Test 2 guest 1 console :
react-dom-client.development.js:25631 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
:3003/favicon.ico:1 
        
        
       Failed to load resource: the server responded with a status of 404 (Not Found)
C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:216 🕒 TimeContext → Dinner
script.debug.js:1 [Vercel Web Analytics] Debug mode is enabled by default in development. No requests will be sent to the server.
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group Object
script.debug.js:1 [Vercel Speed Insights] Debug mode is enabled by default in development. No requests will be sent to the server.
script.debug.js:1 [Vercel Speed Insights] [vitals] Object
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group/6LMLX7 Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:644 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:644 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:807 group_channel_subscribed Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:822 group_channel_request_state Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:644 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:807 group_channel_subscribed Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:822 group_channel_request_state Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:762 group_broadcast_request_state Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:762 group_broadcast_request_state Object
script.debug.js:1 [Vercel Speed Insights] [vitals] Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:734 group_broadcast_state Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:787 group_broadcast_timer_expired Object
2hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 9306ms
report-hmr-latency.js:14 [Fast Refresh] done in 16236ms




Test 2 guest 2 console:
C:\Application Development Projects\DinnerDecider\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:25630 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:644 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:216 🕒 TimeContext → Dinner
script.debug.js:1 [Vercel Web Analytics] Debug mode is enabled by default in development. No requests will be sent to the server.
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group/6LMLX7 Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:644 group_channel_init Object
script.debug.js:1 [Vercel Speed Insights] Debug mode is enabled by default in development. No requests will be sent to the server.
10Tracking Prevention blocked access to storage for <URL>.
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:807 group_channel_subscribed Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:814 group_channel_send_state_on_join Object
script.debug.js:1 [Vercel Speed Insights] [vitals] Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:787 group_broadcast_timer_expired Object
C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 16404ms
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 21370ms







Nov-22-8:06am testing
no log
Test 2 Guest1 creates the group and sends it to Guest2 who opens it before any flows are run, guest 1 does the flow and then the restaurants from group1 flow appears on guest1 they did not appear on guest2 board (this was incorrect the flow should appear on both boards dyamically), since guest2 didnt see guest1's flow they did not see any voting(the voting is live between the 2 dashboards). guest2 goes through the flow and guest2's restuarants from the flow appear on the guest2 board still did not see guest1 flow or pics (Group_Likes13) (should appear on the board along with guest1 restaurants), boards were not connected (boards should be connected and should not does not wipe out the existing votes or existing restaurants) upon refresh of guest2 board it showed only guest1's flow and pics, guest2 ran through the flow again and it whiped out the guest2 board showing only their flow (should be dyanmic showing all restuarnts picked by group memebers and all of their picks). (should be that both guest1 and guest2 see the restaurant flows output from guest1 and guest2 on the group dashboard, each can vote on the restaurants can be seen dynamically.) but what actually happened guest2 group dashboard was not connected to guest1 group dashboard during this test which should not happen they should be dynamically synced to each otehr restaurant the existing pull and votest of guest1 should arrive and stay on guest2 board when guest2 runs the flow the restaurants should be added to both board and existing voting maintained.


Log : C:\Application Development Projects\DinnerDecider\docs\Phase_9\logs\2025-11-22_093415_test4_group_party.log
Test 3 is test 1 but without initial votes added in (so add restaurants from both guest1 and guest2 then the voting can begin)
This did the same as before kept them independent of each other, I did notice that when I updated a user's name that the dashboard flowed from the user to the others but it overwrote their existing information (guest1 had finished the flow, guest had finished their flow they were not dynamically connected [incorrect they should be] when I changed name of guest to guest2, all of guest's group dashboard information flowed downstream onto guest1's dashboard and clearing out guest1's flow and picks)(Group_Likes16.png, and Group_Likes17.png)


Notes : 
1. lets add a note to build in the timer functionality for a specific amount of time (maybe an 30 minutes or an hour) show it on the group dashboard but have it locked for not premium members and have a toast identifing feature is premium only but only allow a premium member who opens the group to have access to change the time on the group dashboard they create. only allow premium to change it up to 
2. On the group page (group_landing.png and group_landing2.png) where a user creates a group there is a your name bar above the create group button, this should be to add a name to a new group to get created the functionality entering anything doesn't change the actual user name in the group, so why not use this container to just name the group itself when creating a group, additionally the text in the containers is white which is hard to see when using the screen lets change the text to the same color as the rest of the text outside of buttons on the page, lets also change the Join group button to be the same color as the create group button
3. Is the reason this is not working because of supabase? I added a screenshot from the group_sessions supabase table and it seems like there is 4 entries for test 3 (group_Likes_Supa.png)
4. Also the background (breakfast, lunch, dinner) suggestions toggle I believe is not working see image (still_stuck_in_background_mode.png)


logs : C:\Application Development Projects\DinnerDecider\docs\Phase_9\logs\2025-11-22_090613_test4_group_party.log
Test 1 Guest1 creates group and completes the flow and votes then guest2 opens the group, the sees guest1 flow restaurants and choices(this passed), Guest2 completes the flow and but does not see guest1's flow or votes (this failed guest2 should see both guest1 and guest2 flow restaurants and choices after they comple their flow). Currently this step guest2 is overriding guest 1's votes and restaurants, the timer is no longer an issue which is helping the testing but I believe part of the issue is guest2 flow just wiping out the information in the existing pull either because an item from the existing flow is in the new flow and just resetting the dashboard or just overwriting all items on the dashboard (Which I do not want). Both of the guests restaurant pulls should be visible with their restaurants and like/pass selections after each and every concectutive pull. finalized was dyamic across the group and when selected even though each group member (guest1 and guest2) could not see the other members votes was still able to actualize the restaurant that had the highest votes and produce it on both guest1 and guest2 dashboard as the winner.



test 1 guest1 console logs: 
C:\Application Development Projects\DinnerDecider\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:25630 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
:3003/favicon.ico:1   Failed to load resource: the server responded with a status of 404 (Not Found)
C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:216 🕒 TimeContext → Breakfast
script.debug.js:1 [Vercel Web Analytics] Debug mode is enabled by default in development. No requests will be sent to the server.
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group Object
script.debug.js:1 [Vercel Speed Insights] Debug mode is enabled by default in development. No requests will be sent to the server.
C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 928ms
script.debug.js:1 [Vercel Speed Insights] [vitals] Object
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group/Z35Y77 Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:645 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:645 group_channel_init Object
C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:808 group_channel_subscribed Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:823 group_channel_request_state Object
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 737ms
C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:645 group_channel_init Object
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 5550ms
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:808 group_channel_subscribed Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:823 group_channel_request_state Object
script.debug.js:1 [Vercel Speed Insights] [vitals] {speed: '4g', metrics: Array(2), scriptVersion: '0.1.3', sdkName: '@vercel/speed-insights/next', sdkVersion: '1.2.0'}
C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 1915ms
C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 1750ms
C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
84Tracking Prevention blocked access to storage for <URL>.
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 1397ms
C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 1246ms
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:763 group_broadcast_request_state {from: '6L6CL5ZMLRGV', self: 'K3WQHVPSF97Y', restaurants: 15}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:735 group_broadcast_state {from: '6L6CL5ZMLRGV', version: 4, self: 'K3WQHVPSF97Y'}
C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding
C:\src\client\dev\report-hmr-latency.ts:26 [Fast Refresh] done in 1999ms
Z35Y77:1 [Intervention] Images loaded lazily and replaced with placeholders. Load events are deferred. See https://go.microsoft.com/fwlink/?linkid=2048113
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:735 group_broadcast_state {from: '6L6CL5ZMLRGV', version: 7, self: 'K3WQHVPSF97Y'}
C:\src\client\dev\hot-reloader\app\hot-reloader-app.tsx:278 [Fast Refresh] rebuilding

Test 1 guest2 console logs:
react-dom-client.development.js:25631 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
:3003/favicon.ico:1 
        
        
       Failed to load resource: the server responded with a status of 404 (Not Found)
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:645 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:216 🕒 TimeContext → Breakfast
script.debug.js:1 [Vercel Web Analytics] Debug mode is enabled by default in development. No requests will be sent to the server.
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group/Z35Y77 Object
script.debug.js:1 [Vercel Speed Insights] Debug mode is enabled by default in development. No requests will be sent to the server.
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:808 group_channel_subscribed Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:823 group_channel_request_state Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:735 group_broadcast_state Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:645 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:808 group_channel_subscribed Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:815 group_channel_send_state_on_join Object
script.debug.js:1 [Vercel Speed Insights] [vitals] Object
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 2006ms
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:808 group_channel_subscribed Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:815 group_channel_send_state_on_join Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:777 group_broadcast_finalize {from: 'K3WQHVPSF97Y', self: '6L6CL5ZMLRGV'}
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 4099ms






Test 2 Guest 2 console:

main-app.js?v=1763817251019:1170 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:645 group_channel_init {code: 'V2MJ6A', participantId: 'YUNA489JB6ZN'}
C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:216 🕒 TimeContext → Breakfast
script.debug.js:1 [Vercel Web Analytics] Debug mode is enabled by default in development. No requests will be sent to the server.
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group/V2MJ6A {o: 'http://localhost:3003/dinnerdecider/group/V2MJ6A', sv: '0.1.3', sdkn: '@vercel/analytics/react', sdkv: '1.5.0', ts: 1763817256786, …}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:955 [Intervention] Images loaded lazily and replaced with placeholders. Load events are deferred. See https://go.microsoft.com/fwlink/?linkid=2048113
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:645 group_channel_init {code: 'V2MJ6A', participantId: 'YUNA489JB6ZN'}
script.debug.js:1 [Vercel Speed Insights] Debug mode is enabled by default in development. No requests will be sent to the server.
34Tracking Prevention blocked access to storage for <URL>.
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:808 group_channel_subscribed {code: 'V2MJ6A', participantId: 'YUNA489JB6ZN'}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:823 group_channel_request_state {code: 'V2MJ6A', participantId: 'YUNA489JB6ZN'}
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:735 group_broadcast_state {from: 'FUE8332BKCDT', version: 4, self: 'YUNA489JB6ZN'}
C:\src\shared\lib\utils\warn-once.ts:6  Image with src "https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=AWn5SU5vGr6c9pruWyK6KyObD2k89KgDf18E0H6z63ZuIdaCp71yezHzSIkEeMvUfnFkNGJqWfn3gZyzegrX4BCfi7EvG4CwhdjaV5mj4_q8ds8-jja0arYVNGsAwwvuGmKmVv0DiL6g4OSYPPx7f57J9NEJx0K-WGMvqWsCHIOD7F78JN_xWvU222JLWbHhjv2BCFwYRItO0trj9BuW6FHpvd2GjyDtUX5jIjbuX3155nZMe0kVW1kWjXzx2B7OB6Km35Mc2Tp5dHXaJf51leAME8pDy6oeoN-EsQC9p8b4PMuTEjHa60PbRyzyUTiBGBAu0z-nhnY9XEOeDcKzC7zRU3maCCAcitFTF8u2VU0dJHos6wH52zZaz-r03K39j3zGYk6FhuWinP2sb8nxO4sgh6rWN1amD3OUIysXTZbfLin3DtbVCzZA72UsXxYvKk_x2WP65zEXyiT19DVvWjCusYMGjD-w00FWBablEy_jDevdEkV7xTR3jsFAEsgDSTy8Gjk707_YIQDRLto3lZk6jjc6np4JdWHG9pqwuHOUY_xGWO6WBvoLc6FHFphhsePZC-YQn5-uK3_r-A&key=AIzaSyCZKw349jOzUA1QW51OsrZo7m4sRIKzmOE" was detected as the Largest Contentful Paint (LCP). Please add the "priority" property if this image is above the fold.
Read more: https://nextjs.org/docs/api-reference/next/image#priority
warnOnce @ C:\src\shared\lib\utils\warn-once.ts:6
eval @ C:\src\shared\lib\get-img-props.ts:631
script.debug.js:1 [Vercel Speed Insights] [vitals] {speed: '4g', metrics: Array(6), scriptVersion: '0.1.3', sdkName: '@vercel/speed-insights/next', sdkVersion: '1.2.0'}

Guest1 Test 2:
react-dom-client.development.js:25631 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
:3003/favicon.ico:1 
        
        
       Failed to load resource: the server responded with a status of 404 (Not Found)
C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:216 🕒 TimeContext → Breakfast
script.debug.js:1 [Vercel Web Analytics] Debug mode is enabled by default in development. No requests will be sent to the server.
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group Object
script.debug.js:1 [Vercel Speed Insights] Debug mode is enabled by default in development. No requests will be sent to the server.
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 1252ms
script.debug.js:1 [Vercel Speed Insights] [vitals] Object
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group/V2MJ6A Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:645 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:645 group_channel_init Object
hot-reloader-app.js:197 [Fast Refresh] rebuilding
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:808 group_channel_subscribed Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:823 group_channel_request_state Object
report-hmr-latency.js:14 [Fast Refresh] done in 957ms
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:645 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:808 group_channel_subscribed Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:823 group_channel_request_state Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:763 group_broadcast_request_state Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:763 group_broadcast_request_state Object
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 4016ms
script.debug.js:1 [Vercel Speed Insights] [vitals] {speed: '4g', metrics: Array(2), scriptVersion: '0.1.3', sdkName: '@vercel/speed-insights/next', sdkVersion: '1.2.0'}
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 3255ms
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 7603ms
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 2020ms
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 1827ms
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:763 group_broadcast_request_state {from: 'YUNA489JB6ZN', self: 'FUE8332BKCDT', restaurants: 5}




2 issues popped up on when created group ran flow I looked up family friendly and budget friendly only the rest were opened, the flow showed the oracle message but the group pulled in, a supermarket appeared in the group below are the error logs and the console of the group.


error 1: 
 ## Error Type
Console Error

## Error Message
Encountered two children with the same key, `Trader Joe's`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at div (<anonymous>:null:null)
    at eval (src\app\dinnerdecider\group\[code]\page.js:954:10)
    at Array.map (<anonymous>:null:null)
    at GroupSessionPage (src\app\dinnerdecider\group\[code]\page.js:946:22)

## Code Frame
  952 | 								const negative = score < 0;
  953 | 								return (
> 954 | 									<div key={restaurant.name} className="rounded-xl bg-white shadow p-4 flex flex-col">
      | 									^
  955 | 										<Image
  956 | 											src={restaurant.photo || "/placeholder.jpg"}
  957 | 											alt={restaurant.name}

Next.js version: 15.5.4 (Webpack)


error :
## Error Type
Console Error

## Error Message
Encountered two children with the same key, `Trader Joe's`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at div (<anonymous>:null:null)
    at eval (src\app\dinnerdecider\group\[code]\page.js:954:10)
    at Array.map (<anonymous>:null:null)
    at GroupSessionPage (src\app\dinnerdecider\group\[code]\page.js:946:22)

## Code Frame
  952 | 								const negative = score < 0;
  953 | 								return (
> 954 | 									<div key={restaurant.name} className="rounded-xl bg-white shadow p-4 flex flex-col">
      | 									^
  955 | 										<Image
  956 | 											src={restaurant.photo || "/placeholder.jpg"}
  957 | 											alt={restaurant.name}

Next.js version: 15.5.4 (Webpack)


open group and run flow error console logs:

react-dom-client.development.js:25631 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
:3003/favicon.ico:1 
        
        
       Failed to load resource: the server responded with a status of 404 (Not Found)
C:\Application Development Projects\DinnerDecider\src\context\DinnerContext.jsx:216 🕒 TimeContext → Breakfast
script.debug.js:1 [Vercel Speed Insights] Debug mode is enabled by default in development. No requests will be sent to the server.
script.debug.js:1 [Vercel Web Analytics] Debug mode is enabled by default in development. No requests will be sent to the server.
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group Object
script.debug.js:1 [Vercel Speed Insights] [vitals] Object
script.debug.js:1 [Vercel Web Analytics] [pageview] http://localhost:3003/dinnerdecider/group/7R59YF Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:645 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:645 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:808 group_channel_subscribed Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:823 group_channel_request_state Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:645 group_channel_init Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:808 group_channel_subscribed Object
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:823 group_channel_request_state Object
script.debug.js:1 [Vercel Speed Insights] [vitals] {speed: '4g', metrics: Array(2), scriptVersion: '0.1.3', sdkName: '@vercel/speed-insights/next', sdkVersion: '1.2.0'}
hot-reloader-app.js:197 [Fast Refresh] rebuilding
report-hmr-latency.js:14 [Fast Refresh] done in 6121ms
C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:954 Encountered two children with the same key, `Trader Joe's`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
error @ intercept-console-error.js:57
eval @ react-dom-client.development.js:5735
runWithFiberInDEV @ react-dom-client.development.js:872
warnOnInvalidKey @ react-dom-client.development.js:5734
reconcileChildrenArray @ react-dom-client.development.js:5803
reconcileChildFibersImpl @ react-dom-client.development.js:6124
eval @ react-dom-client.development.js:6229
reconcileChildren @ react-dom-client.development.js:8783
beginWork @ react-dom-client.development.js:11129
runWithFiberInDEV @ react-dom-client.development.js:872
performUnitOfWork @ react-dom-client.development.js:15727
workLoopSync @ react-dom-client.development.js:15547
renderRootSync @ react-dom-client.development.js:15527
performWorkOnRoot @ react-dom-client.development.js:14991
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16816
performWorkUntilDeadline @ scheduler.development.js:45
<div>
exports.jsxDEV @ react-jsx-dev-runtime.development.js:323
eval @ C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:954
GroupSessionPage @ C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:946
react_stack_bottom_frame @ react-dom-client.development.js:23584
renderWithHooksAgain @ react-dom-client.development.js:6893
renderWithHooks @ react-dom-client.development.js:6805
updateFunctionComponent @ react-dom-client.development.js:9247
beginWork @ react-dom-client.development.js:10858
runWithFiberInDEV @ react-dom-client.development.js:872
performUnitOfWork @ react-dom-client.development.js:15727
workLoopSync @ react-dom-client.development.js:15547
renderRootSync @ react-dom-client.development.js:15527
performWorkOnRoot @ react-dom-client.development.js:14991
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16816
performWorkUntilDeadline @ scheduler.development.js:45
Show 29 more frames
Show less
8C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:954 Encountered two children with the same key, `Trader Joe's`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
error @ intercept-console-error.js:57
eval @ react-dom-client.development.js:5735
runWithFiberInDEV @ react-dom-client.development.js:872
warnOnInvalidKey @ react-dom-client.development.js:5734
reconcileChildrenArray @ react-dom-client.development.js:5776
reconcileChildFibersImpl @ react-dom-client.development.js:6124
eval @ react-dom-client.development.js:6229
reconcileChildren @ react-dom-client.development.js:8784
beginWork @ react-dom-client.development.js:11129
runWithFiberInDEV @ react-dom-client.development.js:872
performUnitOfWork @ react-dom-client.development.js:15727
workLoopSync @ react-dom-client.development.js:15547
renderRootSync @ react-dom-client.development.js:15527
performWorkOnRoot @ react-dom-client.development.js:14991
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16816
performWorkUntilDeadline @ scheduler.development.js:45
<div>
exports.jsxDEV @ react-jsx-dev-runtime.development.js:323
eval @ C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:954
GroupSessionPage @ C:\Application Development Projects\DinnerDecider\src\app\dinnerdecider\group\[code]\page.js:946
react_stack_bottom_frame @ react-dom-client.development.js:23584
renderWithHooksAgain @ react-dom-client.development.js:6893
renderWithHooks @ react-dom-client.development.js:6805
updateFunctionComponent @ react-dom-client.development.js:9247
beginWork @ react-dom-client.development.js:10858
runWithFiberInDEV @ react-dom-client.development.js:872
performUnitOfWork @ react-dom-client.development.js:15727
workLoopSync @ react-dom-client.development.js:15547
renderRootSync @ react-dom-client.development.js:15527
performWorkOnRoot @ react-dom-client.development.js:14991
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16816
performWorkUntilDeadline @ scheduler.development.js:45
Show 29 more frames
Show less
script.debug.js:1 [Vercel Speed Insights] [vitals] {speed: '4g', metrics: Array(1), scriptVersion: '0.1.3', sdkName: '@vercel/speed-insights/next', sdkVersion: '1.2.0'}
hot-reloader-app.js:197 [Fast Refresh] rebuilding

















Nov-22-8:06am testing
no log
Test 2 :
Name : No Primary Guest:
Scenerio testing : Guest1 creates the group and sends it to Guest2 who opens it before any flows are run, guest 1 does the flow and then the restaurants from group1 flow appears on guest1 they did not appear on guest2 board (this was incorrect the flow should appear on both boards dyamically), since guest2 didnt see guest1's flow they did not see any voting(the voting is live between the 2 dashboards). guest2 goes through the flow and guest2's restuarants from the flow appear on the guest2 board still did not see guest1 flow or pics (Group_Likes13) (should appear on the board along with guest1 restaurants), boards were not connected (boards should be connected and should not does not wipe out the existing votes or existing restaurants) upon refresh of guest2 board it showed only guest1's flow and pics, guest2 ran through the flow again and it whiped out the guest2 board showing only their flow (should be dyanmic showing all restuarnts picked by group memebers and all of their picks). (should be that both guest1 and guest2 see the restaurant flows output from guest1 and guest2 on the group dashboard, each can vote on the restaurants can be seen dynamically.) but what actually happened guest2 group dashboard was not connected to guest1 group dashboard during this test which should not happen they should be dynamically synced to each otehr restaurant the existing pull and votest of guest1 should arrive and stay on guest2 board when guest2 runs the flow the restaurants should be added to both board and existing voting maintained.


Log : 
Test 3
Name : Primary guest 1 no vote:
Scenerio testing : is test 1 but without initial votes added in (so add restaurants from both guest1 and guest2 then the voting can begin)
This did the same as before kept them independent of each other, I did notice that when I updated a user's name that the dashboard flowed from the user to the others but it overwrote their existing information (guest1 had finished the flow, guest had finished their flow they were not dynamically connected [incorrect they should be] when I changed name of guest to guest2, all of guest's group dashboard information flowed downstream onto guest1's dashboard and clearing out guest1's flow and picks)(Group_Likes16.png, and Group_Likes17.png)


Notes : 
1. lets add a note to build in the timer functionality for a specific amount of time (maybe an 30 minutes or an hour) show it on the group dashboard but have it locked for not premium members and have a toast identifing feature is premium only but only allow a premium member who opens the group to have access to change the time on the group dashboard they create. only allow premium to change it up to 
2. On the group page (group_landing.png and group_landing2.png) where a user creates a group there is a your name bar above the create group button, this should be to add a name to a new group to get created the functionality entering anything doesn't change the actual user name in the group, so why not use this container to just name the group itself when creating a group, additionally the text in the containers is white which is hard to see when using the screen lets change the text to the same color as the rest of the text outside of buttons on the page, lets also change the Join group button to be the same color as the create group button
3. Is the reason this is not working because of supabase? I added a screenshot from the group_sessions supabase table and it seems like there is 4 entries for test 3 (group_Likes_Supa.png)
4. Also the background (breakfast, lunch, dinner) suggestions toggle I believe is not working see image (still_stuck_in_background_mode.png)




logs : C:\Application Development Projects\DinnerDecider\docs\Phase_9\logs\2025-11-23_065307_test4_group_party.log
Test 2 :
Group : RR85E9
Name of test : Primary Guest1 :
Variation to standard test : No variation on standart test did not use plan ahead
Scenerio testing : 
Part 1 scenerio and actual events: (Pass)
Guest1 creates group and completes the flow and votes then guest2 opens the group, the sees guest1 flow restaurants and choices(this passed)

Part 2 scenerio :
Guest2 compeltes the flow return to the group, both guest1 and guest2 should see guest1's restaurants and votes and now see the restaurants from guest2 flow added to the group.

Part 2 actual events : (Partial-fail)
Guest2 compeltes the flow return to the group, both guest1 and guest2 should see guest1's restaurants and votes and Guest2 now sees the restaurants from guest2 flow added to the group. this is marked as a partial fail because although we were able to get the resturants to flow into guest2's dashboard and not remove the items from Guest1, on Guest1's group they never appeared. Attached is the supabase .png for this group (Group_Likes_supa2.png), it looks like there is no longer 4 entries but 2. so we are getting closer to the fix.

Part 3 scenerio and actual events :
after voting is finished either Guest1 or Guest2 selects finalize and the restaurant with the highest likes is populated on both guest1 and guest2 group page as the winner.






logs : C:\Application Development Projects\DinnerDecider\docs\Phase_9\logs\2025-11-23_055908_test4_group_party.log
Test 1 :
Group : 4S74XT
Name of test : Primary Guest1 :
Variation to standard test : I used the location functionality to set this test, so I think the items and issues identifed below can be logged and worked on.
Scenerio testing : 
Part 1 scenerio and actual events: (Pass)
Guest1 creates group and completes the flow and votes then guest2 opens the group, the sees guest1 flow restaurants and choices(this passed)

Part 2 scenerio :
Guest2 should compelte the flow return to the group, both guest1 and guest2 should see guest1's restaurants and votes and now see the restaurants from guest2 flow added to the group.

Part 2 actual events : ( fail)
Guest2 completes step 1 and 2 of the flow then received a message "No restaurants found" (Group_Likes_Guest2_No_rest_Loading.png) the parameters were location Jacksonville, FL, and Specialized : burger. This is a fail because Guest2 should be able to run the full flow and their restaurants should be added to the group with Guest1 not overriding the existing items. 

Part 3 scenerio and actual events :
after voting is finished either Guest1 or Guest2 selects finalize and the restaurant with the highest likes is populated on both guest1 and guest2 group page as the winner.


Issue 1 : (Plan_Ahead_Current_Location.png) I attempted to use the plan ahead functionality based on my current location but when "Current locationn" button was selected in the plan ahead page I received the error on the attached picture. This was logged in test 1
Issue 2 : I believe the near by parameter needs to be dialed in. I have seen that different restaurants outside of the nearby range have been popping up. can you review and iterate on how to improve. I believe this could be in part to the edge privacy mode and chrome incognito mode. If there is a way to test if this is dialed in already and it's only my browser that is providing inaccurate location mode then it's not an issue. Upon doing another test the near by results from chrome incognito were much closer and likely more accurate than edge privacy.
Note : Lets add a note for premium to have functionality in group to save a plan ahead for the group (Location, time, date)




Test 1 error received by guest1 after test when navigated out of the group by opening dinnerdecider main dashboard in a new window : 
## Error Type
Recoverable Error

## Error Message
Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

  ...
    <HTTPAccessFallbackBoundary notFound={<SegmentViewNode>} forbidden={undefined} unauthorized={undefined}>
      <HTTPAccessFallbackErrorBoundary pathname="/dinnerdec..." notFound={<SegmentViewNode>} forbidden={undefined} ...>
        <RedirectBoundary>
          <RedirectErrorBoundary router={{...}}>
            <InnerLayoutRouter url="/dinnerdec..." tree={[...]} cacheNode={{lazyData:null, ...}} segmentPath={[...]}>
              <SegmentViewNode type="layout" pagePath="dinnerdeci...">
                <SegmentTrieNode>
                <DinnerLayout>
                  <DinnerProvider>
                    <Header>
                      <header className="flex justi...">
                        <LinkComponent>
                        <nav className="flex items...">
                          <LinkComponent href="/dinnerdec..." className="px-3 py-1....">
                            <a
+                             className="px-3 py-1.5 rounded-lg transition transform hover:scale-[1.02] bg-emerald-100..."
-                             className="px-3 py-1.5 rounded-lg transition transform hover:scale-[1.02] bg-white text-..."
                              ref={function}
                              onClick={function onClick}
                              onMouseEnter={function onMouseEnter}
                              onTouchStart={function onTouchStart}
                              href="/dinnerdecider/plan"
                            >
+                             <span className="ml-1 text-xs">
                          ...
                    ...
            ...



    at span (<anonymous>:null:null)
    at Header (src\components\Header.jsx:23:41)
    at DinnerLayout (src\app\dinnerdecider\layout.js:8:7)

## Code Frame
  21 |           }`}
  22 |         >
> 23 |           Plan Ahead {planAheadActive ? <span className="ml-1 text-xs">●</span> : null}
     |                                         ^
  24 |         </Link>
  25 |         <Link
  26 |           href={authUser ? "/dinnerdecider/profile" : "/dinnerdecider/login"}

Next.js version: 15.5.4 (Webpack)



Console :

react-dom-client.development.js:4506 Uncaught Error: Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

  ...
    <HTTPAccessFallbackBoundary notFound={<SegmentViewNode>} forbidden={undefined} unauthorized={undefined}>
      <HTTPAccessFallbackErrorBoundary pathname="/dinnerdec..." notFound={<SegmentViewNode>} forbidden={undefined} ...>
        <RedirectBoundary>
          <RedirectErrorBoundary router={{...}}>
            <InnerLayoutRouter url="/dinnerdec..." tree={[...]} cacheNode={{lazyData:null, ...}} segmentPath={[...]}>
              <SegmentViewNode type="layout" pagePath="dinnerdeci...">
                <SegmentTrieNode>
                <DinnerLayout>
                  <DinnerProvider>
                    <Header>
                      <header className="flex justi...">
                        <LinkComponent>
                        <nav className="flex items...">
                          <LinkComponent href="/dinnerdec..." className="px-3 py-1....">
                            <a
+                             className="px-3 py-1.5 rounded-lg transition transform hover:scale-[1.02] bg-emerald-100..."
-                             className="px-3 py-1.5 rounded-lg transition transform hover:scale-[1.02] bg-white text-..."
                              ref={function}
                              onClick={function onClick}
                              onMouseEnter={function onMouseEnter}
                              onTouchStart={function onTouchStart}
                              href="/dinnerdecider/plan"
                            >
+                             <span className="ml-1 text-xs">
                          ...
                    ...
            ...

    at throwOnHydrationMismatch (react-dom-client.development.js:4506:11)
    at beginWork (react-dom-client.development.js:11107:17)
    at runWithFiberInDEV (react-dom-client.development.js:872:30)
    at performUnitOfWork (react-dom-client.development.js:15727:22)
    at workLoopConcurrentByScheduler (react-dom-client.development.js:15721:9)
    at renderRootConcurrent (react-dom-client.development.js:15696:15)
    at performWorkOnRoot (react-dom-client.development.js:14990:13)
    at performWorkOnRootViaSchedulerTask (react-dom-client.development.js:16816:7)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:45:48)







logs : C:\Application Development Projects\DinnerDecider\docs\Phase_9\logs\2025-11-23_073626_test4_group_party.log
Test 2 :
Group : 7YWVCN
Name of test : Primary Guest1 :
Variation to standard test : No variation on standart test did not use plan ahead
Scenerio testing : 
Part 1 scenerio and actual events: (Pass)
Guest1 creates group and completes the flow and votes then guest2 opens the group, the sees guest1 flow restaurants and choices(this passed)

Part 2 scenerio :
Guest2 compeltes the flow return to the group, both guest1 and guest2 should see guest1's restaurants and votes and now see the restaurants from guest2 flow added to the group.

Part 2 actual events : (Partial-fail)
Guest2 compeltes the flow return to the group, both guest1 and guest2 should see guest1's restaurants and votes and Guest2 now sees the restaurants from guest2 flow added to the group. this is marked as a partial fail because although we were able to get the resturants to flow into guest2's dashboard and not remove the items from Guest1, on Guest1's group the restaurants from Guest2'f flow never appeared. Attached is the supabase .png for this group (Group_Likes_supa3.png) there were 2 entries after the initial test and then I did a work around that allowed guest1 to see the full restaurant and vote list but a lot more entries were added. the workaround that hydrated guest1 was to update guest2's name to guest22, then on guest1's group all of the restaurants and votes from guest22 (previously guest2) flowed over.

Part 3 scenerio and actual events :
after voting is finished either Guest1 or Guest2 selects finalize and the restaurant with the highest likes is populated on both guest1 and guest2 group page as the winner.

Plan ahead precise location worked on chrome incognito mode so the intial error was probably captured on edge privacy window.