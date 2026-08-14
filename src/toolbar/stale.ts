import { MS_PER_DAY } from "../domain/types";

/** Signed-out cache older than 24h is stale (badge `—`, empty ring). */
export const STALE_CACHE_MS = 24 * MS_PER_DAY;

export function isSignedOutCacheStale(
  signedOut: boolean,
  fetchedAt: number | null,
  nowMs: number,
): boolean {
  if (!signedOut) {
    return false;
  }
  if (fetchedAt === null) {
    return true;
  }
  return nowMs - fetchedAt >= STALE_CACHE_MS;
}

/** Snapshot can drive ring/badge when signed in, or signed out with fresh cache. */
export function hasUsableSnapshot(
  snapshot: { fetchedAt: number } | null,
  signedOut: boolean,
  nowMs: number,
): boolean {
  if (!snapshot) {
    return false;
  }
  if (!signedOut) {
    return true;
  }
  return !isSignedOutCacheStale(signedOut, snapshot.fetchedAt, nowMs);
}
