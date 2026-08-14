# Todo

Legend: `[ ]` open · `[x]` done. `_deps:` must all be `[x]` before starting.

Master: [brief.md](brief.md) · Architecture: [architecture.md](architecture.md) · Phase 0 specs: [tasks/phase-0.md](tasks/phase-0.md)

## Planning

- [x] Lock product brief (Usage Pacer)
- [x] Write architecture + task board

## Phase 0 — MVP

- [x] **P0-1** Scaffold MV3 + Vite + React _deps: —_
- [x] **P0-2** Pacing domain _deps: P0-1_
- [x] **P0-3** Fetch usage-summary + cache _deps: P0-1, P0-2_
- [x] **P0-4** Elapsed ring icon + badge _deps: P0-2, P0-3_
- [x] **P0-5** Popup two-pills UI _deps: P0-2, P0-3_
- [x] **P0-6** Alarm, settings, signed-out wiring _deps: P0-4, P0-5_

## Shipped after MVP

- [x] Popup pool bars + pill labels + hardening (plan copy, 401, alarm, cache)
- [x] One-decimal percents in toolbar badge (4-character cap) and popup
- [x] Popup sync interval setting (5 min / 15 min / Manual)
- [x] Store listing copy and assets (`store-assets/`)
- [x] Public GitHub hygiene (MIT license, README, CI, privacy policy)

## Later

- [ ] Daily history chart
- [ ] Threshold notifications
