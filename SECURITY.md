# Security Policy

## Supported versions

Only the `main` branch is supported.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/B0on/usage-pacer/security/advisories/new) for this repository.

Do **not** open a public issue for anything that involves session cookies, tokens, or other credentials.

## Expected behavior

- The Cursor session cookie name (`WorkosCursorSessionToken`) appears in source. That is intentional.
- The cookie **value** must never be stored, logged, or sent anywhere except `https://cursor.com`.
- The extension has no backend and collects no telemetry.
