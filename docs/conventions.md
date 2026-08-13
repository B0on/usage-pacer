# Conventions

## Language

Source, comments, commits, and `docs/` are English. UI copy is English.

## Layout

```
src/background/   service worker entry
src/cursor/       fetch + parse
src/domain/       pure math (no chrome)
src/popup/        React popup
src/storage/      chrome.storage.local
src/toolbar/      icon + badge
```

## Code

- TypeScript strict. Prefer small pure functions in `src/domain/`.
- Do not mutate snapshots; return new objects.
- Never log cookies, JWT fragments, or raw `WorkosCursorSessionToken`.
- No `console.log` in shipped popup/worker except `console.error` for unexpected failures (no secrets).

## Git

- Branch: `feature/p0-n-short-slug`
- Commits: `feat:` / `fix:` / `chore:` / `test:` / `docs:`
- One task ID per branch. Keep diffs under ~500 lines.

## Definition of done (each task)

- Acceptance criteria in the task spec pass.
- Tests listed in the task spec pass (`npm test`).
- `npm run typecheck` and `npm run build` pass after P0-1 exists.
- `docs/todo.md` checkbox updated for that ID.
