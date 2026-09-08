import type { GrokBotUsage } from "../domain/types";
import { ParseError, parseSandUsageStatus } from "./parse";
import { hasSessionCookie, type CookieGetter } from "./client";

export const SAND_USAGE_URL = "https://cursor.com/api/dashboard/get-sand-usage-status";

export type SandFetchResult =
  | { kind: "success"; grokBot: GrokBotUsage }
  | { kind: "unavailable" };

export type FetchSandUsageDeps = {
  fetchFn?: typeof fetch;
  getCookie?: CookieGetter;
};

function isHtmlResponse(contentType: string | null, body: string): boolean {
  if (contentType?.toLowerCase().includes("text/html")) {
    return true;
  }
  const trimmed = body.trimStart();
  return trimmed.startsWith("<!") || trimmed.startsWith("<html");
}

/**
 * Best-effort fetch of the Grok Bot weekly allowance.
 * Never rejects and never fails the caller: any failure resolves to
 * "unavailable" so the monthly usage bars stay intact.
 */
export async function fetchSandUsageStatus(
  deps: FetchSandUsageDeps = {},
): Promise<SandFetchResult> {
  const fetchFn = deps.fetchFn ?? fetch;
  const getCookie = deps.getCookie ?? chrome.cookies.get.bind(chrome.cookies);

  const hasCookie = await hasSessionCookie(getCookie);
  if (!hasCookie) {
    return { kind: "unavailable" };
  }

  let response: Response;
  try {
    response = await fetchFn(SAND_USAGE_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://cursor.com",
      },
      body: "{}",
      credentials: "include",
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (!response.ok) {
    return { kind: "unavailable" };
  }

  const contentType = response.headers.get("content-type");
  let body: string;
  try {
    body = await response.text();
  } catch {
    return { kind: "unavailable" };
  }

  if (isHtmlResponse(contentType, body)) {
    return { kind: "unavailable" };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body) as unknown;
  } catch {
    return { kind: "unavailable" };
  }

  try {
    return { kind: "success", grokBot: parseSandUsageStatus(payload) };
  } catch (error) {
    if (error instanceof ParseError) {
      return { kind: "unavailable" };
    }
    return { kind: "unavailable" };
  }
}
