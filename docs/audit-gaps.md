# Spec audit — Usage Pacer

Run 2026-08-14 against [brief.md](brief.md).

## Critical

None blocking implementation.

| Item | Resolution |
|------|------------|
| Client-only session | By design. No server. Cookie never stored. Documented in architecture. |
| Unofficial Cursor API | Product risk. Parse-fail keeps cache. MVP = `GET /api/usage-summary` only. |

## Moderate (handled in specs this run)

| Item | Resolution |
|------|------------|
| Response types missing | Added [api-contracts.md](api-contracts.md). |
| OffscreenCanvas in MV3 worker | Architecture: OffscreenCanvas first, `chrome.offscreen` fallback. |
| Testing gap | [testing-strategy.md](testing-strategy.md): Vitest on domain + parse; manual unpacked load. |
| Escalate vs yellow | Linear forecast “empties before reset” ⇔ `deltaPct > 0`. Yellow is rare after escalate. **Locked in brief; do not “fix” in code.** |

## Minor / deferred

| Item | Status |
|------|--------|
| Chrome Web Store listing copy | Shipped in [store-assets/](../store-assets/) |
| `www.cursor.com` vs `cursor.com` cookie host | Implemented: look up both URLs |
| Icon brand mark inside the ring | Optional later; MVP is ring-only |
