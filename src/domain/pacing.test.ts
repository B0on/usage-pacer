import { describe, expect, it } from "vitest";
import {
  computePacing,
  formatBadgeText,
  formatResetDateLocal,
  getBasePaceColor,
  getPaceColorWithEscalation,
} from "./pacing";
import { MS_PER_DAY, type UsageSnapshot } from "./types";

const CYCLE_START = "2026-07-18T10:36:57.000Z";
const CYCLE_END = "2026-08-18T10:36:57.000Z";

function makeSnapshot(overrides: Partial<UsageSnapshot> = {}): UsageSnapshot {
  return {
    billingCycleStart: CYCLE_START,
    billingCycleEnd: CYCLE_END,
    totalPercentUsed: 0,
    onDemand: { enabled: false, used: 0 },
    breakdown: { included: 2000, bonus: 20807, total: 22807 },
    apiPercentUsed: 0,
    membershipType: "pro",
    fetchedAt: Date.parse(CYCLE_START),
    ...overrides,
  };
}

function cycleStartMs(): number {
  return Date.parse(CYCLE_START);
}

function cycleEndMs(): number {
  return Date.parse(CYCLE_END);
}

function nowAtElapsedFraction(fraction: number): number {
  const start = cycleStartMs();
  const end = cycleEndMs();
  const totalDays = (end - start) / MS_PER_DAY;
  return start + totalDays * fraction * MS_PER_DAY;
}

describe("computePacing", () => {
  it("start of cycle", () => {
    const vm = computePacing(makeSnapshot(), cycleStartMs());

    expect(vm.elapsedDays).toBe(0);
    expect(vm.averagePct).toBe(0);
    expect(vm.deltaPct).toBe(0);
    expect(vm.forecast.status).toBe("unknown");
    expect(vm.elapsedPillDisplay).toBe("0.0");
  });

  it("end of cycle", () => {
    const vm = computePacing(makeSnapshot({ totalPercentUsed: 50 }), cycleEndMs());

    expect(vm.elapsedDays).toBeCloseTo(31, 5);
    expect(vm.averagePct).toBeCloseTo(100, 5);
    expect(vm.daysLeft).toBeCloseTo(0, 5);
  });

  it("mid cycle", () => {
    const vm = computePacing(
      makeSnapshot({ totalPercentUsed: 40 }),
      nowAtElapsedFraction(0.5),
    );

    expect(vm.elapsedDays).toBeCloseTo(15.5, 1);
    expect(vm.averagePct).toBeCloseTo(50, 1);
    expect(vm.actualUsedPct).toBe(40);
    expect(vm.deltaPct).toBeCloseTo(-10, 1);
  });

  it("screenshot case: 66.107 used at 92.4% elapsed", () => {
    const vm = computePacing(
      makeSnapshot({ totalPercentUsed: 66.107 }),
      nowAtElapsedFraction(0.924),
    );

    expect(vm.averagePct).toBeCloseTo(92.4, 1);
    expect(vm.badgeRemaining).toBe(34);
    expect(vm.badgeDelta).toBe(-26);
    expect(vm.badgeUsed).toBe(66);
    expect(vm.deltaPct).toBeLessThan(0);
    expect(vm.basePaceColor).toBe("green");
    expect(vm.paceColor).toBe("green");
    expect(vm.forecast.status).toBe("lasts_through_reset");
    expect(vm.elapsedPillDisplay).toBe("92.4");
    expect(vm.usedPillDisplay).toBe("66%");
  });

  it("100% used with days left empties early", () => {
    const vm = computePacing(
      makeSnapshot({ totalPercentUsed: 100 }),
      nowAtElapsedFraction(0.924),
    );

    expect(vm.remainingPct).toBe(0);
    expect(vm.badgeRemaining).toBe(0);
    expect(vm.forecast.status).toBe("empties_early");
    if (vm.forecast.status === "empties_early") {
      expect(vm.forecast.daysEarly).toBeGreaterThan(0);
    }
  });

  it("zero elapsed yields unknown forecast", () => {
    const vm = computePacing(
      makeSnapshot({ totalPercentUsed: 50 }),
      cycleStartMs(),
    );

    expect(vm.elapsedDays).toBe(0);
    expect(vm.forecast.status).toBe("unknown");
  });

  it("forecast empties before reset when usage pace is high", () => {
    const vm = computePacing(
      makeSnapshot({ totalPercentUsed: 50 }),
      nowAtElapsedFraction(0.1),
    );

    expect(vm.forecast.status).toBe("empties_early");
  });

  it("forecast lasts through reset when usage pace is low", () => {
    const vm = computePacing(
      makeSnapshot({ totalPercentUsed: 66.107 }),
      nowAtElapsedFraction(0.924),
    );

    expect(vm.forecast.status).toBe("lasts_through_reset");
  });

  it.each([
    { delta: -5, expected: "green" as const },
    { delta: 0, expected: "green" as const },
    { delta: 5, expected: "yellow" as const },
    { delta: 10, expected: "yellow" as const },
    { delta: 10.1, expected: "red" as const },
    { delta: 25, expected: "red" as const },
  ])("base pace color for delta $delta is $expected", ({ delta, expected }) => {
    expect(getBasePaceColor(delta)).toBe(expected);
  });

  it("escalates yellow to red when forecast empties early", () => {
    const vm = computePacing(
      makeSnapshot({ totalPercentUsed: 55 }),
      nowAtElapsedFraction(0.5),
    );

    expect(vm.basePaceColor).toBe("yellow");
    expect(vm.forecast.status).toBe("empties_early");
    expect(vm.paceColor).toBe("red");
  });

  it("remainingPct never goes negative when used exceeds 100", () => {
    const vm = computePacing(
      makeSnapshot({ totalPercentUsed: 110 }),
      nowAtElapsedFraction(0.5),
    );

    expect(vm.remainingPct).toBe(0);
    expect(vm.badgeRemaining).toBe(0);
  });

  it("pace color ignores remaining% when delta is healthy", () => {
    const vm = computePacing(
      makeSnapshot({ totalPercentUsed: 99 }),
      nowAtElapsedFraction(0.995),
    );

    expect(vm.remainingPct).toBeCloseTo(1, 5);
    expect(vm.badgeRemaining).toBe(1);
    expect(vm.deltaPct).toBeLessThanOrEqual(0);
    expect(vm.basePaceColor).toBe("green");
    expect(vm.paceColor).toBe("green");
    expect(vm.forecast.status).toBe("lasts_through_reset");
  });
});

