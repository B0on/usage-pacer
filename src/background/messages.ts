import {
  DEFAULT_REFRESH_INTERVAL,
  isRefreshInterval,
  type BadgeMode,
  type RefreshInterval,
  type UsageSnapshot,
} from "../domain/types";

export const REFRESH_ALARM_NAME = "usage-pacer-refresh";

export const REFRESH_INTERVAL_MINUTES: Record<
  Exclude<RefreshInterval, "manual">,
  number
> = {
  "5min": 5,
  "15min": 15,
};

export type BackgroundMessage =
  | { type: "getState" }
  | { type: "refresh" }
  | { type: "setBadgeMode"; mode: BadgeMode }
  | { type: "setRefreshInterval"; interval: RefreshInterval };

export type PopupState = {
  snapshot: UsageSnapshot | null;
  signedOut: boolean;
  lastError: string | null;
  badgeMode: BadgeMode;
  refreshInterval: RefreshInterval;
};

const BADGE_MODES: BadgeMode[] = ["remaining", "delta", "used"];

export function isBadgeMode(value: unknown): value is BadgeMode {
  return typeof value === "string" && BADGE_MODES.includes(value as BadgeMode);
}

export { DEFAULT_REFRESH_INTERVAL, isRefreshInterval };

export function periodMinutesForInterval(
  interval: RefreshInterval,
): number | null {
  if (interval === "manual") {
    return null;
  }
  return REFRESH_INTERVAL_MINUTES[interval];
}
