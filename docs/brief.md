# Product Brief — Usage Pacer

Store name: **Usage Pacer**. Subtitle / description: **for Cursor**.  
Internal working name may still say Cursor Usage Pacer.  
Status: requirements locked. Architecture and Phase 0 tasks: [architecture.md](architecture.md), [todo.md](todo.md).

## Problem

Cursor usage resets on a personal billing date (`Usage limits reset`), not on the 1st of the month. The dashboard shows how much of the included pool is used, but it does not show whether that pace will last until reset.

Cycle Counter already solves this for arbitrary date ranges: compare **actual % used** against **linear average % by today** (`elapsed / total period`). The gap is that Cycle Counter makes the user pick start and end dates by hand.

## Concept

Fuse Cursor’s live usage % with Cycle Counter’s pacing idea.

- Read current usage % and the **Usage limits reset** date from Cursor (via `cursor.com`, using the user’s existing Chrome login).
- **Back-calculate** the billing-cycle window from that reset date. Do **not** ask the user to set dates.
- Show **used % vs linear average % for today**, plus remaining days and a depletion forecast.

This is a pacing tool, not a full AI-quota dashboard.

## Product decisions (locked)

| Area | Decision |
|------|----------|
| Store name | **Usage Pacer** (subtitle: for Cursor) |
| UI language | English only |
| Platform | Chrome extension, Manifest V3 |
| Data source | Auto-fetch from `cursor.com` using the logged-in Chrome session. Data stays on-device. No backend. |
| Surfaces | Toolbar **icon** (elapsed-time ring) + **badge** (one number) + **popup** on click |
| Toolbar icon | Canvas ring of `averagePct` (elapsed / total → 100% at reset). Always on. |
| Badge metric toggle | Settings: **A remaining %** / **B pace delta** / **C used %**. Color = pace |
| Badge % (mode A) | `remainingPct = max(0, 100 - totalPercentUsed)` |
| Badge color | Pace only. Green `deltaPct <= 0`, yellow `0 < deltaPct <= 10`, red `deltaPct > 10`. Escalate one step if forecast empties before reset. |
| Pacing model | Linear time with **fractional days** from UTC timestamps: `averagePct = elapsedDays / totalDays * 100` |
| Pace delta | `delta = actualUsedPct - averagePct`. Positive = ahead of schedule (risk). Negative = behind (headroom). |
| Timezone | Math in UTC instants. Display reset as a **local calendar date** (e.g. “Resets Aug 18”). |
| On-demand | Remaining clamps at 0. Popup notes “On-demand ON” and amount used. Not a billing product. |
| Signed-out | Cache younger than 24h → dim last-known badge. Else badge `—`. Popup prompts sign-in. |
| Popup | Two pills (elapsed % vs used %), days left, forecast, Cursor Models + Other Models bars, Badge + Sync settings |
| Out of MVP | Daily history chart, threshold notifications |
| Stack | TypeScript + Vite + React (popup), Manifest V3 |

## Pacing math

Let:

- `cycleStart` = `billingCycleStart` (UTC instant from `GET /api/usage-summary`)
- `cycleEnd` = `billingCycleEnd` (UTC instant = **Usage limits reset**)
- `now` = current UTC instant
- `MS_PER_DAY` = `86400000`
- `totalDays` = `(cycleEnd - cycleStart) / MS_PER_DAY` (fractional, not truncated)
- `elapsedDays` = `(now - cycleStart) / MS_PER_DAY` (clamped to `[0, totalDays]`)

Display `cycleEnd` as a calendar date in the **user’s local timezone**. Do not convert the window to local midnights for the math.

Then:

```
averagePct     = elapsedDays / totalDays * 100
actualUsedPct  = totalPercentUsed          // from API, already a percent
remainingPct   = max(0, 100 - actualUsedPct)
deltaPct       = actualUsedPct - averagePct
daysLeft       = (cycleEnd - now) / MS_PER_DAY
```

Depletion forecast (linear from current actual rate, not from the average line):

```
if actualUsedPct <= 0 or elapsedDays <= 0:
  forecast = unknown
else:
  projectedEmptyDay = cycleStart + totalDays * (100 / actualUsedPct) * (elapsedDays / totalDays)
  // equivalent: cycleStart + elapsedDays * (100 / actualUsedPct)
```

