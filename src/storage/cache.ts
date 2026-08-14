import type { FetchResult } from "../cursor/client";
import type { BadgeMode, UsageSnapshot } from "../domain/types";

const SNAPSHOT_KEY = "snapshot";
const BADGE_MODE_KEY = "badgeMode";
const LAST_ERROR_KEY = "lastError";

const DEFAULT_BADGE_MODE: BadgeMode = "remaining";

export type CacheState = {
  snapshot: UsageSnapshot | null;
  badgeMode: BadgeMode;
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

export async function getCache(
  storage: StorageArea = chrome.storage.local,
): Promise<CacheState> {
  const area = getStorage(storage);
  const data = await area.get([SNAPSHOT_KEY, BADGE_MODE_KEY, LAST_ERROR_KEY]);

  const snapshot = (data[SNAPSHOT_KEY] as UsageSnapshot | undefined) ?? null;
  const badgeMode =
    (data[BADGE_MODE_KEY] as BadgeMode | undefined) ?? DEFAULT_BADGE_MODE;
  const lastError = (data[LAST_ERROR_KEY] as string | null | undefined) ?? null;

  return { snapshot, badgeMode, lastError };
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
