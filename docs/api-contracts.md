# API contracts — Cursor web (unofficial)

Not affiliated with Anysphere or Cursor. These endpoints are reverse-engineered from the public dashboard and can change without notice.

MVP uses **one** endpoint. Others in [brief.md](brief.md) are reference-only.

Base: `https://cursor.com`. Auth: browser session cookie `WorkosCursorSessionToken` (httpOnly). Extension fetch from the service worker with `credentials: "include"` and host permission. Do not send `Authorization` headers. Do not persist the cookie.

## GET `/api/usage-summary`

- **Auth:** session cookie. No body.
- **Success:** `200` JSON object below.
- **Signed out / expired:** non-OK (treat `401`/`403` and HTML login pages as signed-out).
- **CSRF:** GET does not need `Origin`. Do not call dashboard POSTs in MVP.

### Response (verified 2026-08-13)

```ts
type UsageSummaryResponse = {
  billingCycleStart: string; // ISO 8601 UTC
  billingCycleEnd: string;   // ISO 8601 UTC = Usage limits reset
  membershipType: string;    // e.g. "pro"
  limitType: string;
  isUnlimited: boolean;
  individualUsage: {
    plan: {
      used: number;
      limit: number;
      remaining: number;
      breakdown: { included: number; bonus: number; total: number };
      autoPercentUsed: number;
      apiPercentUsed: number;
      totalPercentUsed: number; // pacing target
    };
    onDemand: {
      enabled: boolean;
      used: number;
      limit: number | null;
      remaining: number | null;
    };
  };
  teamUsage: Record<string, unknown>;
};
```

Pacing must use `individualUsage.plan.totalPercentUsed`, **not** `plan.remaining` or `autoPercentUsed`.

### Parse errors

If required fields are missing or dates are invalid, fail the snapshot update and keep the previous cache. Surface `lastError` in the popup. Do not crash the worker.
