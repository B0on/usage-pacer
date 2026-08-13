# Phase 0 — MVP

Spec refs for every task: [brief.md](../brief.md), [architecture.md](../architecture.md), [conventions.md](../conventions.md).

### P0-1 — Scaffold MV3 + Vite + React

- **Goal:** Unpacked extension builds and loads; empty popup and service worker run.
- **Depends on:** —
- **Spec refs:** [architecture.md](../architecture.md) (layout), [conventions.md](../conventions.md), [testing-strategy.md](../testing-strategy.md)
- **Files:** `package.json`, `tsconfig.json`, `vite.config.ts`, `manifest.config.ts` or `public`/`manifest` via `@crxjs/vite-plugin`, `src/background/service-worker.ts`, `src/popup/main.tsx`, `src/popup/App.tsx`, `src/popup/index.html`, `.gitignore`
- **Steps:**
  1. Vite 6 + React + TypeScript strict + `@crxjs/vite-plugin` + Vitest.
  2. Manifest V3: `action.default_popup`, service worker, permissions `storage`, `cookies`, `alarms`; host_permissions `https://cursor.com/*`, `https://www.cursor.com/*`.
  3. Stub popup (“Usage Pacer”) and no-op worker.
  4. Scripts: `dev`, `build`, `test`, `typecheck`.
- **Acceptance:** `npm run typecheck` and `npm run build` succeed. `dist` loads in `chrome://extensions` as Usage Pacer.
- **Tests:** `npm test` runs (may be empty suite). Build is the gate.

### P0-2 — Pacing domain

- **Goal:** Pure functions turn a usage snapshot + `now` into pill values, badge text, pace color, and forecast.
- **Depends on:** P0-1
- **Spec refs:** [brief.md](../brief.md) (Pacing math, Badge color), [api-contracts.md](../api-contracts.md)
- **Files:** `src/domain/types.ts`, `src/domain/pacing.ts`, `src/domain/pacing.test.ts`
- **Steps:**
  1. Types: snapshot fields needed for math (`billingCycleStart/End`, `totalPercentUsed`, `onDemand`, `breakdown`, `apiPercentUsed`, `membershipType`, `fetchedAt`).
  2. Implement fractional-day math, `remainingPct` clamp, `deltaPct`, forecast, badge text for modes A/B/C, pace color + one-step escalate.
  3. Round badge remaining/used to integers; delta to integer; elapsed pill to one decimal.
- **Acceptance:** Screenshot case used 66.107, elapsed 92.4 → remaining 34, delta negative, color green, forecast lasts through reset. `remainingPct` never negative. Escalate does not use remaining% as a color input.
- **Tests:** Vitest table cases: start/end of cycle, mid, 66 vs 92.4, 100% used, zero elapsed, forecast before/after reset, color bands, escalate.

### P0-3 — Fetch usage-summary + cache

- **Goal:** Worker can detect session, GET `/api/usage-summary`, parse, and write `snapshot` without storing cookies.
- **Depends on:** P0-1, P0-2
- **Spec refs:** [api-contracts.md](../api-contracts.md), [architecture.md](../architecture.md) (Cache, Error states)
- **Files:** `src/cursor/client.ts`, `src/cursor/parse.ts`, `src/cursor/fixtures/usage-summary.json`, `src/storage/cache.ts`, unit tests
- **Steps:**
  1. `hasSessionCookie()` via `chrome.cookies.get` on `cursor.com` then `www.cursor.com`.
  2. `fetchUsageSummary()` → parse required fields; reject incomplete payloads.
  3. Cache get/set. Never write cookie values.
- **Acceptance:** Fixture JSON parses to snapshot. Missing cookie → signed-out result. 401 → signed-out. Bad JSON → `lastError`, previous snapshot kept.
- **Tests:** Parse fixture; invalid dates; mock fetch 200/401; mock cookies null.

### P0-4 — Elapsed ring icon + badge

- **Goal:** Toolbar shows the time ring and one pace-colored number.
- **Depends on:** P0-2, P0-3
- **Spec refs:** [brief.md](../brief.md) (Toolbar icon + badge), [design-system.md](../design-system.md)
- **Files:** `src/toolbar/icon.ts`, `src/toolbar/badge.ts`, wire from `src/background/service-worker.ts`
- **Steps:**
  1. Draw 16 and 32 rings from `averagePct`; empty track for signed-out/stale.
  2. Badge text for remaining / delta / used; colors green/yellow/red/grey.
  3. Dim grey badge when signed out with fresh cache.
- **Acceptance:** At elapsed ~92% the ring is nearly closed. Mode A `34`, B `-26`, C `66` for the screenshot fixture. Stale signed-out → `—`. Ring fill is product green, not pace red.
- **Tests:** Badge string helpers (pure). Icon function returns ImageData with non-zero alpha (if canvas available in Vitest; otherwise extract arc-angle helper and unit-test that).

### P0-5 — Popup two-pills UI

- **Goal:** Popup matches the Cycle Counter two-pill header plus MVP details.
- **Depends on:** P0-2, P0-3
- **Spec refs:** [brief.md](../brief.md) (Popup), [design-system.md](../design-system.md)
- **Files:** `src/popup/App.tsx`, styles, presentational components as needed
- **Steps:**
  1. Left pill used %, right pill elapsed (one decimal). Pace label, reset date (local), days left, forecast copy, Included/Bonus bars, API bar if needed, on-demand footnote, footer + Refresh.
  2. Signed-out CTA opens `https://cursor.com`.
  3. English copy only.
- **Acceptance:** Fixture render shows 66% vs 92.4, behind-pace label, no template card grid. API bar hidden when `apiPercentUsed === 0`.
- **Tests:** Render popup with fixture (Vitest + React Testing Library): pills text, forecast, sign-in state.

### P0-6 — Alarm, settings, signed-out wiring

- **Goal:** End-to-end loop: 15-minute refresh, badge mode setting, popup refresh, stale/sign-out rules applied to icon+badge+popup together.
- **Depends on:** P0-4, P0-5
- **Spec refs:** [architecture.md](../architecture.md) (Refresh, Error states, Cache)
- **Files:** worker message API, popup settings control for badge mode, alarm registration on install
- **Steps:**
  1. `chrome.alarms` 15 minutes; on install + startup fetch.
  2. Persist `badgeMode`; popup control A/B/C.
  3. Apply 24h stale rule consistently.
- **Acceptance:** Changing mode updates badge without a new fetch. Alarm exists after install. Manual refresh updates `fetchedAt`. Signed-out + stale cache shows `—` and sign-in.
- **Tests:** Stale vs fresh helpers. Message handler unit test with mocks. Manual: load unpacked, toggle mode, disable cookie, confirm `—` after 24h logic (inject old `fetchedAt` in storage).
