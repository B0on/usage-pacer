# Usage Pacer

Chrome extension (Manifest V3) that paces Cursor usage against the billing-cycle reset date.

Specs: [docs/brief.md](docs/brief.md) · [docs/architecture.md](docs/architecture.md) · [docs/todo.md](docs/todo.md)

## Development

Requires Node.js 22+ and npm.

```
npm install      # install dependencies
npm run dev      # Vite dev server (HMR) for the popup + worker
npm run build    # production build to dist/ (loadable unpacked extension)
npm test         # Vitest unit tests
npm run typecheck # tsc --noEmit (strict)
```

Load the unpacked extension: run `npm run build`, then in `chrome://extensions`
enable Developer mode and choose **Load unpacked** → `dist/`.

Status: **Phase 0 MVP** is complete. Remaining ideas (store listing, history
chart, notifications) are listed in [docs/todo.md](docs/todo.md).
