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
  onDemand: OnDemand;
  breakdown: Breakdown;
  apiPercentUsed: number;
  membershipType: string;
  fetchedAt: number;
};

export type BadgeMode = "remaining" | "delta" | "used";

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
