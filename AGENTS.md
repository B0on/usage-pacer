# AGENTS

Usage Pacer — Chrome MV3 extension. Product: [docs/brief.md](docs/brief.md).

## How to implement

1. Read this file, [docs/todo.md](docs/todo.md), and the relevant spec in [docs/](docs/).
2. Phase 0 MVP is **done**. Historical task specs: [docs/tasks/phase-0.md](docs/tasks/phase-0.md).
3. Open work is under **Later** in [docs/todo.md](docs/todo.md). Do not start those unless the user asks.

## Doc map

| Doc | Role |
|-----|------|
| [docs/brief.md](docs/brief.md) | Product truth |
| [docs/architecture.md](docs/architecture.md) | Runtime, cache, layers |
| [docs/api-contracts.md](docs/api-contracts.md) | `GET /api/usage-summary` |
| [docs/design-system.md](docs/design-system.md) | Pills, colors, popup |
| [docs/conventions.md](docs/conventions.md) | Layout, git, DoD |
| [docs/testing-strategy.md](docs/testing-strategy.md) | Vitest + manual |
| [docs/audit-gaps.md](docs/audit-gaps.md) | Known risks |
| [store-assets/](store-assets/) | Chrome Web Store copy and images |
| [PRIVACY.md](PRIVACY.md) | Privacy policy (public URL for the store listing) |

## Guardrails

- Do not store `WorkosCursorSessionToken` or log it.
- Do not call extra Cursor POSTs in MVP.
- Do not use `autoPercentUsed` or `plan.remaining` for pacing.
- Do not paint the elapsed ring with pace red/yellow.
- Do not add history charts or notifications unless asked.
- English only in UI and docs.

## Definition of done

Match [docs/brief.md](docs/brief.md) and [docs/architecture.md](docs/architecture.md). Tests in [docs/testing-strategy.md](docs/testing-strategy.md). `npm test`, `npm run typecheck`, `npm run build`. Update [docs/todo.md](docs/todo.md) when a listed item ships.
