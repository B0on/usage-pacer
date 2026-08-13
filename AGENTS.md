# AGENTS

Usage Pacer — Chrome MV3 extension. Product: [docs/brief.md](docs/brief.md).

## How to implement

1. Read this file, [docs/todo.md](docs/todo.md), and the task section in [docs/tasks/phase-0.md](docs/tasks/phase-0.md).
2. Use the **task-implement** skill. One task ID per branch.
3. First unblocked task: **P0-1**.

```
feature/p0-1-scaffold
```

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

## Guardrails

- Do not store `WorkosCursorSessionToken` or log it.
- Do not call extra Cursor POSTs in MVP.
- Do not use `autoPercentUsed` or `plan.remaining` for pacing.
- Do not paint the elapsed ring with pace red/yellow.
- Do not add history charts or notifications.
- English only in UI and docs.

## Definition of done

Task acceptance + tests in the spec, `typecheck`/`build` after P0-1, checkbox in `docs/todo.md`.
