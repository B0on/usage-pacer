import { formatResetDateLocal, roundToOneDecimal } from "../domain/pacing";
import { MS_PER_DAY, type DepletionForecast, type PacingViewModel } from "../domain/types";

/** One decimal, including `.0`. Detail over dashboard-matching integers. */
export function formatModelPoolPercent(percentUsed: number): string {
  if (!Number.isFinite(percentUsed)) {
    return "0.0%";
  }
  return `${roundToOneDecimal(percentUsed).toFixed(1)}%`;
}

function normalizeMembershipKey(membershipType: string): string {
  return membershipType.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/** User-facing plan name (Pro, Pro+, Ultra). */
export function formatPlanLabel(membershipType: string): string {
  switch (normalizeMembershipKey(membershipType)) {
    case "pro_plus":
    case "proplus":
    case "plus":
      return "Pro+";
    case "ultra":
      return "Ultra";
    case "hobby":
    case "free":
      return "Hobby";
    case "pro":
      return "Pro";
    default:
      return capitalizeMembershipType(membershipType);
  }
}

export function formatIncludedHeading(membershipType: string): string {
  return `Included in ${formatPlanLabel(membershipType)}`;
}

/**
 * Minimum included Other Models API usage, from Cursor pricing.
 * Unknown plans get a generic hint without a dollar figure.
 */
export function formatOtherModelsHint(membershipType: string): string {
  switch (normalizeMembershipKey(membershipType)) {
    case "pro":
      return "Your plan includes at least $20 of API usage";
    case "pro_plus":
    case "proplus":
    case "plus":
      return "Your plan includes at least $70 of API usage";
    case "ultra":
      return "Your plan includes at least $400 of API usage";
    default:
      return "Additional usage beyond limits consumes on-demand spend";
  }
}

export function capitalizeMembershipType(membershipType: string): string {
  if (membershipType.length === 0) {
    return membershipType;
  }
  return membershipType.charAt(0).toUpperCase() + membershipType.slice(1);
}

export function formatPaceLabel(deltaPct: number): string {
  const delta = roundToOneDecimal(deltaPct);
  if (delta < 0) {
    return `Behind −${Math.abs(delta).toFixed(1)}pt`;
  }
  if (delta > 0) {
    return `Ahead +${delta.toFixed(1)}pt`;
  }
  return "On pace";
}

export function formatDaysLeft(daysLeft: number): number {
  return Math.max(0, Math.ceil(daysLeft));
}

export function formatForecastCopy(
  forecast: DepletionForecast,
  cycleEndIso: string,
): string {
  if (forecast.status === "lasts_through_reset") {
    return "At this pace, lasts through reset";
  }

  if (forecast.status === "empties_early") {
    const cycleEndMs = Date.parse(cycleEndIso);
    const emptyMs = cycleEndMs - forecast.daysEarly * MS_PER_DAY;
    const emptyDate = formatResetDateLocal(new Date(emptyMs).toISOString());
    const daysBeforeReset = Math.max(1, Math.ceil(forecast.daysEarly));
    return `At this pace, empty on ${emptyDate} (${daysBeforeReset} days before reset)`;
  }

  return "";
}

export function formatRelativeSync(fetchedAtMs: number, nowMs: number): string {
  const elapsedMs = Math.max(0, nowMs - fetchedAtMs);
  const seconds = Math.floor(elapsedMs / 1000);

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function paceColorClass(paceColor: PacingViewModel["paceColor"]): string {
  switch (paceColor) {
    case "green":
      return "pacer-pace--green";
    case "yellow":
      return "pacer-pace--yellow";
    case "red":
      return "pacer-pace--red";
  }
}
