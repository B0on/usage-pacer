# Design system — popup + toolbar

Direction: **Cycle Counter sibling**, not a dashboard template. Dark field, two fat pills, little chrome.

## Tokens

| Token | Value | Use |
|-------|--------|-----|
| `--bg` | `#0b0b0b` | Popup background |
| `--pill-used` | olive green `#5a6b3a` | Right pill (actual used %) |
| `--pill-elapsed` | brighter green `#3d9a4a` | Left pill (elapsed / average %) |
| `--text-on-pill` | `#f4f4f0` | Left pill type |
| `--text-on-elapsed` | `#111111` | Right pill type (matches screenshot) |
| `--pace-green` | `#2f9e44` | Badge on/under pace |
| `--pace-yellow` | `#c9a227` | Badge slightly ahead |
| `--pace-red` | `#c44536` | Badge well ahead |
| `--pace-grey` | `#6b6b6b` | Signed-out / stale |
| `--ring-track` | `#2a2a2a` | Icon track |
| `--ring-fill` | `#3d9a4a` | Icon elapsed arc (not pace color) |

Type: geometric sans, tabular numbers, bold on pills. No default system card grid, no hero, no sidebar.

## Components

1. **Pills row** — two labeled rounded rects. Left: **Elapsed** (`92.4%`, one decimal). Right: **Used** (`66.1%`, one decimal). Same 0–100 scale. Caption sits above the number inside each pill.
2. **Pace label** — `Behind −26.3pt` / `Ahead +8.0pt` under the pills (one decimal, including `.0`).
3. **Meta** — plan name, `Resets on 18 Aug`, `N days left`, forecast sentence.
4. **Bars** — **Cursor Models** (`autoPercentUsed`) and **Other Models** (`apiPercentUsed`) with one decimal (e.g. `76.0%`, `0.0%`). Other Models hint is plan-specific (Pro $20 / Pro+ $70 / Ultra $400).
5. **Footer** — relative last-synced + Refresh. Sign-in CTA when cookie missing.
6. **Settings** — Badge (Remaining / Delta / Used) and Sync (5 min / 15 min / Manual). Same segmented control.

Popup width ~320px. Padding uneven on purpose (more below pills than above). Hover states on Refresh and settings.

## Toolbar

Icon is the elapsed ring (see [architecture.md](architecture.md)). Badge is Chrome’s native overlay; we only set text + background color tokens above. Badge text uses one decimal (including `.0`) when the string is 4 characters or fewer.
