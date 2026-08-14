import { computePacing } from "../domain/pacing";
import type { BadgeMode, UsageSnapshot } from "../domain/types";
import {
  resolveBadgePresentation,
  setToolbarBadge,
} from "./badge";
import { setElapsedRingIcon } from "./icon";
import { hasUsableSnapshot, isSignedOutCacheStale } from "./stale";

export type ApplyToolbarInput = {
  snapshot: UsageSnapshot | null;
  signedOut: boolean;
  badgeMode: BadgeMode;
  nowMs: number;
};

export type ChromeActionApi = Pick<
  typeof chrome.action,
  "setIcon" | "setBadgeText" | "setBadgeBackgroundColor"
>;

/** Compute pacing from cache and paint toolbar icon + badge. */
export async function applyToolbar(
  input: ApplyToolbarInput,
  action: ChromeActionApi = chrome.action,
): Promise<void> {
  const { snapshot, signedOut, badgeMode, nowMs } = input;

  const fetchedAt = snapshot?.fetchedAt ?? null;
  const stale = isSignedOutCacheStale(signedOut, fetchedAt, nowMs);
  const usable = hasUsableSnapshot(snapshot, signedOut, nowMs);

  const viewModel =
    usable && snapshot ? computePacing(snapshot, nowMs) : null;
  const averagePct = viewModel?.averagePct ?? 0;

  await setElapsedRingIcon(averagePct, { showFill: usable }, action);

  const badge = resolveBadgePresentation({
    viewModel,
    signedOut,
    stale,
    badgeMode,
  });
  await setToolbarBadge(badge, action);
}
