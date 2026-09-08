import { describe, expect, it, vi } from "vitest";
import { fetchSandUsageStatus, SAND_USAGE_URL } from "./sand";
import type { CookieGetter } from "./client";

function mockCookieGetter(
  cookie: chrome.cookies.Cookie | null,
): CookieGetter {
  return vi.fn().mockResolvedValue(cookie);
}

function jsonResponse(
  body: unknown,
  init: ResponseInit = { status: 200 },
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

const SAND_FIXTURE = {
  currentPeriodStart: "2026-09-05T18:22:04.315Z",
  nextResetTimestampUtc: "2026-09-10T09:56:04.851Z",
  usagePercent: 0,
  hasAvailableUsage: true,
  hasNonZeroIncludedLimit: true,
  upgradeRecommendation: {
    cta: { label: "Upgrade to Pro+", url: { url: "https://cursor.com/x" } },
    supportingText: "Get $500 of Grok Bot usage each week with Pro+",
    kind: "upgrade-to-pro-plus-for-more-usage",
  },
  upgradeRecommendations: [],
  onDemandSettings: { visible: true, eligible: true, dashboardUrl: "" },
  grokPlanLabel: "Grok Bot Plan",
};

describe("fetchSandUsageStatus", () => {
  it("returns unavailable when no session cookie is present", async () => {
    const fetchFn = vi.fn();

    const result = await fetchSandUsageStatus({
      fetchFn,
      getCookie: mockCookieGetter(null),
    });

    expect(result).toEqual({ kind: "unavailable" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns success with parsed GrokBotUsage for a 200 JSON response", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(SAND_FIXTURE));

    const result = await fetchSandUsageStatus({
      fetchFn,
      getCookie: mockCookieGetter({} as chrome.cookies.Cookie),
    });

    expect(fetchFn).toHaveBeenCalledWith(
      SAND_USAGE_URL,
      expect.objectContaining({
        method: "POST",
        body: "{}",
        credentials: "include",
      }),
    );
    expect(result).toEqual({
      kind: "success",
      grokBot: {
        usagePercent: 0,
        currentPeriodStart: "2026-09-05T18:22:04.315Z",
        nextResetTimestampUtc: "2026-09-10T09:56:04.851Z",
        hasNonZeroIncludedLimit: true,
      },
    });
  });

  it("returns unavailable for non-OK responses", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}, { status: 500 }));

    const result = await fetchSandUsageStatus({
      fetchFn,
      getCookie: mockCookieGetter({} as chrome.cookies.Cookie),
    });

    expect(result).toEqual({ kind: "unavailable" });
  });

  it("returns unavailable when fetch rejects", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await fetchSandUsageStatus({
      fetchFn,
      getCookie: mockCookieGetter({} as chrome.cookies.Cookie),
    });

    expect(result).toEqual({ kind: "unavailable" });
  });

  it("returns unavailable for HTML login pages", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response("<!DOCTYPE html><html><body>Sign in</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const result = await fetchSandUsageStatus({
      fetchFn,
      getCookie: mockCookieGetter({} as chrome.cookies.Cookie),
    });

    expect(result).toEqual({ kind: "unavailable" });
  });

  it("returns unavailable for invalid JSON", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await fetchSandUsageStatus({
      fetchFn,
      getCookie: mockCookieGetter({} as chrome.cookies.Cookie),
    });

    expect(result).toEqual({ kind: "unavailable" });
  });

  it("returns unavailable for malformed payloads", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}));

    const result = await fetchSandUsageStatus({
      fetchFn,
      getCookie: mockCookieGetter({} as chrome.cookies.Cookie),
    });

    expect(result).toEqual({ kind: "unavailable" });
  });
});