Compare `projectedEmptyDay` to `cycleEnd`:

- Empty **before** reset → “this pace runs out N days early”
- Empty **on or after** reset → “this pace lasts through reset”

## Toolbar icon + badge

Chrome allows **one** badge string (about 2–4 characters) on the extension icon. Two numbers cannot sit side-by-side on the toolbar the way Cycle Counter’s pills do. Usage Pacer splits the two signals across **icon** and **badge**:

| Channel | What it shows | Popup mapping |
|---------|----------------|----------------|
| **Icon (always)** | Ring filled to `averagePct` (elapsed time → 100% at reset) | Elapsed pill `92.4` |
| **Badge (toggle)** | One number + pace color | Used pill `66.1%` or remaining |

Near reset, the ring is almost a full circle. That is the “subscription is about to renew, spend what’s left” cue — without needing a second badge.

### Icon

Draw at 16×16 and 32×32 via `chrome.action.setIcon` (OffscreenCanvas in the service worker).

- Dark track circle, **arc fill** clockwise from 12 o’clock, proportional to `averagePct` (0–100).
- Fill color is **neutral / product green**, not pace red. The ring is time, not usage.
- At `averagePct ≈ 92`, the ring is nearly closed → reset is imminent.
- Signed-out, no cache: empty grey track. Stale cache (< 24h): ring still drawn from last snapshot, muted.

### Badge text

Chrome’s overlay is readable at **4 characters** and may truncate at 5. Format with **one decimal** (including `.0`) when that string is 4 characters or fewer; otherwise drop to an integer.

| Mode | Text | Example at used 66.107% / elapsed 92.4% |
|------|------|------------------------------------------|
| **A (default)** | Remaining % | `33.9` (`100.0` would be 5 characters → `100`) |
| **B** | Pace delta | `-26` (`-26.3` is 5 characters). Behind = healthy. `+9.0` / `-9.4` still fit |
| **C** | Used % (`totalPercentUsed`) | `66.1` |

Color is **pace only**. Remaining % being low at the end of a well-paced cycle must not force red.

Base:

- Green: `deltaPct <= 0`
- Yellow: `0 < deltaPct <= 10`
- Red: `deltaPct > 10`

Escalate **one step** if the depletion forecast empties **before** `cycleEnd` (already-empty with days left counts as emptying before reset):

- Green → yellow
- Yellow → red
- Red stays red

Worked example (the screenshot): used **66.107%**, elapsed **92.4%**, `delta = -26.3`.

- Icon ring ≈ 92% closed (reset soon).
- Mode A: green `33.9` — ~34% quota left, month almost over → spend.
- Mode B: green `-26` (one decimal would be 5 characters).
- Mode C: green `66.1`.

On-demand does not change the number: remaining stays `0` (never negative, never `+12` overage on the badge).

Signed-out / stale:

- Cookie missing, cache **< 24h**: show last-known text, **grey / dim** background; ring from cache.
- Cookie missing, no cache or cache **≥ 24h**: badge text `—`, grey; empty ring.

## Popup (MVP)

UI copy is **English**.

1. **Header pills (Cycle Counter layout):** left = **Elapsed** (linear average time through the cycle, e.g. `92.4%`), right = **Used** (`totalPercentUsed`, e.g. `66.1%`). Same 0–100 scale. Each pill has a short caption so the two numbers are not unlabeled. Used < Elapsed → surplus (spend before reset). Used > Elapsed → ahead (slow down).
2. Plan label (`membershipType`), reset date in local time (“Resets on 18 Aug”).
3. **Pace row:** `Ahead +4.5pt` / `Behind −4.5pt` (numeric delta; the pills already show the two %).
4. **Days left** until reset (from fractional `daysLeft`, displayed as a whole number of days).
5. **Forecast:** “At this pace, empty on DATE (N days before reset)” or “At this pace, lasts through reset”.
6. **Breakdown:** **Cursor Models** and **Other Models** usage bars (`autoPercentUsed` / `apiPercentUsed`), one decimal like the pills (e.g. `76.0%` / `0.0%`). Other Models footnote uses the plan’s included API floor (Pro $20, Pro+ $70, Ultra $400).
7. **On-demand:** if `onDemand.enabled`, footnote “On-demand ON” and `onDemand.used` when `used > 0`. Remaining % still clamps at 0.
8. Footer: last synced time + Refresh. Settings: Badge (Remaining / Delta / Used) and Sync (5 min / 15 min / Manual). If not signed in to `cursor.com`, prompt to open Cursor login. Grey `—` (or dim last-known) on the badge as above.

