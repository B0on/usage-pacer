# Usage Pacer Privacy Policy

Last updated: 2026-08-14

Usage Pacer is a Chrome extension that displays Cursor usage pacing against the current billing-cycle reset date.

## Data handled

Usage Pacer handles the following data locally:

- The presence of the existing `cursor.com` session cookie, used only to determine whether the user is signed in.
- Usage summary data returned by Cursor, including billing-cycle dates and usage percentages.
- Local extension settings and the latest usage snapshot.

Usage Pacer does not read, log, or store the value of the session cookie.

## Data transmission

Usage Pacer requests Cursor's own usage-summary endpoint at `https://cursor.com/api/usage-summary` using the browser's existing session credentials. No data is sent to a Usage Pacer server or any analytics provider.

## Data retention and deletion

The latest usage snapshot and extension settings remain in Chrome's local extension storage until the user clears the extension's data or uninstalls the extension. The extension does not maintain a separate account or server-side database.

## Changes

This policy may be updated when the extension's data handling changes. The latest version will be published at the public URL used in the Chrome Web Store listing.

## Contact

For support or privacy questions, use the support contact listed on the Usage Pacer Chrome Web Store page.
