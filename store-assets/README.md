# Chrome Web Store Assets

## Required uploads

- `usage-pacer-icon-128.png` — 128 × 128 store icon.
- `usage-pacer-screenshot-640x400.png` — 640 × 400 product screenshot.

## Optional promotional uploads

- `usage-pacer-promo-small-440x280.png` — small promotional tile.
- `usage-pacer-promo-marquee-1400x560.png` — marquee promotional tile.

## Store upload

1. `npm run package` — builds `dist/` and writes `usage-pacer-<version>.zip` at the repo root.
2. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) → **Usage Pacer** → **Package** → upload the zip.
3. Set version to match `package.json` (e.g. `0.1.1`). Publish when review passes.

Listing: https://chromewebstore.google.com/detail/usage-pacer/pejlpkbmbjcpgkbkkjiphbgidldipdlk

## Source files

- `store-preview.html` — source for the required screenshot.
- `promo-small.html` — source for the small promotional tile.
- `promo-marquee.html` — source for the marquee promotional tile.
- `store-listing-copy.md` — English listing copy.
- `privacy-policy.md` — pointer to the public [PRIVACY.md](../PRIVACY.md).
