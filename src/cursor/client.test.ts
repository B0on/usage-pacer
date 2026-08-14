import { describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/usage-summary.json";
import {
  fetchUsageSummary,
  hasSessionCookie,
  USAGE_SUMMARY_URL,
} from "./client";
import type { CookieGetter } from "./client";

const NOW_MS = 1_725_000_000_000;

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

describe("hasSessionCookie", () => {
  it("returns true when cursor.com has the session cookie", async () => {
    const getCookie = vi
      .fn()
      .mockResolvedValueOnce({} as chrome.cookies.Cookie);

    await expect(hasSessionCookie(getCookie)).resolves.toBe(true);
    expect(getCookie).toHaveBeenCalledWith({
      url: "https://cursor.com/",
      name: "WorkosCursorSessionToken",
    });
    expect(getCookie).toHaveBeenCalledTimes(1);
  });

  it("falls back to www.cursor.com when the first lookup is null", async () => {
    const getCookie = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({} as chrome.cookies.Cookie);

    await expect(hasSessionCookie(getCookie)).resolves.toBe(true);
    expect(getCookie).toHaveBeenNthCalledWith(2, {
      url: "https://www.cursor.com/",
      name: "WorkosCursorSessionToken",
    });
  });

  it("returns false when both cookie lookups are null", async () => {
    const getCookie = mockCookieGetter(null);
    await expect(hasSessionCookie(getCookie)).resolves.toBe(false);
  });
});

describe("fetchUsageSummary", () => {
  it("returns signed_out when no session cookie is present", async () => {
    const fetchFn = vi.fn();

    const result = await fetchUsageSummary({
      fetchFn,
      getCookie: mockCookieGetter(null),
      nowMs: NOW_MS,
    });

    expect(result).toEqual({ kind: "signed_out" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns success for a 200 JSON response", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(fixture));

    const result = await fetchUsageSummary({
      fetchFn,
      getCookie: mockCookieGetter({} as chrome.cookies.Cookie),
      nowMs: NOW_MS,
    });

    expect(fetchFn).toHaveBeenCalledWith(USAGE_SUMMARY_URL, {
      credentials: "include",
    });
    expect(result).toEqual({
      kind: "success",
      snapshot: expect.objectContaining({
        totalPercentUsed: 66.10724637681159,
        fetchedAt: NOW_MS,
      }),
    });
  });

  it("returns signed_out for 401 responses", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}, { status: 401 }));

    const result = await fetchUsageSummary({
      fetchFn,
      getCookie: mockCookieGetter({} as chrome.cookies.Cookie),
      nowMs: NOW_MS,
    });

    expect(result).toEqual({ kind: "signed_out" });
  });

  it("returns signed_out for 403 responses", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}, { status: 403 }));

    const result = await fetchUsageSummary({
      fetchFn,
      getCookie: mockCookieGetter({} as chrome.cookies.Cookie),
      nowMs: NOW_MS,
    });

    expect(result).toEqual({ kind: "signed_out" });
  });

  it("returns error when a 200 JSON payload fails parse", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}));

    const result = await fetchUsageSummary({
      fetchFn,
      getCookie: mockCookieGetter({} as chrome.cookies.Cookie),
      nowMs: NOW_MS,
    });

    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.message).toMatch(/Missing or invalid/);
    }
  });

  it("returns error when fetch rejects", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await fetchUsageSummary({
      fetchFn,
      getCookie: mockCookieGetter({} as chrome.cookies.Cookie),
      nowMs: NOW_MS,
    });

    expect(result).toEqual({
      kind: "error",
      message: "Network request failed",
    });
  });

  it("returns signed_out for HTML login pages", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response("<!DOCTYPE html><html><body>Sign in</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const result = await fetchUsageSummary({
      fetchFn,
      getCookie: mockCookieGetter({} as chrome.cookies.Cookie),
      nowMs: NOW_MS,
    });

    expect(result).toEqual({ kind: "signed_out" });
  });

  it("returns error for invalid JSON while keeping parse separate from signed_out", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await fetchUsageSummary({
      fetchFn,
      getCookie: mockCookieGetter({} as chrome.cookies.Cookie),
      nowMs: NOW_MS,
    });

    expect(result).toEqual({
      kind: "error",
      message: "Invalid JSON in usage-summary response",
    });
  });
});
