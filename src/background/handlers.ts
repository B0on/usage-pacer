import {
  fetchUsageSummary,
  hasSessionCookie,
  type CookieGetter,
  type FetchResult,
} from "../cursor/client";
import type { BadgeMode } from "../domain/types";
import {
  applyFetchResult,
  getCache,
  setBadgeMode,
  type CacheState,
} from "../storage/cache";
import { applyToolbar, type ChromeActionApi } from "../toolbar/apply";
import { hasUsableSnapshot } from "../toolbar/stale";
import {
  isBadgeMode,
  REFRESH_ALARM_NAME,
  REFRESH_ALARM_PERIOD_MINUTES,
  type PopupState,
} from "./messages";

type StorageArea = Parameters<typeof getCache>[0];

export type BackgroundDeps = {
  storage: StorageArea;
  getCookie: CookieGetter;
  fetchUsageSummary: () => Promise<FetchResult>;
  applyToolbar: typeof applyToolbar;
  nowMs: () => number;
  action?: ChromeActionApi;
};

export async function detectSignedOut(
  getCookie: CookieGetter,
): Promise<boolean> {
  return !(await hasSessionCookie(getCookie));
}

export function toPopupState(
  cache: CacheState,
  signedOut: boolean,
  nowMs: number,
): PopupState {
  return {
    snapshot: hasUsableSnapshot(cache.snapshot, signedOut, nowMs)
      ? cache.snapshot
      : null,
    signedOut,
    lastError: cache.lastError,
    badgeMode: cache.badgeMode,
  };
}

export async function applyCacheToToolbar(
  cache: CacheState,
  signedOut: boolean,
  deps: Pick<BackgroundDeps, "applyToolbar" | "nowMs" | "action">,
): Promise<void> {
  await deps.applyToolbar(
    {
      snapshot: cache.snapshot,
      signedOut,
      badgeMode: cache.badgeMode,
      nowMs: deps.nowMs(),
    },
    deps.action,
  );
}

export async function refreshAndApply(deps: BackgroundDeps): Promise<PopupState> {
  const result = await deps.fetchUsageSummary();
  const cache = await applyFetchResult(result, deps.storage);
  const cookieMissing = await detectSignedOut(deps.getCookie);
  const signedOut = cookieMissing || result.kind === "signed_out";
  await applyCacheToToolbar(cache, signedOut, deps);
  return toPopupState(cache, signedOut, deps.nowMs());
}

export async function handleGetState(deps: BackgroundDeps): Promise<PopupState> {
  const cache = await getCache(deps.storage);
  const signedOut = await detectSignedOut(deps.getCookie);
  return toPopupState(cache, signedOut, deps.nowMs());
}

export async function handleSetBadgeMode(
  mode: BadgeMode,
  deps: BackgroundDeps,
): Promise<PopupState> {
  await setBadgeMode(mode, deps.storage);
  const cache = await getCache(deps.storage);
  const signedOut = await detectSignedOut(deps.getCookie);
  await applyCacheToToolbar(cache, signedOut, deps);
  return toPopupState(cache, signedOut, deps.nowMs());
}

export function registerRefreshAlarm(
  alarms: Pick<typeof chrome.alarms, "create">,
): void {
  void alarms.create(REFRESH_ALARM_NAME, {
    periodInMinutes: REFRESH_ALARM_PERIOD_MINUTES,
  });
}

export async function handleBackgroundMessage(
  message: unknown,
  deps: BackgroundDeps,
): Promise<PopupState | undefined> {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return undefined;
  }

  switch (message.type) {
    case "getState":
      return handleGetState(deps);
    case "refresh":
      return refreshAndApply(deps);
    case "setBadgeMode":
      if ("mode" in message && isBadgeMode(message.mode)) {
        return handleSetBadgeMode(message.mode, deps);
      }
      return undefined;
    default:
      return undefined;
  }
}

export function createDefaultDeps(
  overrides: Partial<BackgroundDeps> = {},
): BackgroundDeps {
  return {
    storage: chrome.storage.local,
    getCookie: chrome.cookies.get.bind(chrome.cookies),
    fetchUsageSummary: () => fetchUsageSummary(),
    applyToolbar,
    nowMs: () => Date.now(),
    ...overrides,
  };
}
