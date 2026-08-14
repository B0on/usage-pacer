import {
  MS_PER_DAY,
  type BadgeMode,
  type DepletionForecast,
  type PaceColor,
  type PacingViewModel,
  type UsageSnapshot,
} from "./types";

function parseInstant(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid ISO instant: ${iso}`);
  }
  return ms;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToInteger(value: number): number {
  return Math.round(value);
}

export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function getBasePaceColor(deltaPct: number): PaceColor {
  if (deltaPct <= 0) {
    return "green";
  }
  if (deltaPct <= 10) {
    return "yellow";
  }
  return "red";
}

export function getPaceColorWithEscalation(
  baseColor: PaceColor,
  forecast: DepletionForecast,
): PaceColor {
  if (forecast.status !== "empties_early") {
    return baseColor;
  }

  if (baseColor === "green") {
    return "yellow";
  }
  if (baseColor === "yellow") {
    return "red";
  }
  return "red";
}

export function computeForecast(
  cycleStartMs: number,
  cycleEndMs: number,
  actualUsedPct: number,
  elapsedDays: number,
  daysLeft: number,
): DepletionForecast {
  if (actualUsedPct <= 0 || elapsedDays <= 0) {
    return { status: "unknown" };
  }

  if (actualUsedPct >= 100 && daysLeft > 0) {
    return { status: "empties_early", daysEarly: daysLeft };
  }

  const projectedEmptyAt =
    cycleStartMs + elapsedDays * (100 / actualUsedPct) * MS_PER_DAY;

  if (projectedEmptyAt < cycleEndMs) {
    const daysEarly = (cycleEndMs - projectedEmptyAt) / MS_PER_DAY;
    return { status: "empties_early", daysEarly };
  }

  return { status: "lasts_through_reset" };
}

export function formatResetDateLocal(
  cycleEndIso: string,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone,
  }).format(new Date(cycleEndIso));
}

/** Chrome toolbar badges stay readable at 4 characters; 5+ may truncate. */
export const MAX_BADGE_TEXT_LENGTH = 4;

function withLeadingPlus(text: string, signed: boolean, value: number): string {
  return signed && value > 0 ? `+${text}` : text;
}

/** One decimal when the string fits in 4 characters, including `.0`. */
export function formatBadgeNumber(
  value: number,
  options: { signed?: boolean } = {},
): string {
  const signed = options.signed === true;
  const rounded = roundToOneDecimal(value);
  const withDecimal = withLeadingPlus(rounded.toFixed(1), signed, rounded);
  if (withDecimal.length <= MAX_BADGE_TEXT_LENGTH) {
    return withDecimal;
  }

  const asInteger = roundToInteger(value);
  return withLeadingPlus(String(asInteger), signed, asInteger);
}

/** Toolbar overlay only. Uses raw percents, not integer `badgeRemaining` / `badgeUsed`. */
export function formatBadgeText(
  viewModel: PacingViewModel,
  mode: BadgeMode,
): string {
  switch (mode) {
    case "remaining":
      return formatBadgeNumber(viewModel.remainingPct);
    case "delta":
      return formatBadgeNumber(viewModel.deltaPct, { signed: true });
    case "used":
      return formatBadgeNumber(viewModel.actualUsedPct);
  }
}

export function computePacing(
  snapshot: UsageSnapshot,
  nowMs: number,
): PacingViewModel {
  const cycleStartMs = parseInstant(snapshot.billingCycleStart);
  const cycleEndMs = parseInstant(snapshot.billingCycleEnd);

  const totalDays = (cycleEndMs - cycleStartMs) / MS_PER_DAY;
  const elapsedDays = clamp((nowMs - cycleStartMs) / MS_PER_DAY, 0, totalDays);
  const averagePct =
    totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
  const actualUsedPct = snapshot.totalPercentUsed;
  const remainingPct = Math.max(0, 100 - actualUsedPct);
  const deltaPct = actualUsedPct - averagePct;
  const daysLeft = (cycleEndMs - nowMs) / MS_PER_DAY;

  const forecast = computeForecast(
    cycleStartMs,
    cycleEndMs,
    actualUsedPct,
    elapsedDays,
    daysLeft,
  );

  const basePaceColor = getBasePaceColor(deltaPct);
  const paceColor = getPaceColorWithEscalation(basePaceColor, forecast);

  const elapsedRounded = roundToOneDecimal(averagePct);
  const badgeRemaining = roundToInteger(remainingPct);
  const badgeDelta = roundToInteger(deltaPct);
  const badgeUsed = roundToInteger(actualUsedPct);

  return {
    totalDays,
    elapsedDays,
    averagePct,
    actualUsedPct,
    remainingPct,
    deltaPct,
    daysLeft,
    elapsedPillDisplay: elapsedRounded.toFixed(1),
    usedPillDisplay: `${roundToOneDecimal(actualUsedPct).toFixed(1)}%`,
    badgeRemaining,
    badgeDelta,
    badgeUsed,
    forecast,
    basePaceColor,
    paceColor,
    resetDateLocal: formatResetDateLocal(snapshot.billingCycleEnd),
  };
}