describe("formatBadgeText", () => {
  it("formats remaining, delta, and used modes", () => {
    const vm = computePacing(
      makeSnapshot({ totalPercentUsed: 66.107 }),
      nowAtElapsedFraction(0.924),
    );

    expect(formatBadgeText(vm, "remaining")).toBe("34");
    expect(formatBadgeText(vm, "delta")).toBe("-26");
    expect(formatBadgeText(vm, "used")).toBe("66");
  });

  it("formats positive delta with a plus sign", () => {
    const vm = computePacing(
      makeSnapshot({ totalPercentUsed: 80 }),
      nowAtElapsedFraction(0.5),
    );

    expect(vm.badgeDelta).toBeGreaterThan(0);
    expect(formatBadgeText(vm, "delta")).toMatch(/^\+/);
  });
});

describe("formatResetDateLocal", () => {
  it("formats cycle end as a local calendar date", () => {
    expect(formatResetDateLocal(CYCLE_END, "UTC")).toBe("Aug 18");
  });
});

describe("getPaceColorWithEscalation", () => {
  it("escalates green to yellow when forecast empties early", () => {
    expect(
      getPaceColorWithEscalation("green", {
        status: "empties_early",
        daysEarly: 3,
      }),
    ).toBe("yellow");
  });

  it("escalates yellow to red when forecast empties early", () => {
    expect(
      getPaceColorWithEscalation("yellow", {
        status: "empties_early",
        daysEarly: 3,
      }),
    ).toBe("red");
  });

  it("keeps red when already red", () => {
    expect(
      getPaceColorWithEscalation("red", { status: "empties_early", daysEarly: 3 }),
    ).toBe("red");
  });

  it("does not escalate when forecast lasts through reset", () => {
    expect(
      getPaceColorWithEscalation("green", { status: "lasts_through_reset" }),
    ).toBe("green");
  });
});
