# API contracts — Cursor web (unofficial)

Not affiliated with Anysphere or Cursor. These endpoints are reverse-engineered from the public dashboard and can change without notice.

The extension uses **two** endpoints: `GET /api/usage-summary` (required) and `POST /api/dashboard/get-sand-usage-status` (best-effort, Grok Bot). Others in [brief.md](brief.md) are reference-only.

Base: `https://cursor.com`. Auth: browser session cookie `WorkosCursorSessionToken` (httpOnly). Extension fetch from the service worker with `credentials: "include"` and host permission. Do not send `Authorization` headers. Do not persist the cookie.

## GET `/api/usage-summary`

- **Auth:** session cookie. No body.
- **Success:** `200` JSON object below.
- **Signed out / expired:** non-OK (treat `401`/`403` and HTML login pages as signed-out).
- **CSRF:** GET does not need `Origin`.

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

## POST `/api/dashboard/get-sand-usage-status`

Grok Bot weekly allowance. Cursor's internal name for the feature is "Sand". The dashboard's Grok Bot meter ("Weekly usage", "Resets …") is drawn from this response; `usage-summary` does **not** include it.

- **Auth:** session cookie. Body `{}`. Header `Origin: https://cursor.com` (CSRF).
- **Success:** `200` JSON object below.
- **Best-effort:** any failure (non-OK, HTML login page, invalid JSON, malformed payload, network error) resolves to "no Grok Bot data". It must never fail the monthly usage snapshot or the toolbar update.
- **No allowance:** `hasNonZeroIncludedLimit: false` → hide the meter (accounts without a Grok Bot allowance, e.g. some team seats).

### Response (verified live 2026-09-08, Pro account)

```ts
type SandUsageStatusResponse = {
  currentPeriodStart: string;      // ISO 8601 UTC, weekly window start
  nextResetTimestampUtc: string;  // ISO 8601 UTC, weekly reset
  usagePercent: number;           // 0–100, weekly included usage
  hasAvailableUsage: boolean;
  hasNonZeroIncludedLimit: boolean; // false → hide the meter
  upgradeRecommendation?: { cta: { label: string; url: { url: string } }; supportingText: string; kind: string };
  upgradeRecommendations?: unknown[];
  onDemandSettings?: { visible: boolean; eligible: boolean; dashboardUrl: string };
  grokPlanLabel?: string;
};
```

The extension reads `usagePercent`, `currentPeriodStart`, `nextResetTimestampUtc`, and `hasNonZeroIncludedLimit` only. Weekly pacing math reuses the same linear model as the monthly cycle (`computePacing`), with `currentPeriodStart` / `nextResetTimestampUtc` as the window.
