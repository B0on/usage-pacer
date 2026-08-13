# Testing strategy

## Pyramid

| Layer | Tool | What |
|-------|------|------|
| Unit (required) | Vitest | `src/domain/*` pacing, color, forecast, parse of fixture JSON |
| Unit | Vitest | cookie-absent / 401 mapping, cache stale vs fresh (mock `chrome`) |
| Manual | Load unpacked | Icon ring, badge modes, popup pills, sign-out |

No Playwright/e2e in MVP (Chrome-extension auth is session-bound). Coverage target: **domain + parse ≥ 80%**. UI may stay fixture-rendered without 80% of React.

## Commands (after P0-1)

```
npm test
npm run typecheck
npm run build
```

## Fixtures

Keep `src/cursor/fixtures/usage-summary.json` from the live 2026-08-13 sample in [brief.md](brief.md). Do not commit cookies.