## What “the badge %” represents

Confirmed against a live `cursor.com/dashboard/usage` session (2026-08-13). Cursor does **not** expose a simple “Other Models vs Cursor Models” split on the current dashboard. Instead the plan usage is a single structure:

```json
"plan": {
  "used": 2000,
  "limit": 2000,
  "remaining": 0,
  "breakdown": { "included": 2000, "bonus": 20807, "total": 22807 },
  "autoPercentUsed": 76.02,
  "apiPercentUsed": 0,
  "totalPercentUsed": 66.11
}
```

Interpretation:

- **`included` (2000)** — the purchased cap.
- **`bonus` (20807)** — free provider bonus on top of included.
- **`total` (22807)** = `included + bonus`.
- **`totalPercentUsed` (66.11%)** — % of the total included usage (purchased + bonus) that has been used. **This is the pacing target.**
- **`autoPercentUsed` (76.02%)** — auto-selected-model sub-metric; not the user-facing headline.
- **`apiPercentUsed` (0%)** — separate API/named-model usage.

The decisive evidence is the user-facing copy Cursor returns in the same payload:

```json
"autoModelSelectedDisplayMessage": "You've used 66% of your included total usage",
"namedModelSelectedDisplayMessage": "You've used 0% of your included API usage"
```

The **“You've used 66%”** headline maps to `totalPercentUsed`. This is the number Cursor shows the user, so it is the metric the user recognizes and the one to pace.

**Decision:**

- Badge = **`totalPercentUsed`** (the user-facing “included total usage” %). When it hits 100%, the included allowance is exhausted — matches the user’s mental model of “used it all”.
- Popup = `included` vs `bonus` bars (used / limit), plus `apiPercentUsed` if non-zero.

Do **not** use `autoPercentUsed` for the badge: it is an auto-model sub-metric that does not match what the user sees.

## Data acquisition (research)

This is unofficial, reverse-engineered from the Cursor web dashboard and existing OSS trackers. Endpoints can change without notice.

### Auth

- Cookie name: `WorkosCursorSessionToken`
- Value shape: `sub::jwt` (`::` URL-encoded as `%3A%3A`)
- Flag: **httpOnly** — page JS cannot read it via `document.cookie`
- Chrome extensions **can** read it with `cookies` permission + host access to `cursor.com` via `chrome.cookies.getAll` / `chrome.cookies.get`
- POST dashboard endpoints also require header `Origin: https://cursor.com` (CSRF)

The extension never stores the raw cookie in `storage`. It reads it at fetch time and sends it only to `https://cursor.com`.

### Endpoints (verified live, 2026-08-13)

All verified with a logged-in `cursor.com` session. **Primary fetch target is `GET /api/usage-summary`** — one request returns the cycle window, all percentage fields, plan breakdown, and on-demand state.

| Purpose | Method | Path | Key fields returned |
|---------|--------|------|---------------------|
| **Cycle + usage (primary)** | GET | `/api/usage-summary` | `billingCycleStart`, `billingCycleEnd`, `membershipType`, `isUnlimited`, `individualUsage.plan{used,limit,remaining,breakdown{included,bonus,total},autoPercentUsed,apiPercentUsed,totalPercentUsed}`, `individualUsage.onDemand{enabled,used}` |
| Identity | GET | `/api/auth/me` | `email`, `name`, `sub`, `id` |
| Cycle start (legacy) | GET | `/api/usage?user=<id>` | `startOfMonth` |
| Current-period % + model list | POST | `/api/dashboard/get-current-period-usage` | `billingCycleStart/End` (ms epoch), `planUsage{...same %s}`, `spendLimitUsage{limitType}`, `autoBucketModels[]` |
| Per-model tokens + cost | POST | `/api/dashboard/get-aggregated-usage-events` | `aggregations[]{modelIntent,inputTokens,outputTokens,cacheReadTokens,totalCents,tier}`, `totalInputTokens`, `totalOutputTokens`, `totalCostCents` |

