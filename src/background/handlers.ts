import {
  fetchUsageSummary,
  hasSessionCookie,
  type CookieGetter,
  type FetchResult,
} from "../cursor/client";
import type { BadgeMode, RefreshInterval } from "../domain/types";
import {
  applyFetchResult,
  getCache,
  setBadgeMode,
  setRefreshInterval,
  type CacheState,
} from "../storage/cache";
import { applyToolbar, type ChromeActionApi } from "../toolbar/apply";
import { hasUsableSnapshot } from "../toolbar/stale";
import {
  isBadgeMode,
  isRefreshInterval,
  periodMinutesForInterval,
  REFRESH_ALARM_NAME,
  type PopupState,
} from "./messages";

type StorageArea = Parameters<typeof getCache>[0];

export type ChromeAlarmsApi = Pick<typeof chrome.alarms, "create" | "clear">;

export type BackgroundDeps = {
  storage: StorageArea;
  getCookie: CookieGetter;
  fetchUsageSummary: () => Promise<FetchResult>;
  applyToolbar: typeof applyToolbar;
  nowMs: () => number;
  action?: ChromeActionApi;
  alarms?: ChromeAlarmsApi;
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
    refreshInterval: cache.refreshInterval,
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

export async function applyRefreshAlarm(
  interval: RefreshInterval,
  alarms: ChromeAlarmsApi,
): Promise<void> {
  const periodInMinutes = periodMinutesForInterval(interval);
  if (periodInMinutes === null) {
    await alarms.clear(REFRESH_ALARM_NAME);
    return;
  }
  await alarms.create(REFRESH_ALARM_NAME, { periodInMinutes });
}

export async function syncRefreshAlarm(deps: BackgroundDeps): Promise<void> {
  if (!deps.alarms) {
    return;
  }
  const cache = await getCache(deps.storage);
  await applyRefreshAlarm(cache.refreshInterval, deps.alarms);
}

export async function handleSetRefreshInterval(
  interval: RefreshInterval,
  deps: BackgroundDeps,
): Promise<PopupState> {
  await setRefreshInterval(interval, deps.storage);
  await syncRefreshAlarm(deps);
  const cache = await getCache(deps.storage);
  const signedOut = await detectSignedOut(deps.getCookie);
  return toPopupState(cache, signedOut, deps.nowMs());
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
    case "setRefreshInterval":
      if ("interval" in message && isRefreshInterval(message.interval)) {
        return handleSetRefreshInterval(message.interval, deps);
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
    alarms: chrome.alarms,
    ...overrides,
  };
}
