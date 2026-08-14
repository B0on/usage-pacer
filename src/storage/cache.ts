import type { FetchResult } from "../cursor/client";
import {
  DEFAULT_REFRESH_INTERVAL,
  isRefreshInterval,
  type BadgeMode,
  type RefreshInterval,
  type UsageSnapshot,
} from "../domain/types";

const SNAPSHOT_KEY = "snapshot";
const BADGE_MODE_KEY = "badgeMode";
const REFRESH_INTERVAL_KEY = "refreshInterval";
const LAST_ERROR_KEY = "lastError";

const DEFAULT_BADGE_MODE: BadgeMode = "remaining";

export type CacheState = {
  snapshot: UsageSnapshot | null;
  badgeMode: BadgeMode;
  refreshInterval: RefreshInterval;
  lastError: string | null;
};

type StorageArea = {
  get: (
    keys: string[] | Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
};

function getStorage(
  storage: StorageArea = chrome.storage.local,
): StorageArea {
  return storage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Fill fields added after the first cache schema so old snapshots still render. */
export function normalizeSnapshot(raw: unknown): UsageSnapshot | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (typeof raw.billingCycleStart !== "string") {
    return null;
  }
  if (typeof raw.billingCycleEnd !== "string") {
    return null;
  }
  if (typeof raw.totalPercentUsed !== "number" || Number.isNaN(raw.totalPercentUsed)) {
    return null;
  }
  if (typeof raw.apiPercentUsed !== "number" || Number.isNaN(raw.apiPercentUsed)) {
    return null;
  }
  if (typeof raw.membershipType !== "string") {
    return null;
  }
  if (typeof raw.fetchedAt !== "number" || Number.isNaN(raw.fetchedAt)) {
    return null;
  }

  const autoPercentUsed =
    typeof raw.autoPercentUsed === "number" && Number.isFinite(raw.autoPercentUsed)
      ? raw.autoPercentUsed
      : 0;

  const onDemandRecord = isRecord(raw.onDemand) ? raw.onDemand : {};
  const breakdownRecord = isRecord(raw.breakdown) ? raw.breakdown : {};

  return {
    billingCycleStart: raw.billingCycleStart,
    billingCycleEnd: raw.billingCycleEnd,
    totalPercentUsed: raw.totalPercentUsed,
    autoPercentUsed,
    onDemand: {
      enabled: onDemandRecord.enabled === true,
      used:
        typeof onDemandRecord.used === "number" && Number.isFinite(onDemandRecord.used)
          ? onDemandRecord.used
          : 0,
    },
    breakdown: {
      included:
        typeof breakdownRecord.included === "number" ? breakdownRecord.included : 0,
      bonus: typeof breakdownRecord.bonus === "number" ? breakdownRecord.bonus : 0,
      total: typeof breakdownRecord.total === "number" ? breakdownRecord.total : 0,
    },
    apiPercentUsed: raw.apiPercentUsed,
    membershipType: raw.membershipType,
    fetchedAt: raw.fetchedAt,
  };
}

export async function getCache(
  storage: StorageArea = chrome.storage.local,
): Promise<CacheState> {
  const area = getStorage(storage);
  const data = await area.get([
    SNAPSHOT_KEY,
    BADGE_MODE_KEY,
    REFRESH_INTERVAL_KEY,
    LAST_ERROR_KEY,
  ]);

  const snapshot = normalizeSnapshot(data[SNAPSHOT_KEY]);
  const badgeMode =
    (data[BADGE_MODE_KEY] as BadgeMode | undefined) ?? DEFAULT_BADGE_MODE;
  const refreshInterval = isRefreshInterval(data[REFRESH_INTERVAL_KEY])
    ? data[REFRESH_INTERVAL_KEY]
    : DEFAULT_REFRESH_INTERVAL;
  const lastError = (data[LAST_ERROR_KEY] as string | null | undefined) ?? null;

  return { snapshot, badgeMode, refreshInterval, lastError };
}

export async function getSnapshot(
  storage: StorageArea = chrome.storage.local,
): Promise<UsageSnapshot | null> {
  const { snapshot } = await getCache(storage);
  return snapshot;
}

export async function setSnapshot(
  snapshot: UsageSnapshot,
  storage: StorageArea = chrome.storage.local,
): Promise<void> {
  await getStorage(storage).set({ [SNAPSHOT_KEY]: snapshot });
}

export async function getBadgeMode(
  storage: StorageArea = chrome.storage.local,
): Promise<BadgeMode> {
  const { badgeMode } = await getCache(storage);
  return badgeMode;
}

export async function setBadgeMode(
  badgeMode: BadgeMode,
  storage: StorageArea = chrome.storage.local,
): Promise<void> {
  await getStorage(storage).set({ [BADGE_MODE_KEY]: badgeMode });
}

export async function setRefreshInterval(
  refreshInterval: RefreshInterval,
  storage: StorageArea = chrome.storage.local,
): Promise<void> {
  await getStorage(storage).set({ [REFRESH_INTERVAL_KEY]: refreshInterval });
}

export async function getLastError(
  storage: StorageArea = chrome.storage.local,
): Promise<string | null> {
  const { lastError } = await getCache(storage);
  return lastError;
}

export async function setLastError(
  lastError: string | null,
  storage: StorageArea = chrome.storage.local,
): Promise<void> {
  await getStorage(storage).set({ [LAST_ERROR_KEY]: lastError });
}

/** Apply a fetch result to cache without mutating prior snapshots on failure. */
export async function applyFetchResult(
  result: FetchResult,
  storage: StorageArea = chrome.storage.local,
): Promise<CacheState> {
  const area = getStorage(storage);

  if (result.kind === "success") {
    await area.set({
      [SNAPSHOT_KEY]: result.snapshot,
      [LAST_ERROR_KEY]: null,
    });
    return getCache(area);
  }

  if (result.kind === "error") {
    await area.set({ [LAST_ERROR_KEY]: result.message });
    return getCache(area);
  }

  await area.set({ [LAST_ERROR_KEY]: null });
  return getCache(area);
}

/** Fetch usage-summary and persist the outcome to cache. */
export async function refreshUsageSummary(
  fetchFn: () => Promise<FetchResult>,
  storage: StorageArea = chrome.storage.local,
): Promise<CacheState> {
  const result = await fetchFn();
  return applyFetchResult(result, storage);
}