Live sample (Pro account, 2026-08-13):

```json
{
  "billingCycleStart": "2026-07-18T10:36:57.000Z",
  "billingCycleEnd": "2026-08-18T10:36:57.000Z",
  "membershipType": "pro",
  "limitType": "user",
  "isUnlimited": false,
  "individualUsage": {
    "plan": {
      "used": 2000, "limit": 2000, "remaining": 0,
      "breakdown": { "included": 2000, "bonus": 20807, "total": 22807 },
      "autoPercentUsed": 76.02333333333333,
      "apiPercentUsed": 0,
      "totalPercentUsed": 66.10724637681159
    },
    "onDemand": { "enabled": false, "used": 0, "limit": null, "remaining": null }
  },
  "teamUsage": {}
}
```

Notes:

- `billingCycleEnd` is the **“Usage limits reset”** instant (ISO 8601, UTC). `billingCycleStart` is the cycle start — derive `totalDays` from these two. No manual date input needed.
- POST dashboard endpoints require header `Origin: https://cursor.com` (CSRF) and a JSON body (`{}`).
- `plan.remaining` is 0 even though the cycle is not over: `included` (2000) is exhausted but `bonus` (20807) is still in effect. Pacing must target `totalPercentUsed` (the user-facing %), not `remaining` or `autoPercentUsed`.

If the user is not logged in, show a “Sign in at cursor.com” state. Do not scrape the desktop Cursor app; the extension can only see the **web** session.

### Permissions (expected)

```json
{
  "permissions": ["storage", "cookies", "alarms"],
  "host_permissions": ["https://cursor.com/*", "https://www.cursor.com/*"]
}
```

Background alarm: user setting **5 min** / **15 min** (default) / **Manual**. Popup open and the Refresh button always fetch.

## Privacy

- Local-only. No telemetry, no third-party analytics, no remote backend.
- Session cookie is used only to call Cursor’s own APIs.
- Cached usage snapshots stay in `chrome.storage.local`.

## Non-goals (this version)

- Tracking Claude, ChatGPT, Copilot, or other products
- Reading Cursor desktop app settings or local SQLite
- Manual date pickers (Cycle Counter style)
- Spend / on-demand dollar tracking as a billing product (popup may note on-demand state only)
- Localized UI (English only)

## Open questions

None. Requirements are locked.

## Resolved

Live verification (2026-08-13):

- **Field mapping** — `totalPercentUsed` is the pacing target (the user-facing “included total usage” %). No “Other Models / Cursor Models” split exists on the current dashboard; the split is `included` vs `bonus`.
- **Reset date** — `billingCycleEnd` from `GET /api/usage-summary`. No manual input.
- **On-demand exposure** — `individualUsage.onDemand.enabled` is available.

Product lock (2026-08-13):

- **Badge color** — pace only; one-step escalate if forecast empties before reset.
- **Timezone** — fractional UTC days for math; local calendar date for display.
- **On-demand display** — remaining clamps at 0; popup notes on-demand.
- **Signed-out** — dim last-known if cache < 24h, else `—`.
- **Popup bars** — Cursor Models (`autoPercentUsed`) and Other Models (`apiPercentUsed`), one decimal.
- **UI language** — English.
- **Toolbar encoding** — Icon ring = `averagePct` (cycle progress). Badge = remaining / delta / used. Popup always shows both pills.
- **Percents** — Popup always one decimal. Toolbar badge one decimal when the string fits in 4 characters.
- **Background sync** — 5 min / 15 min (default) / Manual. Popup open and Refresh always fetch.

## References

- [Cursor usage limits](https://cursor.com/help/models-and-usage/usage-limits)
- [Cursor models and pricing](https://cursor.com/docs/models-and-pricing)
- Unofficial dashboard API notes: [gist](https://gist.github.com/dmwyatt/1e9359b1862e7cbfe1e754fe4c8db764), [cursor-usage HOW_THIS_WAS_BUILT](https://github.com/javaisbetterthanpython/cursor-usage/blob/main/docs/HOW_THIS_WAS_BUILT.md)
- Cycle Counter (this product’s pacing metaphor): sibling Chrome extension that uses a user-chosen date range instead of Cursor’s reset date
