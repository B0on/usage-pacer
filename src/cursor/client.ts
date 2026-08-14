import type { UsageSnapshot } from "../domain/types";
import { ParseError, parseUsageSummary } from "./parse";

export const USAGE_SUMMARY_URL = "https://cursor.com/api/usage-summary";

const SESSION_COOKIE_NAME = "WorkosCursorSessionToken";
const SESSION_COOKIE_URLS = [
  "https://cursor.com/",
  "https://www.cursor.com/",
] as const;

export type FetchResult =
  | { kind: "signed_out" }
  | { kind: "success"; snapshot: UsageSnapshot }
  | { kind: "error"; message: string };

export type CookieGetter = (details: {
  url: string;
  name: string;
}) => Promise<chrome.cookies.Cookie | null>;

export type FetchUsageSummaryDeps = {
  fetchFn?: typeof fetch;
  getCookie?: CookieGetter;
  nowMs?: number;
};

function isHtmlResponse(contentType: string | null, body: string): boolean {
  if (contentType?.toLowerCase().includes("text/html")) {
    return true;
  }
  const trimmed = body.trimStart();
  return trimmed.startsWith("<!") || trimmed.startsWith("<html");
}

/** Returns true when a session cookie is present. Never reads or logs the value. */
export async function hasSessionCookie(
  getCookie: CookieGetter = chrome.cookies.get.bind(chrome.cookies),
): Promise<boolean> {
  for (const url of SESSION_COOKIE_URLS) {
    const cookie = await getCookie({ url, name: SESSION_COOKIE_NAME });
    if (cookie !== null) {
      return true;
    }
  }
  return false;
}

/** GET usage-summary with session credentials and map to a fetch result. */
export async function fetchUsageSummary(
  deps: FetchUsageSummaryDeps = {},
): Promise<FetchResult> {
  const fetchFn = deps.fetchFn ?? fetch;
  const getCookie = deps.getCookie ?? chrome.cookies.get.bind(chrome.cookies);
  const nowMs = deps.nowMs ?? Date.now();

  const hasCookie = await hasSessionCookie(getCookie);
  if (!hasCookie) {
    return { kind: "signed_out" };
  }

  let response: Response;
  try {
    response = await fetchFn(USAGE_SUMMARY_URL, { credentials: "include" });
  } catch {
    return { kind: "error", message: "Network request failed" };
  }

  if (response.status === 401 || response.status === 403) {
    return { kind: "signed_out" };
  }

  if (!response.ok) {
    return {
      kind: "error",
      message: `Unexpected response status: ${response.status}`,
    };
  }

  const contentType = response.headers.get("content-type");
  let body: string;
  try {
    body = await response.text();
  } catch {
    return {
      kind: "error",
      message: "Failed to read usage-summary response",
    };
  }

  if (isHtmlResponse(contentType, body)) {
    return { kind: "signed_out" };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body) as unknown;
  } catch {
    return { kind: "error", message: "Invalid JSON in usage-summary response" };
  }

  try {
    const snapshot = parseUsageSummary(payload, nowMs);
    return { kind: "success", snapshot };
  } catch (error) {
    const message =
      error instanceof ParseError
        ? error.message
        : "Failed to parse usage-summary response";
    return { kind: "error", message };
  }
}
