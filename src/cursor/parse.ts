import type { UsageSnapshot } from "../domain/types";

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ParseError(`Missing or invalid string field: ${key}`);
  }
  return value;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ParseError(`Missing or invalid number field: ${key}`);
  }
  return value;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new ParseError(`Missing or invalid boolean field: ${key}`);
  }
  return value;
}

function parseIsoDate(value: string, field: string): string {
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    throw new ParseError(`Invalid ISO date for ${field}`);
  }
  return value;
}

/** Parse a usage-summary JSON payload into a UsageSnapshot. */
export function parseUsageSummary(payload: unknown, nowMs: number): UsageSnapshot {
  if (!isRecord(payload)) {
    throw new ParseError("Expected a JSON object");
  }

  const billingCycleStart = parseIsoDate(
    readString(payload, "billingCycleStart"),
    "billingCycleStart",
  );
  const billingCycleEnd = parseIsoDate(
    readString(payload, "billingCycleEnd"),
    "billingCycleEnd",
  );
  const membershipType = readString(payload, "membershipType");

  const individualUsage = payload.individualUsage;
  if (!isRecord(individualUsage)) {
    throw new ParseError("Missing individualUsage");
  }

  const plan = individualUsage.plan;
  if (!isRecord(plan)) {
    throw new ParseError("Missing individualUsage.plan");
  }

  const totalPercentUsed = readNumber(plan, "totalPercentUsed");
  const autoPercentUsed = readNumber(plan, "autoPercentUsed");
  const apiPercentUsed = readNumber(plan, "apiPercentUsed");

  const breakdownRecord = plan.breakdown;
  if (!isRecord(breakdownRecord)) {
    throw new ParseError("Missing individualUsage.plan.breakdown");
  }

  const onDemandRecord = individualUsage.onDemand;
  if (!isRecord(onDemandRecord)) {
    throw new ParseError("Missing individualUsage.onDemand");
  }

  return {
    billingCycleStart,
    billingCycleEnd,
    totalPercentUsed,
    onDemand: {
      enabled: readBoolean(onDemandRecord, "enabled"),
      used: readNumber(onDemandRecord, "used"),
    },
    breakdown: {
      included: readNumber(breakdownRecord, "included"),
      bonus: readNumber(breakdownRecord, "bonus"),
      total: readNumber(breakdownRecord, "total"),
    },
    autoPercentUsed,
    apiPercentUsed,
    membershipType,
    fetchedAt: nowMs,
  };
}
