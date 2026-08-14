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
> &
  Partial<Pick<typeof chrome.action, "setBadgeTextColor">>;

/** Compute pacing from cache and paint toolbar icon + badge. */
export async function applyToolbar(
  input: ApplyToolbarInput,
  action: ChromeActionApi = chrome.action,
): Promise<void> {
  const { snapshot, signedOut, badgeMode, nowMs } = input;

  const fetchedAt = snapshot?.fetchedAt ?? null;
  const stale = isSignedOutCacheStale(signedOut, fetchedAt, nowMs);
  const usable = hasUsableSnapshot(snapshot, signedOut, nowMs);

  let viewModel = null;
  if (usable && snapshot) {
    try {
      viewModel = computePacing(snapshot, nowMs);
    } catch {
      viewModel = null;
    }
  }
  const averagePct = viewModel?.averagePct ?? 0;

  try {
    await setElapsedRingIcon(averagePct, { showFill: Boolean(viewModel) }, action);
  } catch {
    // Keep going so a canvas failure cannot block the badge.
  }

  const badge = resolveBadgePresentation({
    viewModel,
    signedOut,
    stale,
    badgeMode,
  });
  await setToolbarBadge(badge, action);
}
