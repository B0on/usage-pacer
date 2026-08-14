import { formatResetDateLocal } from "../domain/pacing";
import { MS_PER_DAY, type DepletionForecast, type PacingViewModel } from "../domain/types";

export function capitalizeMembershipType(membershipType: string): string {
  if (membershipType.length === 0) {
    return membershipType;
  }
  return membershipType.charAt(0).toUpperCase() + membershipType.slice(1);
}

export function formatPaceLabel(badgeDelta: number): string {
  if (badgeDelta < 0) {
    return `Behind −${Math.abs(badgeDelta)}pt`;
  }
  if (badgeDelta > 0) {
    return `Ahead +${badgeDelta}pt`;
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
