# Contributing

Thanks for looking at Usage Pacer.

## Development

Requires Node.js 22+ and npm.

```
npm install
npm test
npm run typecheck
npm run build
```

Load the unpacked extension from `dist/` in `chrome://extensions` (Developer mode).

Product behavior is specified in [docs/brief.md](docs/brief.md). Architecture is in [docs/architecture.md](docs/architecture.md). Agent guardrails: [AGENTS.md](AGENTS.md).

## Pull requests

- English only in UI, comments, commits, and `docs/`.
- Keep changes focused. Match existing TypeScript style.
- Do not log, persist, or print the Cursor session cookie value.
- Include tests for domain, parse, and settings behavior you change.
- `npm test`, `npm run typecheck`, and `npm run build` must pass.

## Issues

Bug reports and ideas are welcome. Please say which Chrome version you used and whether you were signed in at `cursor.com`.
