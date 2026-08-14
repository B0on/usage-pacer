# Usage Pacer Privacy Policy

Last updated: 2026-08-14

Usage Pacer is a Chrome extension that displays Cursor usage pacing against the current billing-cycle reset date.

This project is not affiliated with, endorsed by, or sponsored by Anysphere, Inc. or Cursor.

## Data handled

Usage Pacer handles the following data locally on the user's machine:

- The **presence** of the existing `cursor.com` session cookie, used only to determine whether the user is signed in.
- Usage summary data returned by Cursor, including billing-cycle dates and usage percentages.
- Local extension settings and the latest usage snapshot.

Usage Pacer does not read, log, or store the **value** of the session cookie. It never sends that cookie to any server other than `cursor.com`.

## Data transmission

Usage Pacer requests Cursor's own usage-summary endpoint at `https://cursor.com/api/usage-summary` using the browser's existing session credentials. No data is sent to a Usage Pacer server. There is no analytics, telemetry, advertising, or third-party tracker.

## Data retention and deletion

The latest usage snapshot and extension settings remain in Chrome's local extension storage until the user clears the extension's data or uninstalls the extension. The extension does not maintain a separate account or server-side database.

## Permissions

The Chrome extension requests:

- `storage` — settings and the latest usage snapshot
- `cookies` — detect whether a `cursor.com` session exists (presence only)
- `alarms` — optional background refresh
- host access to `cursor.com` and `www.cursor.com` — call Cursor's usage-summary API

## Changes

This policy may be updated when the extension's data handling changes. The latest version lives in this file on the default branch.

## Contact

For support or privacy questions, open a GitHub issue at https://github.com/B0on/usage-pacer/issues.
