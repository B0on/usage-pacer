import type { BadgeMode, UsageSnapshot } from "../domain/types";

export const REFRESH_ALARM_NAME = "usage-pacer-refresh";
export const REFRESH_ALARM_PERIOD_MINUTES = 15;

export type BackgroundMessage =
  | { type: "getState" }
  | { type: "refresh" }
  | { type: "setBadgeMode"; mode: BadgeMode };

export type PopupState = {
  snapshot: UsageSnapshot | null;
  signedOut: boolean;
  lastError: string | null;
  badgeMode: BadgeMode;
};

const BADGE_MODES: BadgeMode[] = ["remaining", "delta", "used"];

export function isBadgeMode(value: unknown): value is BadgeMode {
  return typeof value === "string" && BADGE_MODES.includes(value as BadgeMode);
}
