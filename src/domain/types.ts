export const MS_PER_DAY = 86_400_000;

export type OnDemand = {
  enabled: boolean;
  used: number;
};

export type Breakdown = {
  included: number;
  bonus: number;
  total: number;
};

/** Parsed usage snapshot fields required for pacing math. */
export type UsageSnapshot = {
  billingCycleStart: string;
  billingCycleEnd: string;
  totalPercentUsed: number;
  /** Cursor Models pool (Grok, Composer) — display only, not used for pacing. */
  autoPercentUsed: number;
  onDemand: OnDemand;
  breakdown: Breakdown;
  /** Other Models pool (third-party / API usage). */
  apiPercentUsed: number;
  membershipType: string;
  fetchedAt: number;
};

export type BadgeMode = "remaining" | "delta" | "used";

/** Background poll. Popup open and Refresh still sync in every mode. */
export type RefreshInterval = "5min" | "15min" | "manual";

export const DEFAULT_REFRESH_INTERVAL: RefreshInterval = "15min";

const REFRESH_INTERVALS: RefreshInterval[] = ["5min", "15min", "manual"];

export function isRefreshInterval(value: unknown): value is RefreshInterval {
  return (
    typeof value === "string" &&
    REFRESH_INTERVALS.includes(value as RefreshInterval)
  );
}

export type PaceColor = "green" | "yellow" | "red";

export type DepletionForecast =
  | { status: "unknown" }
  | { status: "empties_early"; daysEarly: number }
  | { status: "lasts_through_reset" };

/** View-model produced from a snapshot at a given instant. */
export type PacingViewModel = {
  totalDays: number;
  elapsedDays: number;
  averagePct: number;
  actualUsedPct: number;
  remainingPct: number;
  deltaPct: number;
  daysLeft: number;
  elapsedPillDisplay: string;
  usedPillDisplay: string;
  badgeRemaining: number;
  badgeDelta: number;
  badgeUsed: number;
  forecast: DepletionForecast;
  basePaceColor: PaceColor;
  paceColor: PaceColor;
  resetDateLocal: string;
};
